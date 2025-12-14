const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const app = express();
app.use(cors());
app.use(express.json());

const JOBS_PATH = path.join(__dirname, "jobs-db.json");
const SAVED_PATH = path.join(__dirname, "saved-db.json");
const USERS_PATH = path.join(__dirname, "users-db.json");

// JWT Secret - In production, use environment variable
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-in-production";


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
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

const COMPANIES = [
  "Google", "Amazon", "Microsoft", "Apple", "Meta", "Netflix", "Tesla", "Stripe", "Uber", "Airbnb",
  "Salesforce", "Adobe", "NVIDIA", "Intel", "Cisco", "Oracle", "IBM", "Bloomberg", "Qualcomm", "PayPal",
  "LinkedIn", "Shopify", "Twilio", "Square", "Spotify", "OpenAI", "Anthropic", "Figma", "Slack", "Asana"
];

const TITLES = [
  "Software Engineer", "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Data Analyst",
  "Data Scientist", "Machine Learning Engineer", "DevOps Engineer", "Cloud Engineer", "Security Engineer",
  "Product Manager", "UX Designer", "QA Engineer", "Mobile Engineer", "Site Reliability Engineer"
];

const LEVELS = ["Intern", "Junior", "Associate", "Mid", "Senior", "Staff"];
const TYPES = ["Internship", "Full-time", "Part-time", "Contract"];
const MODES = ["Remote", "Hybrid", "On-site"];

const CITIES = [
  "San Diego, CA", "Los Angeles, CA", "San Francisco, CA", "Seattle, WA", "Austin, TX", "New York, NY",
  "Boston, MA", "Denver, CO", "Chicago, IL", "Atlanta, GA", "Irvine, CA", "Dallas, TX", "Miami, FL"
];

const SKILLS = [
  "React", "Node.js", "TypeScript", "Python", "SQL", "AWS", "Docker", "Kubernetes", "Java",
  "PostgreSQL", "MongoDB", "Redis", "GraphQL", "REST APIs", "Testing", "Linux"
];

function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

function buildSalary(rng, type, level) {
  if (type === "Internship") return `$${randInt(rng, 18, 45)}–$${randInt(rng, 46, 70)}/hr`;
  const base =
    level === "Junior" ? [80, 115] :
      level === "Associate" ? [95, 135] :
        level === "Mid" ? [115, 165] :
          level === "Senior" ? [150, 220] :
            level === "Staff" ? [190, 280] :
              [25, 35];
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

function generateJobs(count = 10000, seed = 250) {
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

    const title = level === "Intern" ? `${baseTitle} Intern` : `${level} ${baseTitle}`;

    const daysAgo = randInt(rng, 0, 45);
    const posted_at = new Date(now - daysAgo * 86400000).toISOString();

    const easyApply = rng() < 0.55;

    const verdictRoll = rng();
    const verdict = verdictRoll < 0.65 ? "certified" : verdictRoll < 0.9 ? "pending" : "rejected";

    const verification_score =
      verdict === "certified" ? randInt(rng, 80, 99) :
        verdict === "pending" ? randInt(rng, 55, 85) :
          randInt(rng, 20, 60);

    const salary = buildSalary(rng, type, level);
    const description = buildDescription(rng, title, company, type);

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

      // ✅ IMPORTANT: always exists so Apply works
      apply_url: googleCareers(company),

      // optional "source_urls" to match your PostJob form if you use it
      source_urls: [googleCareers(company)],
      source_names: ["Careers"]
    });
  }

  return jobs;
}

function readJobs() {
  const data = readJson(JOBS_PATH, []);
  return Array.isArray(data) ? data : [];
}

function ensureJobsSeeded() {
  const jobs = readJobs();
  if (jobs.length >= 500) return jobs;
  const generated = generateJobs(10000, 250);
  writeJson(JOBS_PATH, generated);
  return generated;
}

function readSavedIds() {
  const data = readJson(SAVED_PATH, []);
  return Array.isArray(data) ? data : [];
}

function readUsers() {
  const data = readJson(USERS_PATH, []);
  return Array.isArray(data) ? data : [];
}

function writeUsers(users) {
  writeJson(USERS_PATH, users);
}

/* ---------------- Authentication Middleware ---------------- */

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user; // { userId, email, role }
    next();
  });
}

function requireCompany(req, res, next) {
  if (!req.user || req.user.role !== 'company') {
    return res.status(403).json({ error: "Access denied: Company role required" });
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
      "/api/saved/:id",
      "/api/saved/ids",
    ],
  });
});

/* ---------------- Authentication Routes ---------------- */

