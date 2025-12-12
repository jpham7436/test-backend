// server.js
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();

// --- Basic middleware ---
app.use(cors());            // allow requests from localhost:3000
app.use(express.json());    // parse JSON bodies

// --- "Database" setup (JSON file on disk) ---
const DB_FILE = path.join(__dirname, 'jobs-db.json');

function generateId() {
  // Simple unique-ish id, no extra deps required
  return crypto.randomBytes(12).toString('hex');
}

function seedJobs() {
  // These mirror your frontend DEMO_JOBS so UI feels consistent
  const seed = [
    {
      id: "demo-1",
      title: "Frontend Developer",
      company: "Orbit Labs",
      location: "San Diego, CA",
      type: "Full Time",
      salary: "$95k–$120k",
      verdict: "Certified",
      verification_score: 0.88,
      posted_at: "2025-10-18T12:05:00Z",
      source_names: ["Company Site", "LinkedIn"],
      source_urls: ["#", "#"],
    },
    {
      id: "demo-2",
      title: "Backend Engineer",
      company: "Pinecone Systems",
      location: "Remote (US)",
      type: "Full Time",
      salary: "$120k–$150k",
      verdict: "Certified",
      verification_score: 0.92,
      posted_at: "2025-10-18T12:05:00Z",
      source_names: ["Lever", "LinkedIn"],
      source_urls: ["#", "#"],
    },
  ];
  return seed;
}

function loadJobsFromDisk() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const raw = fs.readFileSync(DB_FILE, 'utf8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return data;
      }
    }
  } catch (err) {
    console.error('Error reading jobs DB, falling back to seed data:', err);
  }
  const seeded = seedJobs();
  saveJobsToDisk(seeded);
  return seeded;
}

function saveJobsToDisk(jobs) {
  fs.writeFile(DB_FILE, JSON.stringify(jobs, null, 2), (err) => {
    if (err) {
      console.error('Error writing jobs DB:', err);
    }
  });
}

// In-memory cache of jobs, backed by JSON file
let jobs = loadJobsFromDisk();

// --- Helpers ---

function createJobFromBody(body) {
  const {
    title,
    company,
    location,
    type,
    salary,
    availability,          // optional extra field if your form uses it
    verdict,
    verification_score,
    posted_at,
    source_names,
    source_urls,
  } = body || {};

  const nowISO = new Date().toISOString();

  const job = {
    id: body.id || generateId(),
    title: String(title || '').trim(),
    company: String(company || '').trim(),
    location: location ? String(location).trim() : '',
    type: type ? String(type).trim() : 'Full Time',
    salary: salary ? String(salary).trim() : '',
    availability: availability ? String(availability).trim() : undefined,
    verdict: verdict ? String(verdict).trim() : 'Certified',
    verification_score:
      typeof verification_score === 'number'
        ? verification_score
        : // fake a "score" between 0.7–1.0 so it looks realistic
          Math.round((0.7 + Math.random() * 0.3) * 100) / 100,
    posted_at: posted_at || nowISO,
    source_names: Array.isArray(source_names) ? source_names : [],
    source_urls: Array.isArray(source_urls) ? source_urls : [],
  };

  return job;
}

// --- Routes ---

// Health check
app.get('/', (req, res) => {
  res.send('✅ Certified Jobs API is running');
});

// GET /api/jobs
// Supports q, location, certified, sort (recent|score) like your frontend
app.get('/api/jobs', (req, res) => {
  const { q, location, certified, sort } = req.query;

  let list = [...jobs];

  // Filter: certified=true => only certified jobs
  if (certified === 'true') {
    list = list.filter(
      (j) => String(j.verdict || '').toLowerCase() === 'certified'
    );
  }

  // Filter: q => matches title + company
  if (q) {
    const qLower = String(q).toLowerCase();
    list = list.filter((j) =>
      `${j.title || ''} ${j.company || ''}`.toLowerCase().includes(qLower)
    );
  }

  // Filter: location => substring match on location
  if (location) {
    const locLower = String(location).toLowerCase();
    list = list.filter((j) =>
      String(j.location || '').toLowerCase().includes(locLower)
    );
  }

  // Sort: by score or most recent
  list.sort((a, b) => {
    if (sort === 'score') {
      return (b.verification_score || 0) - (a.verification_score || 0);
    }
    const da = new Date(a.posted_at || 0).getTime();
    const db = new Date(b.posted_at || 0).getTime();
    return db - da; // newest first
  });

  res.json(list);
});

// POST /api/jobs
// Body: { title, company, location, type, salary, availability, source_names, source_urls, ... }
app.post('/api/jobs', (req, res) => {
  const { title, company } = req.body || {};

  if (!title || !company) {
    return res.status(400).json({
      error: 'Both "title" and "company" are required fields.',
    });
  }

  const job = createJobFromBody(req.body || {});
  jobs.push(job);
  saveJobsToDisk(jobs);

  res.status(201).json(job);
});

// --- Start server ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
