const express = require("express");
const fs = require("fs");
const path = require("path");
const { analyzeReport, buildAreaSummary } = require("./src/logic");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

function readReports() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, "[]");
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}
function saveReports(reports) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(reports, null, 2));
}

app.get("/api/health", (_req, res) => res.json({ ok: true, app: "FloodWatch" }));

app.get("/api/reports", (_req, res) => {
  const reports = readReports().sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt));
  res.json(reports);
});

app.post("/api/reports", (req, res) => {
  const { area, text, volunteer } = req.body || {};
  if (!area || !text || !String(text).trim()) {
    return res.status(400).json({ error: "Area and report text are required." });
  }
  const analysis = analyzeReport(String(text));
  const report = {
    id: `R-${Date.now()}-${Math.floor(Math.random()*1000)}`,
    area: String(area).trim(),
    volunteer: String(volunteer || "Anonymous").trim(),
    originalText: String(text).trim(),
    ...analysis,
    createdAt: new Date().toISOString()
  };
  const reports = readReports();
  reports.push(report);
  saveReports(reports);
  res.status(201).json(report);
});

app.delete("/api/reports/:id", (req, res) => {
  const reports = readReports();
  const updated = reports.filter(r => r.id !== req.params.id);
  if (updated.length === reports.length) return res.status(404).json({ error: "Report not found." });
  saveReports(updated);
  res.json({ success: true });
});

app.get("/api/dashboard", (_req, res) => {
  const reports = readReports();
  res.json({ areas: buildAreaSummary(reports), totalReports: reports.length });
});

app.post("/api/demo/reset", (_req, res) => {
  const now = Date.now();
  const samples = [
    ["School Road", "Volunteer A", "Knee deep near the school", 8],
    ["School Road", "Volunteer B", "Water up to my ankles", 4],
    ["Mosque Road", "Volunteer C", "About 1.5 feet in front of the mosque", 3],
    ["Market Road", "Volunteer D", "Rickshaw can still pass but barely", 12],
    ["Station Road", "Volunteer E", "Road closed, too deep", 5],
    ["Market Road", "Volunteer F", "Water is around 6 inches", 140]
  ].map(([area, volunteer, text, ageHours]) => ({
    id: `DEMO-${Math.random().toString(36).slice(2,8).toUpperCase()}`,
    area, volunteer, originalText: text, ...analyzeReport(text),
    createdAt: new Date(now - ageHours*3600000).toISOString()
  }));
  saveReports(samples);
  res.json({ success: true, count: samples.length });
});

app.listen(PORT, () => console.log(`FloodWatch running at http://localhost:${PORT}`));