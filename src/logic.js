// FloodWatch report interpretation and aggregation logic.
// Depth estimates are approximate: real human body measurements vary.
const STALE_AFTER_HOURS = 3;

function analyzeReport(rawText) {
  const text = rawText.toLowerCase();
  let depthInches = null;
  let severity = "Unknown";
  let confidence = "Low";
  let evidence = [];

  // Explicit numeric measurements: 1.5 feet, 12 inches, 30 cm, etc.
  const feet = text.match(/(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\b/);
  const inches = text.match(/(\d+(?:\.\d+)?)\s*(?:inches|inch|in)\b/);
  const cm = text.match(/(\d+(?:\.\d+)?)\s*(?:centimeters|centimetres|cm)\b/);
  if (feet) { depthInches = Number(feet[1]) * 12; evidence.push("Converted feet to inches"); }
  else if (inches) { depthInches = Number(inches[1]); evidence.push("Reported in inches"); }
  else if (cm) { depthInches = Number(cm[1]) / 2.54; evidence.push("Converted centimeters to inches"); }

  // Qualitative phrases when no explicit measurement exists.
  if (depthInches === null) {
    if (/ankle|ankles/.test(text)) { depthInches = 4; evidence.push("Ankle-depth estimate"); }
    else if (/knee|knees/.test(text)) { depthInches = 18; evidence.push("Knee-depth estimate"); }
    else if (/waist/.test(text)) { depthInches = 36; evidence.push("Waist-depth estimate"); }
    else if (/shin/.test(text)) { depthInches = 8; evidence.push("Shin-depth estimate"); }
  }

  const closed = /road closed|closed road|impassable|cannot pass|can't pass|no passage|blocked/.test(text);
  const barely = /barely|with difficulty|difficult to pass|hard to pass|rickshaw can still pass/.test(text);
  const passable = /passable|can pass|traffic moving|cars can pass|rickshaw can pass/.test(text);

  if (closed) { severity = "Critical"; confidence = "High"; evidence.push("Explicit closure / no passage"); }
  else if (depthInches !== null) {
    if (depthInches >= 18) severity = "Critical";
    else if (depthInches >= 10) severity = "High";
    else if (depthInches >= 5) severity = "Moderate";
    else severity = "Low";
    confidence = feet || inches || cm ? "High" : "Medium";
  } else if (barely) { severity = "High"; confidence = "Medium"; evidence.push("Difficult passage reported"); }
  else if (passable) { severity = "Low"; confidence = "Medium"; evidence.push("Passage reported possible"); }

  // A road-closure statement is a hazard even if no depth is given.
  return {
    depthInches: depthInches === null ? null : Math.round(depthInches * 10) / 10,
    severity, confidence, isClosed: closed, evidence,
    status: "Active"
  };
}

function buildAreaSummary(reports) {
  const now = Date.now();
  const groups = {};
  for (const report of reports) {
    const ageHours = Math.max(0, (now - new Date(report.createdAt).getTime()) / 3600000);
    const isStale = ageHours > STALE_AFTER_HOURS;
    const item = { ...report, ageHours, isStale };
    (groups[report.area] ||= []).push(item);
  }

  const rank = { Critical: 4, High: 3, Moderate: 2, Low: 1, Unknown: 0 };
  return Object.entries(groups).map(([area, items]) => {
    const active = items.filter(r => !r.isStale);
    const staleCount = items.length - active.length;
    const usable = active.length ? active : items;
    const severities = usable.map(r => rank[r.severity] ?? 0);
    const maxSeverity = Math.max(...severities);
    const latest = [...active].sort((a,b) => new Date(b.createdAt)-new Date(a.createdAt))[0] || null;
    const depths = active.map(r => r.depthInches).filter(v => v !== null);
    const disagreement = active.some(a => active.some(b =>
      a.id !== b.id &&
      ((a.depthInches !== null && b.depthInches !== null && Math.abs(a.depthInches-b.depthInches) >= 8) ||
       (a.severity === "Critical" && ["Low","Moderate"].includes(b.severity)) ||
       (b.severity === "Critical" && ["Low","Moderate"].includes(a.severity)))
    ));
    const severity = Object.keys(rank).find(k => rank[k] === maxSeverity) || "Unknown";
    return {
      area, severity, activeReports: active.length, staleReports: staleCount,
      averageDepthInches: depths.length ? Math.round(depths.reduce((a,b)=>a+b,0)/depths.length*10)/10 : null,
      latestReportAt: latest?.createdAt || null,
      latestText: latest?.originalText || "No recent report",
      disagreement, reports: items.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt))
    };
  }).sort((a,b) => (rank[b.severity] - rank[a.severity]) || b.activeReports-a.activeReports);
}

module.exports = { analyzeReport, buildAreaSummary, STALE_AFTER_HOURS };