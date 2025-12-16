import axios from "axios";
import fs from "fs/promises";

// -----------------------------
// CONFIG
// -----------------------------
const BASE_URL = "https://intakeq.com/api/v1/appointments";
const API_KEY  = "9535643d05502224ba0d5499329ebe31e1a58c19";

const HEADERS = {
  "X-Auth-Key": API_KEY,
  "Content-Type": "application/json"
};

// Year range
const START_DATE = "2024-01-01";
const END_DATE   = "2024-12-31";

// Rate limiting / safe fetch
const SAFE_DELAY_MS  = 7000;       // ~8–9 requests/min
const MAX_DAILY_SHOTS = 500;

// Output
const OUTPUT_FILE = "yearappointments.json";
const TEMP_FILE   = OUTPUT_FILE + ".tmp";

// Sleep helper
const sleep = ms => new Promise(r => setTimeout(r, ms));

// -----------------------------
// MAIN FETCH FUNCTION
// -----------------------------
async function fetchYearAppointments() {
  let page = 1;
  let requestsMade = 0;
  let allAppointments = [];

  // 🔄 Resume support
  try {
    const existing = await fs.readFile(OUTPUT_FILE, "utf8");
    const state = JSON.parse(existing);
    allAppointments = state.appointments || [];
    page = (state.lastPageFetched || 0) + 1;
    console.log(`🔄 Resuming from page ${page}`);
  } catch {
    console.log("🚀 Starting fresh yearly fetch...");
  }

  while (true) {
    if (requestsMade >= MAX_DAILY_SHOTS) {
      console.log("🛑 Daily request limit reached.");
      break;
    }

    const url =
      `${BASE_URL}?startDate=${START_DATE}` +
      `&endDate=${END_DATE}` +
      `&page=${page}`;

    try {
      const { data } = await axios.get(url, { headers: HEADERS });
      requestsMade++;

      // -----------------------------
      // Enhanced Response Check
      // -----------------------------
      if (!Array.isArray(data)) {
        console.warn(
          "⚠️ Unexpected response format. Expected an array, got:",
          typeof data
        );
        break;
      }

      if (data.length === 0) {
        console.log(`✅ No more appointments. Completed at page ${page}.`);
        break;
      }

      allAppointments.push(...data);

      // -----------------------------
      // Atomic Save
      // -----------------------------
      const saveState = {
        year: `${START_DATE} → ${END_DATE}`,
        lastPageFetched: page,
        appointments: allAppointments
      };

      await fs.writeFile(TEMP_FILE, JSON.stringify(saveState, null, 2));
      await fs.rename(TEMP_FILE, OUTPUT_FILE);

      console.log(
        `✔ Page ${page}: ${data.length} records | Total so far: ${allAppointments.length}`
      );

      page++;
      await sleep(SAFE_DELAY_MS + Math.random() * 2000);

    } catch (err) {
      // -----------------------------
      // Rate Limit Handling
      // -----------------------------
      if (err.response?.status === 429) {
        const retryAfter =
          Number(err.response.headers["retry-after"]) * 1000 || 60000;
        console.warn(`⏳ Rate limit hit. Waiting ${retryAfter / 1000}s...`);
        await sleep(retryAfter);
        continue;
      }

      // -----------------------------
      // Unauthorized Handling
      // -----------------------------
      if (err.response?.status === 401) {
        console.error("❌ Unauthorized – check API key");
        process.exit(1);
      }

      console.error("❌ Fatal error:", err.message);
      break;
    }
  }

  console.log(
    `🎉 DONE: ${allAppointments.length} appointments fetched using ${requestsMade} requests`
  );
}

// -----------------------------
// RUN
// -----------------------------
fetchYearAppointments();
