
const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { analyzeReport, buildAreaSummary } = require("./src/logic");

const app = express();
const PORT = process.env.PORT || 3000;

const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "reports.json");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// =====================================
// 1. DEMO USERS
// =====================================

const users = [
  {
    id: 1,
    name: "FloodWatch Admin",
    email: "admin@floodwatch.com",
    password: "Admin123!",
    role: "admin"
  },
  {
    id: 2,
    name: "FloodWatch Volunteer",
    email: "volunteer@floodwatch.com",
    password: "Volunteer123!",
    role: "volunteer"
  }
];

// Temporary token storage for demo purposes
const activeTokens = new Map();

// =====================================
// 2. DATA MANAGEMENT
// =====================================

function readReports() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, "[]");
  }

  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function saveReports(reports) {
  fs.writeFileSync(
    DATA_FILE,
    JSON.stringify(reports, null, 2)
  );
}

// =====================================
// 3. AUTHENTICATION MIDDLEWARE
// =====================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Please login first."
    });
  }

  const token = authHeader.split(" ")[1];
  const user = activeTokens.get(token);

  if (!user) {
    return res.status(401).json({
      error: "Invalid or expired login session."
    });
  }

  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user.role !== "admin") {
    return res.status(403).json({
      error: "Admin permission required."
    });
  }

  next();
}

// =====================================
// 4. HEALTH CHECK
// =====================================

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    app: "FloodWatch"
  });
});

// =====================================
// 5. LOGIN API
// =====================================

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({
      error: "Email and password are required."
    });
  }

  const user = users.find(
    u =>
      u.email.toLowerCase() === String(email).trim().toLowerCase() &&
      u.password === password
  );

  if (!user) {
    return res.status(401).json({
      error: "Invalid email or password."
    });
  }

  const token = crypto.randomBytes(32).toString("hex");

  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role
  };

  activeTokens.set(token, safeUser);

  res.json({
    success: true,
    message: "Login successful.",
    token,
    user: safeUser
  });
});

// =====================================
// 6. CURRENT USER API
// =====================================

app.get("/api/auth/me", authenticateToken, (req, res) => {
  res.json({
    success: true,
    user: req.user
  });
});

// =====================================
// 7. LOGOUT API
// =====================================

app.post("/api/auth/logout", authenticateToken, (req, res) => {
  const token = req.headers.authorization.split(" ")[1];

  activeTokens.delete(token);

  res.json({
    success: true,
    message: "Logged out successfully."
  });
});

// =====================================
// 8. GET ALL REPORTS
// =====================================

app.get("/api/reports", authenticateToken, (_req, res) => {
  const reports = readReports().sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  res.json(reports);
});

// =====================================
// 9. SUBMIT NEW FLOOD REPORT
// =====================================

app.post("/api/reports", authenticateToken, (req, res) => {
  const { area, text } = req.body || {};

  if (!area || !text || !String(text).trim()) {
    return res.status(400).json({
      error: "Area and report text are required."
    });
  }

  const analysis = analyzeReport(String(text));

  const report = {
    id: `R-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    area: String(area).trim(),
    volunteer: req.user.name,
    originalText: String(text).trim(),
    ...analysis,
    createdAt: new Date().toISOString()
  };

  const reports = readReports();

  reports.push(report);
  saveReports(reports);

  res.status(201).json(report);
});

// =====================================
// 10. DELETE REPORT (ADMIN ONLY)
// =====================================

app.delete(
  "/api/reports/:id",
  authenticateToken,
  requireAdmin,
  (req, res) => {
    const reports = readReports();

    const updated = reports.filter(
      r => r.id !== req.params.id
    );

    if (updated.length === reports.length) {
      return res.status(404).json({
        error: "Report not found."
      });
    }

    saveReports(updated);

    res.json({
      success: true,
      message: "Report deleted successfully."
    });
  }
);

// =====================================
// 11. DASHBOARD SUMMARY
// =====================================

app.get("/api/dashboard", authenticateToken, (_req, res) => {
  const reports = readReports();

  res.json({
    areas: buildAreaSummary(reports),
    totalReports: reports.length
  });
});

// =====================================
// 12. RESET DEMO DATA (ADMIN ONLY)
// =====================================

app.post(
  "/api/demo/reset",
  authenticateToken,
  requireAdmin,
  (_req, res) => {
    const now = Date.now();

    const samples = [
      ["School Road", "Volunteer A", "Knee deep near the school", 8],
      ["School Road", "Volunteer B", "Water up to my ankles", 4],
      ["Mosque Road", "Volunteer C", "About 1.5 feet in front of the mosque", 3],
      ["Market Road", "Volunteer D", "Rickshaw can still pass but barely", 12],
      ["Station Road", "Volunteer E", "Road closed, too deep", 5],
      ["Market Road", "Volunteer F", "Water is around 6 inches", 140]
    ].map(([area, volunteer, text, ageHours]) => ({
      id: `DEMO-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      area,
      volunteer,
      originalText: text,
      ...analyzeReport(text),
      createdAt: new Date(
        now - ageHours * 3600000
      ).toISOString()
    }));

    saveReports(samples);

    res.json({
      success: true,
      count: samples.length
    });
  }
);

// =====================================
// 13. START SERVER
// =====================================

app.listen(PORT, () => {
  console.log(`FloodWatch running at http://localhost:${PORT}`);
});
