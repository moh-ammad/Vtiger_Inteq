import express from 'express';
import cors from 'cors';
import axios from 'axios';
import crypto from 'crypto';
import fs from 'fs/promises';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Rate limiting storage
const rateLimits = new Map();

// Helper function for MD5
function md5(input) {
  return crypto.createHash('md5').update(input).digest('hex');
}

// Rate limiting middleware
function checkRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    rateLimits.set(ip, { requests: [], dailyCount: 0, dailyReset: now + 86400000 });
  }
  
  const limit = rateLimits.get(ip);
  
  // Reset daily count if 24 hours passed
  if (now > limit.dailyReset) {
    limit.dailyCount = 0;
    limit.dailyReset = now + 86400000;
    limit.requests = [];
  }
  
  // Remove requests older than 1 minute
  limit.requests = limit.requests.filter(time => now - time < 60000);
  
  // Check limits
  if (limit.requests.length >= 3) {
    return res.status(429).json({ 
      error: 'Rate limit exceeded', 
      message: 'Maximum 3 requests per minute allowed' 
    });
  }
  
  if (limit.dailyCount >= 30) {
    return res.status(429).json({ 
      error: 'Daily limit exceeded', 
      message: 'Maximum 30 requests per day allowed' 
    });
  }
  
  // Add current request
  limit.requests.push(now);
  limit.dailyCount++;
  
  next();
}

// Vtiger API endpoints
async function getVtigerChallenge(baseUrl, username) {
  const url = `${baseUrl}?operation=getchallenge&username=${username}`;
  const { data } = await axios.get(url);
  if (!data.success) throw new Error('Failed to get challenge token');
  return data.result.token;
}

async function loginVtiger(baseUrl, username, accessKey, token) {
  const accessKeyHash = md5(token + accessKey);
  const body = new URLSearchParams({
    operation: 'login',
    username: username,
    accessKey: accessKeyHash
  }).toString();

  const { data } = await axios.post(baseUrl, body, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  if (!data.success) throw new Error('Login failed');
  return data.result.sessionName;
}

async function fetchVtigerLeads(baseUrl, sessionName) {
  const query = `SELECT * FROM Leads LIMIT 100;`;
  const url = `${baseUrl}?operation=query&sessionName=${sessionName}&query=${encodeURIComponent(query)}`;
  
  const { data } = await axios.get(url);
  if (!data.success) throw new Error('Failed to fetch leads');
  
  return data.result || [];
}

// Load leads from local file
async function fetchVtigerLeadsFromFile() {
  try {
    const data = await fs.readFile('leads.json', 'utf8');
    const parsed = JSON.parse(data);
    if (parsed.leads && Array.isArray(parsed.leads)) {
      console.log(`Loaded ${parsed.leads.length} leads from local file`);
      return parsed.leads;
    }
  } catch (err) {
    console.log('Could not read leads.json:', err.message);
  }
  return [];
}

// IntakeQ API endpoint
async function fetchIntakeQAppointments(apiKey) {
  // Try to read from local appointments.json first
  try {
    const data = await fs.readFile('appointments.json', 'utf8');
    const parsed = JSON.parse(data);
    if (parsed.appointments && Array.isArray(parsed.appointments)) {
      console.log(`Loaded ${parsed.appointments.length} appointments from local file`);
      return parsed.appointments;
    }
  } catch (err) {
    console.log('Could not read appointments.json, falling back to API', err.message);
  }

  if (!apiKey) {
    throw new Error('API Key is required when local data is not available');
  }

  const url = 'https://intakeq.com/api/v1/appointments?page=1';
  const { data } = await axios.get(url, {
    headers: {
      'X-Auth-Key': apiKey,
      'Content-Type': 'application/json'
    }
  });
  
  return Array.isArray(data) ? data.slice(0, 100) : [];
}

// Matching logic
function normEmail(e) {
  return (e || '').toString().trim().toLowerCase();
}

function normPhone(p) {
  if (!p) return '';
  return p.toString().replace(/[^0-9]/g, '').replace(/^1/, '');
}

function matchLeadsWithAppointments(leads, appointments) {
  const apptsByEmail = new Map();
  const apptsByPhone = new Map();
  
  appointments.forEach(appt => {
    const email = normEmail(appt.ClientEmail);
    if (email) {
      if (!apptsByEmail.has(email)) apptsByEmail.set(email, []);
      apptsByEmail.get(email).push(appt);
    }
    
    const phone = normPhone(appt.ClientPhone);
    if (phone) {
      if (!apptsByPhone.has(phone)) apptsByPhone.set(phone, []);
      apptsByPhone.get(phone).push(appt);
    }
  });
  
  return leads.map(lead => {
    const leadEmail = normEmail(lead.email);
    const leadPhone = normPhone(lead.phone || lead.mobile);
    
    let matchedAppointments = [];
    let matchType = null;
    
    if (leadEmail && apptsByEmail.has(leadEmail)) {
      matchedAppointments = apptsByEmail.get(leadEmail);
      matchType = 'email';
    } else if (leadPhone && apptsByPhone.has(leadPhone)) {
      matchedAppointments = apptsByPhone.get(leadPhone);
      matchType = 'phone';
    }
    
    return {
      ...lead,
      matchedAppointments,
      matchType,
      hasMatch: matchedAppointments.length > 0
    };
  });
}

// API Routes
app.post('/api/fetch-crm-leads', async (req, res) => {
  try {
    // Try loading from local file first
    let leads = await fetchVtigerLeadsFromFile();
    
    // If local file has data, return it without API call
    if (leads.length > 0) {
      console.log('Returning leads from local file');
      return res.json({ success: true, leads, source: 'local' });
    }
    
    // Otherwise fetch from API
    const { baseUrl, username, accessKey } = req.body;
    
    if (!baseUrl || !username || !accessKey) {
      return res.status(400).json({ error: 'Missing required credentials' });
    }
    
    const token = await getVtigerChallenge(baseUrl, username);
    const sessionName = await loginVtiger(baseUrl, username, accessKey, token);
    leads = await fetchVtigerLeads(baseUrl, sessionName);
    
    res.json({ success: true, leads, source: 'api' });
  } catch (error) {
    console.error('CRM fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch CRM leads', 
      message: error.message 
    });
  }
});

