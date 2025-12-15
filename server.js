const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs"); // ✅ bcryptjs (NOT bcrypt)
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const JOBS_PATH = path.join(__dirname, "jobs-db.json");
const SAVED_PATH = path.join(__dirname, "saved-db.json");
const USERS_PATH = path.join(__dirname, "users-db.json");

const JWT_SECRET =
  process.env.JWT_SECRET || "your-secret-key-change-in-production";

const PORT = process.env.PORT || 5000; // ✅ FIX: PORT is defined

/* ---------------- Helpers ---------------- */

function readJson(filePath, fallback) {
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw);
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), "utf-8");
}

function normalize(v) {
  return String(v || "").toLowerCase().trim();
}

function googleCareers(company) {
  const q = encodeURIComponent(`${company || "company"} careers`);
  return `https://www.google.com/search?q=${q}`;
}

/* ---------------- Seed Generator ---------------- */

function mulberry32(seed) {
  let t = seed >>> 0;
  return function () {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    // ✅ FIX: use r >>> 7 (not t >>> 7)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const COMPANIES = [
  "Google",
  "Amazon",
  "Microsoft",
  "Apple",
  "Meta",
  "Netflix",
  "Tesla",
  "Stripe",
  "Uber",
  "Airbnb",
  "Salesforce",
  "Adobe",
  "NVIDIA",
  "Intel",
  "Cisco",
  "Oracle",
  "IBM",
  "Bloomberg",
  "Qualcomm",
  "PayPal",
  "LinkedIn",
  "Shopify",
  "Twilio",
  "Square",
  "Spotify",
  "OpenAI",
  "Anthropic",
  "Figma",
  "Slack",
  "Asana",
];

const TITLES = [
  "Software Engineer",
  "Frontend Engineer",
  "Backend Engineer",
  "Full Stack Engineer",
  "Data Analyst",
  "Data Scientist",
  "Machine Learning Engineer",
  "DevOps Engineer",
  "Cloud Engineer",
  "Security Engineer",
  "Product Manager",
  "UX Designer",
  "QA Engineer",
  "Mobile Engineer",
  "Site Reliability Engineer",
];

const LEVELS = ["Intern", "Junior", "Associate", "Mid", "Senior", "Staff"];
const TYPES = ["Internship", "Full-time", "Part-time", "Contract"];
const MODES = ["Remote", "Hybrid", "On-site"];

const CITIES = [
  "San Diego, CA",
  "Los Angeles, CA",
  "San Francisco, CA",
  "Seattle, WA",
  "Austin, TX",
  "New York, NY",
  "Boston, MA",
  "Denver, CO",
  "Chicago, IL",
  "Atlanta, GA",
  "Irvine, CA",
  "Dallas, TX",
  "Miami, FL",
];

const SKILLS = [
  "React",
  "Node.js",
  "TypeScript",
  "Python",
  "SQL",
  "AWS",
  "Docker",
  "Kubernetes",
  "Java",
  "PostgreSQL",
  "MongoDB",
  "Redis",
  "GraphQL",
  "REST APIs",
  "Testing",
  "Linux",
];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function buildSalary(rng, type, level) {
  if (type === "Internship")
    return `$${randInt(rng, 18, 45)}–$${randInt(rng, 46, 70)}/hr`;

  const base =
    level === "Junior"
      ? [80, 115]
      : level === "Associate"
      ? [95, 135]
      : level === "Mid"
      ? [115, 165]
      : level === "Senior"
      ? [150, 220]
      : level === "Staff"
      ? [190, 280]
      : [25, 35];

  return `$${base[0]}k–$${base[1]}k`;
}

function buildDescription(rng, title, company, type) {
  const s1 = pick(rng, SKILLS);
  const s2 = pick(rng, SKILLS);
  const s3 = pick(rng, SKILLS);
  return `Join ${company} as a ${title}. You'll work with ${s1}, ${s2}, and ${s3} to ship features fast.

Responsibilities:
- Build and iterate on product features
- Collaborate with designers + engineers
- Write clean, testable code

Requirements:
- Experience with ${s1} or similar
- Strong communication and ownership
- Comfortable working in agile teams

Type: ${type}`;
}

function generateJobs(count = 25000, seed = 250) {
  const rng = mulberry32(seed);
  const now = Date.now();
  const jobs = [];

  for (let i = 1; i <= count; i++) {
    const company = pick(rng, COMPANIES);
    const baseTitle = pick(rng, TITLES);
    const level = pick(rng, LEVELS);
    const type = pick(rng, TYPES);

    const city = pick(rng, CITIES);
    const mode = pick(rng, MODES);
    const location = `${city} (${mode})`;

    const title =
      level === "Intern" ? `${baseTitle} Intern` : `${level} ${baseTitle}`;

    const daysAgo = randInt(rng, 0, 45);
    const posted_at = new Date(now - daysAgo * 86400000).toISOString();

    const easyApply = rng() < 0.55;

    const verdictRoll = rng();
    const verdict =
      verdictRoll < 0.65
        ? "certified"
        : verdictRoll < 0.9
        ? "pending"
        : "rejected";

    const verification_score =
      verdict === "certified"
        ? randInt(rng, 80, 99)
        : verdict === "pending"
        ? randInt(rng, 55, 85)
        : randInt(rng, 20, 60);

    const salary = buildSalary(rng, type, level);
    const description = buildDescription(rng, title, company, type);

    const apply = googleCareers(company);

    jobs.push({
      id: `job_${String(i).padStart(5, "0")}`,
      title,
      company,
      location,
      type,
      salary,
      posted_at,
      easyApply,
      verdict,
      verification_score,
      description,

      // ✅ IMPORTANT: always exists
      apply_url: apply,
      source_urls: [apply],
      source_names: ["Careers"],
    });
  }

  return jobs;
}

function readJobs() {
  const data = readJson(JOBS_PATH, []);
  return Array.isArray(data) ? data : [];
}

// ✅ Patch existing/imported jobs missing apply_url (fixes “No apply link”)
function patchJobsApplyLinks(jobs) {
  let changed = false;

  const patched = jobs.map((j) => {
    if (!j) return j;

    const company = j.company || "Company";
    const hasApply =
      typeof j.apply_url === "string" && j.apply_url.trim().length > 0;

    if (!hasApply) {
      const url = googleCareers(company);
      j.apply_url = url;
      j.source_urls =
        Array.isArray(j.source_urls) && j.source_urls.length
          ? j.source_urls
          : [url];
      j.source_names =
        Array.isArray(j.source_names) && j.source_names.length
          ? j.source_names
          : ["Careers"];
      changed = true;
    }

    return j;
  });

  if (changed) writeJson(JOBS_PATH, patched);
  return patched;
}

function ensureJobsSeeded() {
  let jobs = readJobs();

  if (jobs.length < 500) {
    const generated = generateJobs(25000, 250);
    writeJson(JOBS_PATH, generated);
    jobs = generated;
  }

  jobs = patchJobsApplyLinks(jobs);
  return jobs;
}

/* ---------- SAVED: per-user map ---------- */
// saved-db.json:
// { "user_123": ["job_00001","job_00002"], "user_456": [] }

function readSavedMap() {
  const data = readJson(SAVED_PATH, {});
  return data && typeof data === "object" && !Array.isArray(data) ? data : {};
}

function writeSavedMap(map) {
  writeJson(SAVED_PATH, map);
}

function getSavedIdsForUser(userId) {
  const map = readSavedMap();
  const list = map[String(userId)] || [];
  return Array.isArray(list) ? list.map(String) : [];
}

function setSavedIdsForUser(userId, ids) {
  const map = readSavedMap();
  map[String(userId)] = Array.from(new Set(ids.map(String)));
  writeSavedMap(map);
}

/* ---------- USERS ---------- */

function readUsers() {
  const data = readJson(USERS_PATH, []);
  return Array.isArray(data) ? data : [];
}

function writeUsers(users) {
  writeJson(USERS_PATH, users);
}

/* ---------------- Auth Middleware ---------------- */

function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = payload; // { userId, email, role }
    next();
  });
}

