import axios from "axios";
import fs from "fs/promises";
import crypto from "crypto";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL   = "https://dev.hcdcrm.com/webservice.php";
const USERNAME   = "sohail";
const ACCESS_KEY = "FT2n5e9rQxO9rDy";

const MODULE_NAME = "Leads";
const OUTPUT_FILE = "leads.json";
const TEMP_FILE   = OUTPUT_FILE + ".tmp";
const SESSION_FILE = "vtiger_session.json";

const BATCH_SIZE    = 50;    // number of records per request
const SAFE_DELAY_MS = 7000;  // 7–9 requests per minute (~8–9 requests/min)
const MAX_DAILY_SHOTS = 500; // max API calls per day
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// -----------------------------
// Helper functions
// -----------------------------
const sleep = ms => new Promise(r => setTimeout(r, ms));

function md5(input) {
  return crypto.createHash("md5").update(input).digest("hex");
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
// STEP 3: Fetch Leads in batches
// -----------------------------
async function fetchLeads(sessionName) {
  console.log(`📥 Fetching all ${MODULE_NAME} records...`);

  let start = 0;
  let requestsMade = 0;
  let allLeads = [];

  // Resume support
  try {
    const existing = await fs.readFile(OUTPUT_FILE, "utf8");
    const state = JSON.parse(existing);
    allLeads = state.leads || [];
    start = allLeads.length;
    if (start > 0) console.log(`🔄 Resuming from record ${start}`);
  } catch {
    console.log("🚀 Starting fresh fetch...");
  }

  while (true) {
    if (requestsMade >= MAX_DAILY_SHOTS) {
      console.log("🛑 Daily request limit reached.");
      break;
    }

    // Construct query (terminate with semicolon for parser)
    const query = `SELECT * FROM ${MODULE_NAME} LIMIT ${start},${BATCH_SIZE};`;
    const url = `${BASE_URL}?operation=query&sessionName=${sessionName}&query=${encodeURIComponent(query)}`;

    try {
      const { data } = await axios.get(url);
      requestsMade++;

      if (!data.success) {
        console.warn(`⚠️ API returned an error: ${data.error?.message}`);
        break;
      }

      const leads = data.result;
      if (!Array.isArray(leads) || leads.length === 0) {
        console.log("✅ No more Leads to fetch.");
        break;
      }

      allLeads.push(...leads);

      // Atomic save
      const saveState = { leads: allLeads };
      await fs.writeFile(TEMP_FILE, JSON.stringify(saveState, null, 2));
      await fs.rename(TEMP_FILE, OUTPUT_FILE);

      console.log(`✔ Fetched ${leads.length} leads | Total so far: ${allLeads.length}`);

      start += BATCH_SIZE;
      await sleep(SAFE_DELAY_MS + Math.random() * 2000);

    } catch (err) {
      console.error("❌ Fetch error:", err.message);
      break;
    }
  }

  console.log(`🎉 DONE: Fetched ${allLeads.length} leads in ${requestsMade} requests.`);
}

// -----------------------------
// MAIN
// -----------------------------
async function main() {
  try {
    const sessionName = await getSession();
    await fetchLeads(sessionName);
  } catch (err) {
    console.error("❌ Fatal error:", err.message);
  }
}

main();
