// inbox.js: files new pieces from inbox/ into pages/, named and ready to bind.
// Drawings are turned upright, shrunk to 2000px, and stripped of metadata
// (iPhone photos carry GPS location, and this repo is public).
// Run it from the parisny folder with:  node inbox.js   then:  node bind.js

const fs = require("fs");
const path = require("path");
const readline = require("readline/promises");
const { execFileSync } = require("child_process");

const INBOX = path.join(__dirname, "inbox");
const DONE = path.join(INBOX, "done");
const PAGES = path.join(__dirname, "pages");
const PREPARE = path.join(__dirname, "prepare-image.swift");

const DRAWING = [".jpg", ".jpeg", ".png", ".heic", ".heif"];
const PASSAGE = [".md"];

// Today in New York as "2026-11-19". getFullYear() and friends read the
// local clock, so no UTC trap here (see formatDate in bind.js).
function today() {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

// Is "2026-11-19" a real day? The shape alone isn't enough: 2026-02-30 has
// the right shape, but new Date quietly rolls it over to 2 March.
function isRealDate(text) {
  const parts = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!parts) return false;
  const [, year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

// Decide the page name for a new piece on `date`.
// One piece a day has no letter. A second makes the first "-a" and itself "-b";
// after that "-c", "-d"... Returns the name, plus a rename for the existing
// piece if one is needed. The rename happens later, only once the new file
// is safely written.
function claimName(date, ext) {
  const sameDay = fs.readdirSync(PAGES).filter((f) => {
    return f.startsWith(date) && f.endsWith(ext) && /^\d{4}-\d{2}-\d{2}(-[a-z])?\.\w+$/.test(f);
  });
  const plain = `${date}${ext}`;

  if (sameDay.length === 0) return { name: plain, rename: null };

  if (sameDay.includes(plain)) {
    if (sameDay.length > 1) {
      throw new Error(`pages/ has both ${plain} and lettered pieces for that day. Sort it out by hand first.`);
    }
    return { name: `${date}-b${ext}`, rename: [plain, `${date}-a${ext}`] };
  }

  // Already lettered: take the letter after the highest one
  const letters = sameDay.map((f) => f.slice(11, 12)).sort();
  const next = String.fromCharCode(letters[letters.length - 1].charCodeAt(0) + 1);
  return { name: `${date}-${next}${ext}`, rename: null };
}

async function main() {
  const waiting = fs
    .readdirSync(INBOX, { withFileTypes: true })
    .filter((entry) => entry.isFile() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort();

  if (waiting.length === 0) {
    console.log("inbox/ is empty. Nothing to file.");
    return;
  }

  fs.mkdirSync(DONE, { recursive: true });
  const prompt = readline.createInterface({ input: process.stdin, output: process.stdout });
  const filed = [];

  try {
    for (const original of waiting) {
      const ext = path.extname(original).toLowerCase();
      const isDrawing = DRAWING.includes(ext);
      if (!isDrawing && !PASSAGE.includes(ext)) {
        console.log(`\nSkipping ${original}: not a drawing or a .md passage.`);
        continue;
      }

      // 1. Ask for the date, until it's a real one. Enter means today.
      console.log(`\n${original}`);
      let date = "";
      while (!isRealDate(date)) {
        const answer = (await prompt.question(`  date [${today()}]: `)).trim();
        date = answer || today();
        if (!isRealDate(date)) console.log("  Type it like 2026-11-19, or press Enter for today.");
      }

      // 2. Write the new page
      const { name, rename } = claimName(date, isDrawing ? ".jpg" : ".md");
      const from = path.join(INBOX, original);
      const to = path.join(PAGES, name);
      if (fs.existsSync(to)) throw new Error(`pages/${name} already exists. Nothing was overwritten.`);

      if (isDrawing) {
        console.log("  turning upright, shrinking, removing location data...");
        execFileSync("swift", [PREPARE, from, to], { stdio: "inherit" });
      } else {
        fs.copyFileSync(from, to);
      }

      // 3. Only now, letter the piece that was there first
      if (rename) {
        fs.renameSync(path.join(PAGES, rename[0]), path.join(PAGES, rename[1]));
        console.log(`  renamed pages/${rename[0]} -> pages/${rename[1]}`);
      }

      // 4. Move the original out of the way. Its new name starts with the page
      //    name, so two "Untitled document.md"s can never overwrite each other.
      const pageStem = name.slice(0, -path.extname(name).length);
      fs.renameSync(from, path.join(DONE, `${pageStem} ${original}`));
      console.log(`  -> pages/${name}`);
      filed.push(name);
    }
  } finally {
    prompt.close();
  }

  console.log(`\nFiled ${filed.length} piece(s). Originals are in inbox/done/.`);
  if (filed.length > 0) console.log("Next: node bind.js");
}

main().catch((error) => {
  console.error(`\nStopped: ${error.message}`);
  process.exit(1);
});
