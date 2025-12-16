import axios from "axios";
import fs from "fs/promises";
import crypto from "crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = "https://dev.hcdcrm.com/webservice.php";
const USERNAME = "sohail";
const ACCESS_KEY = "FT2n5e9rQxO9rDy";

const LEADS_FILE = "leads.json";
const APPOINTMENTS_FILE = "appointments.json";
const SESSION_FILE = "vtiger_session.json";

const SAFE_DELAY_MS = 2000; // delay between update requests
const MAX_DAILY_UPDATES = 500;
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// -----------------------------
// Helper functions
// -----------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

function md5(input) {
  return crypto.createHash("md5").update(input).digest("hex");
}

// Normalize email/phone for comparison
function normalize(str) {
  if (!str) return "";
  return str.toString().trim().toLowerCase().replace(/[\s\-()]/g, "");
}

// -----------------------------
// STEP 1: Get Challenge Token
// -----------------------------
async function getChallenge() {
  console.log("🔑 Getting challenge token...");
  const url = `${BASE_URL}?operation=getchallenge&username=${USERNAME}`;
  const { data } = await axios.get(url);
  if (!data.success) throw new Error(data.error?.message || "Challenge failed");
  return data.result.token;
}

// -----------------------------
// STEP 2: Login
// -----------------------------
async function login(token) {
  console.log("🔐 Logging in...");
  const accessKeyHash = md5(token + ACCESS_KEY);

  const body = new URLSearchParams({
    operation: "login",
    username: USERNAME,
    accessKey: accessKeyHash
  }).toString();

  const { data } = await axios.post(BASE_URL, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (!data.success) throw new Error(data.error?.message || "Login failed");
  console.log(`✅ Logged in. Session: ${data.result.sessionName}`);
  
  // Save session with timestamp
  await fs.writeFile(SESSION_FILE, JSON.stringify({
    sessionName: data.result.sessionName,
    timestamp: Date.now()
  }, null, 2));
  
  return data.result.sessionName;
}

// -----------------------------
// Get Cached Session or Login
// -----------------------------
async function getSession() {
  try {
    const sessionData = JSON.parse(await fs.readFile(SESSION_FILE, "utf8"));
    const age = Date.now() - sessionData.timestamp;
    
    if (age < SESSION_EXPIRY_MS) {
      console.log(`♻️  Reusing cached session (${Math.floor(age / 1000 / 60)} min old)`);
      return sessionData.sessionName;
    }
    console.log("⏰ Cached session expired, logging in...");
  } catch {
    console.log("🔑 No cached session found...");
  }
  
  const token = await getChallenge();
  return await login(token);
}

// -----------------------------
// STEP 3: Retrieve Lead
// -----------------------------
async function retrieveLead(sessionName, leadId) {
  const url = `${BASE_URL}?operation=retrieve&sessionName=${sessionName}&id=${leadId}`;
  const { data } = await axios.get(url);

  if (!data.success) {
    throw new Error(data.error?.message || "Retrieve failed");
  }

  return data.result;
}

// -----------------------------
// STEP 4: Update Lead
// -----------------------------
async function updateLead(sessionName, leadRecord, updateData) {
  // Merge the full lead record with the update data
  const element = JSON.stringify({
    ...leadRecord,
    ...updateData
  });

  const body = new URLSearchParams({
    operation: "update",
    sessionName: sessionName,
    element: element
  }).toString();

  const { data } = await axios.post(BASE_URL, body, {
    headers: { "Content-Type": "application/x-www-form-urlencoded" }
  });

  if (!data.success) {
    throw new Error(data.error?.message || "Update failed");
  }

  return data.result;
}

// -----------------------------
// STEP 5: Load Data Files
// -----------------------------
async function loadDataFiles() {
  console.log("📂 Loading data files...");

  try {
    const leadsData = JSON.parse(await fs.readFile(LEADS_FILE, "utf8"));
    const appointmentsData = JSON.parse(await fs.readFile(APPOINTMENTS_FILE, "utf8"));

    const leads = leadsData.leads || [];
    const appointments = appointmentsData.appointments || [];

    console.log(`✅ Loaded ${leads.length} leads and ${appointments.length} appointments`);
    return { leads, appointments };
  } catch (err) {
    throw new Error(`Failed to load data files: ${err.message}`);
  }
}

// -----------------------------
// STEP 6: Build Appointment Lookup
// -----------------------------
function buildAppointmentLookup(appointments) {
  console.log("🔍 Building appointment lookup index...");

  const emailMap = new Map();
  const phoneMap = new Map();

  for (const appt of appointments) {
    // Index by email
    if (appt.ClientEmail) {
      const normEmail = normalize(appt.ClientEmail);
      if (normEmail) {
        if (!emailMap.has(normEmail)) {
          emailMap.set(normEmail, []);
        }
        emailMap.get(normEmail).push(appt);
      }
    }

    // Index by phone
    if (appt.ClientPhone) {
      const normPhone = normalize(appt.ClientPhone);
      if (normPhone) {
        if (!phoneMap.has(normPhone)) {
          phoneMap.set(normPhone, []);
        }
        phoneMap.get(normPhone).push(appt);
      }
    }
  }

  console.log(`✅ Indexed ${emailMap.size} unique emails and ${phoneMap.size} unique phones`);
  return { emailMap, phoneMap };
}

// -----------------------------
// STEP 7: Find Matching Leads
// -----------------------------
function findMatchingLeads(leads, { emailMap, phoneMap }) {
  console.log("🔎 Finding leads with appointments...");

  const matchingLeads = [];

  for (const lead of leads) {
    // Skip if already marked as success
    if (lead.cf_941 === "success") {
      continue;
    }

    let hasMatch = false;

    // Check email match
    if (lead.email) {
      const normEmail = normalize(lead.email);
      if (normEmail && emailMap.has(normEmail)) {
        hasMatch = true;
      }
    }

    // Check phone match (check both phone and mobile fields)
    if (!hasMatch && lead.phone) {
      const normPhone = normalize(lead.phone);
      if (normPhone && phoneMap.has(normPhone)) {
        hasMatch = true;
      }
    }

    if (!hasMatch && lead.mobile) {
      const normMobile = normalize(lead.mobile);
      if (normMobile && phoneMap.has(normMobile)) {
        hasMatch = true;
      }
    }

    if (hasMatch) {
      matchingLeads.push(lead);
    }
  }

  console.log(`✅ Found ${matchingLeads.length} leads with appointments that need updating`);
  return matchingLeads;
}

// -----------------------------
// STEP 8: Update Matching Leads
// -----------------------------
async function updateMatchingLeads(sessionName, matchingLeads) {
  console.log(`📝 Updating ${matchingLeads.length} leads...`);

  let updated = 0;
  let failed = 0;
  const failedLeads = [];

  for (let i = 0; i < matchingLeads.length && i < MAX_DAILY_UPDATES; i++) {
    const lead = matchingLeads[i];

    try {
      // First retrieve the full lead record
      const fullLead = await retrieveLead(sessionName, lead.id);
      
      // Then update with the full record
      await updateLead(sessionName, fullLead, { cf_941: "success" });
      updated++;
      console.log(
        `✔ [${updated}/${matchingLeads.length}] Updated ${lead.firstname} ${lead.lastname} (${lead.email || lead.phone || lead.mobile})`
      );

      await sleep(SAFE_DELAY_MS + Math.random() * 1000);
    } catch (err) {
      failed++;
      failedLeads.push({ lead, error: err.message });
      console.error(
        `❌ Failed to update ${lead.firstname} ${lead.lastname}: ${err.message}`
      );
    }
  }

  console.log(`\n🎉 DONE: Updated ${updated} leads successfully`);
  if (failed > 0) {
    console.log(`⚠️ Failed to update ${failed} leads`);
    console.log("\nFailed leads:");
    failedLeads.forEach(({ lead, error }) => {
      console.log(`  - ${lead.lead_no}: ${lead.email} - ${error}`);
    });
  }

  return { updated, failed };
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  try {
    // Step 1: Load data
    const { leads, appointments } = await loadDataFiles();

    // Step 2: Build lookup maps
    const lookup = buildAppointmentLookup(appointments);

    // Step 3: Find matching leads
    const matchingLeads = findMatchingLeads(leads, lookup);

    if (matchingLeads.length === 0) {
      console.log("✅ No leads need updating. All done!");
      return;
    }

    // Step 4: Get vtiger session (cached or new login)
    const sessionName = await getSession();

    // Step 5: Update leads
    await updateMatchingLeads(sessionName, matchingLeads);

  } catch (err) {
    console.error("❌ Fatal error:", err.message);
    process.exit(1);
  }
}

main();
