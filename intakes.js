import axios from "axios";
import fs from "fs/promises";

/* ================================
API CONFIG
================================ */
const BASE_URL = "https://intakeq.com/api/v1/intakes/summary";
const API_KEY = "9535643d05502224ba0d5499329ebe31e1a58c19";

const HEADERS = {
  "X-Auth-Key": API_KEY,
  "Content-Type": "application/json"
};

/* ================================
   SCRIPT CONFIG
================================ */
const SAFE_DELAY_MS = 6000; // ~10 req/min (IntakeQ rate limit)
const MAX_DAILY_SHOTS = 500;

const DATA_FILE = "intakes.json";
const STATE_FILE = "intakes.state.json";
const TEMP_FILE = DATA_FILE + ".tmp";

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function fetchAllIntakes() {
  let page = 1;
  let requestsMade = 0;
  let allIntakes = [];

  /* ================================
     RESUME LOGIC
  ================================ */
  try {
    const state = JSON.parse(await fs.readFile(STATE_FILE, "utf8"));
    const data = JSON.parse(await fs.readFile(DATA_FILE, "utf8"));

    page = (state.lastPageFetched || 0) + 1;
    allIntakes = data || [];

    console.log(`🔄 Resuming from page ${page}`);
  } catch {
    console.log("🚀 Starting fresh intake fetch...");
  }

  /* ================================
     FETCH LOOP
  ================================ */
  while (true) {
    if (requestsMade >= MAX_DAILY_SHOTS) {
      console.log("🛑 Daily request limit reached.");
      break;
    }

    try {
      const url = `${BASE_URL}?page=${page}`;

      const response = await axios.get(url, {
        headers: HEADERS
      });

      const data = response.data;
      requestsMade++;

      if (!Array.isArray(data) || data.length === 0) {
        console.log("✅ No more intakes to fetch.");
        break;
      }

      allIntakes.push(...data);

      // ✨ Atomic save
      await fs.writeFile(TEMP_FILE, JSON.stringify(allIntakes, null, 2));
      await fs.rename(TEMP_FILE, DATA_FILE);

      await fs.writeFile(
        STATE_FILE,
        JSON.stringify({ lastPageFetched: page }, null, 2)
      );

      console.log(
        `✔ Page ${page}: ${data.length} intakes | Shots left: ${MAX_DAILY_SHOTS - requestsMade}`
      );

      page++;
      await sleep(SAFE_DELAY_MS + Math.random() * 500);

    } catch (err) {
      if (err.response?.status === 429) {
        const retryAfter =
          Number(err.response.headers["retry-after"]) * 1000 || 60000;
        console.warn(`⏳ Rate limit hit. Waiting ${retryAfter / 1000}s...`);
        await sleep(retryAfter);
        continue;
      }

      if (err.response?.status === 401) {
        console.error("❌ Unauthorized. Check API key.");
        process.exit(1);
      }

      console.error(
        "❌ Fatal error:",
        err.response?.status,
        err.response?.data || err.message
      );
      break;
    }
  }

  /* ================================
     CLEANUP STATE
  ================================ */
  try {
    if (requestsMade < MAX_DAILY_SHOTS) {
      await fs.unlink(STATE_FILE);
      console.log("🧹 State file removed.");
    }
  } catch {}

  console.log(
    `🎉 DONE. Saved ${allIntakes.length} total intake summaries.`
  );
}

fetchAllIntakes();
