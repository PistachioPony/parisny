// bind.js: binds the loose pages into one book.
// Reads template/ and pages/, writes the finished site into docs/.
// Run it from the parisny folder with:  node bind.js

const fs = require("fs");
const path = require("path");

const PAGES = path.join(__dirname, "pages");
const TEMPLATE = path.join(__dirname, "template");
const DOCS = path.join(__dirname, "docs");

// A page's name: a date, an optional -a / -b for two pieces on one day, then .jpg or .md
const PAGE_NAME = /^(\d{4})-(\d{2})-(\d{2})(?:-[a-z])?\.(jpg|md)$/;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// "2026", "11", "06"  ->  "6 November 2026"
// Done by hand on purpose: new Date("2026-11-06") means midnight in London,
// which is still the evening of 5 November in New York.
function formatDate(year, month, day) {
  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

// Make text safe inside HTML: a bare & or < would be read as code.
function escapeHtml(text) {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// One file in pages/  ->  one <article> in the book
function bindPage(file) {
  const [, year, month, day, ext] = file.match(PAGE_NAME);
  const date = formatDate(year, month, day);
  const time = `<time datetime="${year}-${month}-${day}">${date}</time>`;

  if (ext === "jpg") {
    return [
      `<article class="drawing">`,
      `  ${time}`,
      `  <img src="pages/${file}" alt="Drawing, ${date}" loading="lazy">`,
      `</article>`,
    ].join("\n");
  }

  // A passage: paragraphs are separated by blank lines
  const text = fs.readFileSync(path.join(PAGES, file), "utf-8");
  const paragraphs = text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => `  <p>${escapeHtml(p)}</p>`);

  return [`<article class="passage">`, `  ${time}`, ...paragraphs, `</article>`].join("\n");
}

// One day in the chain. Two or more drawings sent the same day
// sit side by side under a single date; anything else binds page by page.
function bindDay(day) {
  const allDrawings = day.files.every((f) => f.endsWith(".jpg"));
  if (day.files.length === 1 || !allDrawings) {
    return day.files.map(bindPage).join("\n\n");
  }

  const [, year, month, dd] = day.files[0].match(PAGE_NAME);
  const date = formatDate(year, month, dd);
  return [
    `<article class="drawing pair">`,
    `  <time datetime="${day.date}">${date}</time>`,
    `  <div class="pair-images">`,
    ...day.files.map((f) => `    <img src="pages/${f}" alt="Drawing, ${date}" loading="lazy">`),
    `  </div>`,
    `</article>`,
  ].join("\n");
}

// 1. The chain: every page in pages/, in order. Dates sort correctly as plain text.
const files = fs.readdirSync(PAGES).filter((f) => PAGE_NAME.test(f)).sort();

// 2. Group the pages by day: pieces sent on the same day stay together
const days = [];
for (const file of files) {
  const date = file.slice(0, 10);            // "2026-10-23"
  const last = days[days.length - 1];
  if (last && last.date === date) last.files.push(file);
  else days.push({ date, files: [file] });
}

// 3. Bind each day
const chain = days.map(bindDay).join("\n\n");

// 4. Pour the chain into the template
const template = fs.readFileSync(path.join(TEMPLATE, "index.html"), "utf-8");
if (!template.includes("<!-- CHAIN -->")) {
  console.error("template/index.html has no <!-- CHAIN --> marker. Nothing was built.");
  process.exit(1);
}
const book = template.replace("<!-- CHAIN -->", () => chain);

// 5. Build docs/ fresh: wipe it, then write everything again
fs.rmSync(DOCS, { recursive: true, force: true });
fs.mkdirSync(path.join(DOCS, "pages"), { recursive: true });

fs.writeFileSync(path.join(DOCS, "index.html"), book);
fs.copyFileSync(path.join(TEMPLATE, "style.css"), path.join(DOCS, "style.css"));
const drawings = files.filter((f) => f.endsWith(".jpg"));
for (const f of drawings) {
  fs.copyFileSync(path.join(PAGES, f), path.join(DOCS, "pages", f));
}

// 6. Report
console.log(
  `Bound ${files.length} pages (${drawings.length} drawings, ` +
  `${files.length - drawings.length} passages) into docs/index.html`
);
