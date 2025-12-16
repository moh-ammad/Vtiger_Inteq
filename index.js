import axios from "axios";
import fs from "fs/promises";

const BASE_URL = "https://intakeq.com/api/v1/appointments";
const API_KEY = "9535643d05502224ba0d5499329ebe31e1a58c19";

const HEADERS = {
  "X-Auth-Key": API_KEY,
  "Content-Type": "application/json"
};

const SAFE_DELAY_MS = 7000;           // base delay between requests
const MAX_DAILY_SHOTS = 500;          // max API calls per day
const OUTPUT_FILE = "appointments.json";
const TEMP_FILE = OUTPUT_FILE + ".tmp";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAndSaveAppointments() {
  let page = 1;
  let requestsMade = 0;
  let allAppointments = [];

  // 🔄 Resume from last state if exists
  try {
    const existing = await fs.readFile(OUTPUT_FILE, "utf8");
    const state = JSON.parse(existing);
    allAppointments = state.appointments || [];
    page = (state.lastPageFetched || 0) + 1;

    if (page > 1) {
      console.log(`🔄 Resuming from page ${page} (last fetched page: ${page - 1})`);
    }
  } catch (_) {
    console.log("🚀 Starting fresh fetch...");
  }

  while (true) {
    if (requestsMade >= MAX_DAILY_SHOTS) {
      console.log("🛑 Daily request limit reached.");
      break;
    }

    try {
      const { data } = await axios.get(`${BASE_URL}?page=${page}`, { headers: HEADERS });
      requestsMade++;

      if (!Array.isArray(data) || data.length === 0) {
        console.log("✅ No more appointments to fetch.");
        break;
      }

      allAppointments.push(...data);

      // 💾 Save current state safely using a temp file
      const saveState = {
        lastPageFetched: page,
        appointments: allAppointments
      };
      await fs.writeFile(TEMP_FILE, JSON.stringify(saveState, null, 2));
      await fs.rename(TEMP_FILE, OUTPUT_FILE);

      console.log(`✔ Page ${page}: ${data.length} records | Shots left: ${MAX_DAILY_SHOTS - requestsMade}`);

      page++;
      // Slightly randomized delay to avoid triggering stricter rate limits
      await sleep(SAFE_DELAY_MS + Math.random() * 2000);

    } catch (err) {
      // Handle rate limit
      if (err.response?.status === 429) {
        const retryAfter = Number(err.response.headers["retry-after"]) * 1000 || 60000;
        console.warn(`⏳ Rate limit hit. Waiting ${retryAfter / 1000}s...`);
        await sleep(retryAfter);
        continue;
      }

      // Handle unauthorized
      if (err.response?.status === 401) {
        console.error("❌ Unauthorized. Check your API key.");
        process.exit(1);
      }

      console.error("❌ Fatal error:", err.message);
      break;
    }
  }

  console.log(`🎉 Finished. Saved ${allAppointments.length} appointments using ${requestsMade} shots.`);
}

fetchAndSaveAppointments();