function requireCompany(req, res, next) {
  if (!req.user || req.user.role !== "company") {
    return res
      .status(403)
      .json({ error: "Access denied: Company role required" });
  }
  next();
}

/* ---------------- Routes ---------------- */

app.get("/", (req, res) => {
  res.json({
    ok: true,
    service: "jobhunt-api",
    routes: [
      "/api/auth/signup",
      "/api/auth/login",
      "/api/auth/me",
      "/api/jobs",
      "/api/jobs/:id",
      "/api/saved",
      "/api/saved/ids",
      "/api/saved/:id",
    ],
  });
});

/* ---------------- Auth Routes ---------------- */

app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    const validRoles = ["user", "company"];
    const userRole = role && validRoles.includes(role) ? role : "user";

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });
    if (password.length < 6)
      return res
        .status(400)
        .json({ error: "Password must be at least 6 characters" });

    const users = readUsers();
    const existing = users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (existing)
      return res
        .status(400)
        .json({ error: "User already exists with this email" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = {
      id: `user_${Date.now()}`,
      email: String(email).toLowerCase(),
      name: name || String(email).split("@")[0],
      password: hashedPassword,
      role: userRole,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    // ✅ ensure new user has its own saved list
    const savedMap = readSavedMap();
    if (!savedMap[newUser.id]) {
      savedMap[newUser.id] = [];
      writeSavedMap(savedMap);
    }

    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      ok: true,
      message: "User created successfully",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email and password are required" });

    const users = readUsers();
    const user = users.find(
      (u) => u.email.toLowerCase() === String(email).toLowerCase()
    );
    if (!user) return res.status(401).json({ error: "Invalid email or password" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid email or password" });

    // ensure saved entry exists
    const savedMap = readSavedMap();
    if (!savedMap[user.id]) {
      savedMap[user.id] = [];
      writeSavedMap(savedMap);
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role || "user" },
      JWT_SECRET,
      { expiresIn: "7d" }
    );

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      ok: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find((u) => u.id === req.user.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const { password: _, ...userWithoutPassword } = user;
  res.json({ ok: true, user: userWithoutPassword });
});

/* ---------------- Jobs ---------------- */

app.get("/api/jobs", (req, res) => {
  const jobs = ensureJobsSeeded();

  const search = normalize(req.query.search);
  const type = normalize(req.query.type);
  const location = normalize(req.query.location);
  const certifiedOnly = normalize(req.query.certifiedOnly) === "true";
  const sort = normalize(req.query.sort) || "recent";

  let result = jobs;

  if (search) {
    result = result.filter((j) => {
      const t = normalize(j.title);
      const c = normalize(j.company);
      const l = normalize(j.location);
      return t.includes(search) || c.includes(search) || l.includes(search);
    });
  }

  if (type) result = result.filter((j) => normalize(j.type) === type);
  if (location)
    result = result.filter((j) => normalize(j.location).includes(location));
  if (certifiedOnly)
    result = result.filter((j) => normalize(j.verdict) === "certified");

  if (sort === "recent") {
    result = [...result].sort(
      (a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0)
    );
  } else if (sort === "score") {
    result = [...result].sort(
      (a, b) => (b.verification_score || 0) - (a.verification_score || 0)
    );
  } else if (sort === "company") {
    result = [...result].sort((a, b) =>
      normalize(a.company).localeCompare(normalize(b.company))
    );
  }

  const total = result.length;

  let limit = parseInt(req.query.limit, 10);
  let page = parseInt(req.query.page, 10);
  if (Number.isNaN(limit)) limit = 25;
  if (Number.isNaN(page)) page = 1;

  limit = Math.max(1, Math.min(limit, 500));
  page = Math.max(1, page);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = result.slice(start, start + limit);

  res.json({ total, limit, page, totalPages, jobs: items });
});

app.get("/api/jobs/:id", (req, res) => {
  const jobs = ensureJobsSeeded();
  const id = String(req.params.id);
  const job = jobs.find((j) => String(j.id) === id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/* ✅✅✅ ADDITION: POST /api/jobs (Company posts a job) ✅✅✅ */
app.post("/api/jobs", authenticateToken, requireCompany, (req, res) => {
  try {
    const jobs = ensureJobsSeeded();

    const title = req.body?.title;
    const company = req.body?.company;
    const location = req.body?.location;
    const type = req.body?.type || "Full-time";
    const salary = req.body?.salary || "";
    const availability = req.body?.availability || "";
    const source_urls = Array.isArray(req.body?.source_urls) ? req.body.source_urls : [];
    const source_names = Array.isArray(req.body?.source_names) ? req.body.source_names : [];

    if (!title || !company || !location || !salary) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const apply = source_urls[0] || googleCareers(company);

    const newJob = {
      id: `job_user_${Date.now()}`,
      postedBy: req.user.userId,
      title,
      company,
      location,
      type,
      salary,
      availability,
      posted_at: new Date().toISOString(),
      easyApply: false,
      verdict: "pending",
      verification_score: 70,
      description: `User posted role at ${company}. Availability: ${availability || "N/A"}`,
      apply_url: apply,
      source_urls: source_urls.length ? source_urls : [apply],
      source_names: source_names.length ? source_names : ["Careers"],
    };

    jobs.unshift(newJob);
    writeJson(JOBS_PATH, jobs);

    res.status(201).json({ ok: true, job: newJob });
  } catch (err) {
    console.error("POST /api/jobs error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* ---------------- Saved Jobs (PER USER) ---------------- */

app.get("/api/saved/ids", authenticateToken, (req, res) => {
  res.json(getSavedIdsForUser(req.user.userId));
});

app.get("/api/saved", authenticateToken, (req, res) => {
  const jobs = ensureJobsSeeded();
  const savedIds = new Set(getSavedIdsForUser(req.user.userId).map(String));
  const savedJobs = jobs.filter((j) => savedIds.has(String(j.id)));
  res.json(savedJobs);
});

app.post("/api/saved/:id", authenticateToken, (req, res) => {
  const id = String(req.params.id);
  const jobs = ensureJobsSeeded();
  const exists = jobs.some((j) => String(j.id) === id);
  if (!exists) return res.status(404).json({ error: "Job not found" });

  const saved = getSavedIdsForUser(req.user.userId);
  if (!saved.includes(id)) saved.push(id);

  setSavedIdsForUser(req.user.userId, saved);

  res.json({ ok: true, savedIds: getSavedIdsForUser(req.user.userId) });
});

app.delete("/api/saved/:id", authenticateToken, (req, res) => {
  const id = String(req.params.id);
  const saved = getSavedIdsForUser(req.user.userId).filter((x) => x !== id);

  setSavedIdsForUser(req.user.userId, saved);

  res.json({ ok: true, savedIds: getSavedIdsForUser(req.user.userId) });
});

/* ---------------- Start ---------------- */

app.listen(PORT, () => {
  console.log(`✅ Backend running: http://localhost:${PORT}`);
  console.log(`✅ Jobs endpoint:   http://localhost:${PORT}/api/jobs`);
  console.log(`✅ Job details:     http://localhost:${PORT}/api/jobs/job_00001`);
});
