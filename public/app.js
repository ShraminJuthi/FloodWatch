const $ = (id) => document.getElementById(id);
const severityClass = (s) => (s || "unknown").toLowerCase();
const fmtDepth = (n) => n === null || n === undefined ? "Not estimated" : `${n} in`;
const ageLabel = (hours) => hours < 1 ? `${Math.max(1,Math.round(hours*60))} min ago` : `${hours.toFixed(1)} hrs ago`;

async function refresh() {
  const [dashboardRes, reportsRes] = await Promise.all([fetch("/api/dashboard"), fetch("/api/reports")]);
  const dashboard = await dashboardRes.json();
  const reports = await reportsRes.json();
  const areas = dashboard.areas;
  const activeReports = reports.filter(r => (Date.now()-new Date(r.createdAt).getTime())/3600000 <= 3);
  $("areaCount").textContent = areas.length;
  $("reportCount").textContent = activeReports.length;
  $("criticalCount").textContent = areas.filter(a=>a.severity==="Critical").length;
  $("conflictCount").textContent = areas.filter(a=>a.disagreement).length;
  $("updated").textContent = `Updated ${new Date().toLocaleTimeString()}`;

  $("areas").innerHTML = areas.length ? areas.map(a => `
    <article class="area-card">
      <div><div class="area-name">${escapeHtml(a.area)}</div>
      <div class="area-meta">${a.activeReports} active · ${a.staleReports} stale · ${a.averageDepthInches===null?"No numeric depth":`Avg. ${a.averageDepthInches} in`}</div>
      ${a.disagreement?'<div class="warning">⚠ Conflicting reports — verify on site</div>':""}
      ${a.activeReports===0?'<div class="warning">No fresh reports — status may be outdated</div>':""}</div>
      <div class="area-right"><span class="pill ${severityClass(a.severity)}">${a.severity}</span></div>
    </article>`).join("") : '<div class="empty">No areas yet. Submit a report to get started.</div>';

  $("reportRows").innerHTML = reports.length ? reports.slice().reverse().slice(0,12).map(r => {
    const hours = (Date.now()-new Date(r.createdAt).getTime())/3600000;
    const stale = hours > 3;
    return `<tr><td>${escapeHtml(r.area)}<span class="subcell">${escapeHtml(r.volunteer)}</span></td>
      <td>${escapeHtml(r.originalText)}</td><td>${fmtDepth(r.depthInches)}</td>
      <td><span class="pill ${severityClass(r.severity)}">${r.severity}</span></td>
      <td>${stale?'<span class="pill unknown">STALE</span>':`<span class="subcell">${ageLabel(hours)}</span>`}</td></tr>`;
  }).join("") : '<tr><td colspan="5" class="empty">No reports yet. Submit one or load demo data.</td></tr>';
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[c]));
}
$("reportForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const button = e.submitter; button.disabled = true; button.textContent = "Analyzing…";
  try {
    const response = await fetch("/api/reports", { method:"POST", headers:{"Content-Type":"application/json"},
      body:JSON.stringify({ area:$("area").value, volunteer:$("volunteer").value, text:$("reportText").value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not submit report");
    $("formMessage").textContent = `Report analyzed: ${data.severity} risk · ${fmtDepth(data.depthInches)}`;
    $("reportText").value = ""; await refresh();
  } catch(err) { $("formMessage").textContent = err.message; }
  finally { button.disabled = false; button.textContent = "＋ Analyze & submit report"; }
});
$("demoBtn").addEventListener("click", async () => {
  await fetch("/api/demo/reset", {method:"POST"});
  $("formMessage").textContent = "Demo reports loaded successfully.";
  await refresh();
});
refresh();
setInterval(refresh, 15000);