app.post('/api/fetch-emr-appointments', async (req, res) => {
  try {
    const { apiKey } = req.body;
    const appointments = await fetchIntakeQAppointments(apiKey);
    
    res.json({ success: true, appointments, source: 'local' });
  } catch (error) {
    console.error('EMR fetch error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch EMR appointments', 
      message: error.message 
    });
  }
});

app.post('/api/match-data', async (req, res) => {
  try {
    const { leads, appointments } = req.body;
    
    if (!leads || !appointments) {
      return res.status(400).json({ error: 'Missing leads or appointments data' });
    }
    
    const matchedLeads = matchLeadsWithAppointments(leads, appointments);
    
    const stats = {
      totalLeads: matchedLeads.length,
      matchedLeads: matchedLeads.filter(l => l.hasMatch).length,
      unmatchedLeads: matchedLeads.filter(l => !l.hasMatch).length
    };
    
    res.json({ success: true, matchedLeads, stats });
  } catch (error) {
    console.error('Match error:', error);
    res.status(500).json({ 
      error: 'Failed to match data', 
      message: error.message 
    });
  }
});

app.get('/api/data-availability', async (req, res) => {
  try {
    const leads = await fetchVtigerLeadsFromFile();
    const appointmentsData = await fs.readFile('appointments.json', 'utf8').catch(() => null);
    const appointments = appointmentsData ? JSON.parse(appointmentsData).appointments || [] : [];
    
    res.json({
      hasLeads: leads.length > 0,
      hasAppointments: appointments.length > 0,
      leadsCount: leads.length,
      appointmentsCount: appointments.length
    });
  } catch (err) {
    res.json({
      hasLeads: false,
      hasAppointments: false,
      leadsCount: 0,
      appointmentsCount: 0
    });
  }
});

app.get('/api/rate-limit-status', (req, res) => {
  const ip = req.ip;
  const now = Date.now();
  
  if (!rateLimits.has(ip)) {
    return res.json({ 
      perMinute: { used: 0, limit: 3, remaining: 3 },
      perDay: { used: 0, limit: 30, remaining: 30 }
    });
  }
  
  const limit = rateLimits.get(ip);
  limit.requests = limit.requests.filter(time => now - time < 60000);
  
  res.json({
    perMinute: { 
      used: limit.requests.length, 
      limit: 3, 
      remaining: 3 - limit.requests.length 
    },
    perDay: { 
      used: limit.dailyCount, 
      limit: 30, 
      remaining: 30 - limit.dailyCount 
    }
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