/**
 * POST /api/auth/signup
 * Body: { email, password, name }
 */
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { email, password, name, role } = req.body;

    // Validate role if provided
    const validRoles = ['user', 'company'];
    const userRole = role && validRoles.includes(role) ? role : 'user';

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: "Password must be at least 6 characters" });
    }

    const users = readUsers();

    // Check if user already exists
    const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const newUser = {
      id: `user_${Date.now()}`,
      email: email.toLowerCase(),
      name: name || email.split('@')[0],
      password: hashedPassword,
      role: userRole,
      createdAt: new Date().toISOString(),
    };

    users.push(newUser);
    writeUsers(users);

    // Generate JWT token
    const token = jwt.sign(
      { userId: newUser.id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;

    res.status(201).json({
      ok: true,
      message: "User created successfully",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const users = readUsers();

    // Find user
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role || 'user' },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      ok: true,
      message: "Login successful",
      token,
      user: userWithoutPassword,
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

/**
 * GET /api/auth/me
 * Protected route - requires authentication
 * Returns current user info
 */
app.get("/api/auth/me", authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.id === req.user.userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  const { password: _, ...userWithoutPassword } = user;
  res.json({
    ok: true,
    user: userWithoutPassword,
  });
});

/**
 * GET /api/jobs
 * Query:
 * - search, type, location, certifiedOnly, sort
 * - page (default 1)
 * - limit (default 25, max 200)
 */
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
  if (location) result = result.filter((j) => normalize(j.location).includes(location));
  if (certifiedOnly) result = result.filter((j) => normalize(j.verdict) === "certified");

  if (sort === "recent") {
    result = [...result].sort((a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0));
  } else if (sort === "score") {
    result = [...result].sort((a, b) => (b.verification_score || 0) - (a.verification_score || 0));
  } else if (sort === "company") {
    result = [...result].sort((a, b) => normalize(a.company).localeCompare(normalize(b.company)));
  }

  const total = result.length;

  let limit = parseInt(req.query.limit, 10);
  let page = parseInt(req.query.page, 10);
  if (Number.isNaN(limit)) limit = 25;
  if (Number.isNaN(page)) page = 1;

  limit = Math.max(1, Math.min(limit, 200));
  page = Math.max(1, page);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const start = (page - 1) * limit;
  const items = result.slice(start, start + limit);

  res.json({
    total,
    limit,
    page,
    totalPages,
    jobs: items,
  });
});

app.get("/api/jobs/:id", (req, res) => {
  const jobs = ensureJobsSeeded();
  const id = String(req.params.id);
  const job = jobs.find((j) => String(j.id) === id);
  if (!job) return res.status(404).json({ error: "Job not found" });
  res.json(job);
});

/**
 * POST /api/jobs
 * Body fields used by your PostJob:
 * - title, company, location, type, salary, availability
 * - source_urls (array), source_names (array)
 */
app.post("/api/jobs", authenticateToken, requireCompany, (req, res) => {
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

  const newJob = {
    id: `job_user_${Date.now()}`,
    postedBy: req.user.userId, // Track who posted it
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

    // ✅ IMPORTANT: Apply link always exists
    apply_url: source_urls[0] || googleCareers(company),

    source_urls,
    source_names,
  };

  jobs.unshift(newJob);
  writeJson(JOBS_PATH, jobs);

  res.json({ ok: true, job: newJob });
});

/**
 * PUT /api/jobs/:id
 * Update an existing job (Company only)
 */
app.put("/api/jobs/:id", authenticateToken, requireCompany, (req, res) => {
  const { id } = req.params;
  const jobs = ensureJobsSeeded();

  const jobIndex = jobs.findIndex(j => j.id === id);
  if (jobIndex === -1) {
    return res.status(404).json({ error: "Job not found" });
  }

  // Check ownership (optional: prevent editing others' jobs unless admin)
  const existingJob = jobs[jobIndex];
  if (existingJob.postedBy && existingJob.postedBy !== req.user.userId) {
    return res.status(403).json({ error: "You can only edit jobs you posted" });
  }

  // ALLOWED UPDATES
  const allowedUpdates = [
    "title", "company", "location", "type", "salary",
    "availability", "description", "apply_url"
  ];

  let updated = false;
  for (const key of allowedUpdates) {
    if (req.body[key] !== undefined) {
      existingJob[key] = req.body[key];
      updated = true;
    }
  }

  if (updated) {
    jobs[jobIndex] = existingJob;
    writeJson(JOBS_PATH, jobs);
  }

  res.json({ ok: true, job: existingJob });
});

/**
 * DELETE /api/jobs/:id
 * Delete a job (Company only)
 */
app.delete("/api/jobs/:id", authenticateToken, requireCompany, (req, res) => {
  const { id } = req.params;
  const jobs = ensureJobsSeeded();

  const jobIndex = jobs.findIndex(j => j.id === id);
  if (jobIndex === -1) {
    return res.status(404).json({ error: "Job not found" });
  }

  // Check ownership
  const job = jobs[jobIndex];
  if (job.postedBy && job.postedBy !== req.user.userId) {
    return res.status(403).json({ error: "You can only delete jobs you posted" });
  }

  // Remove the job
  jobs.splice(jobIndex, 1);
  writeJson(JOBS_PATH, jobs);

  res.json({ ok: true, message: "Job deleted successfully" });
});

/* ---------- Saved Jobs ---------- */

app.get("/api/saved/ids", (req, res) => {
  res.json(readSavedIds());
});

app.get("/api/saved", (req, res) => {
  const jobs = ensureJobsSeeded();
  const savedIds = new Set(readSavedIds().map(String));
  const savedJobs = jobs.filter((j) => savedIds.has(String(j.id)));
  res.json(savedJobs);
});

app.post("/api/saved/:id", (req, res) => {
  const id = String(req.params.id);
  const jobs = ensureJobsSeeded();
  const exists = jobs.some((j) => String(j.id) === id);
  if (!exists) return res.status(404).json({ error: "Job not found" });

  const saved = readSavedIds().map(String);
  if (!saved.includes(id)) saved.push(id);
  writeJson(SAVED_PATH, saved);

  res.json({ ok: true, savedIds: saved });
});

app.delete("/api/saved/:id", (req, res) => {
  const id = String(req.params.id);
  const saved = readSavedIds().map(String).filter((x) => x !== id);
  writeJson(SAVED_PATH, saved);
  res.json({ ok: true, savedIds: saved });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running: http://localhost:${PORT}`);
  console.log(`✅ Jobs endpoint:   http://localhost:${PORT}/api/jobs`);
  console.log(`✅ Job details:     http://localhost:${PORT}/api/jobs/job_00001`);
});
