const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

app.get('/api/jobs', (req, res) => {
  res.json([
    {
      id: "uuid",
      title: "Frontend Developer",
      company: "Orbit Labs",
      location: "San Diego, CA",
      type: "Full Time",
      salary: "$95k–$120k",
      posted_at: "2025-10-18T12:05:00Z",
      verdict: "Certified",
      verification_score: 0.88,
      source_names: ["Company Site","LinkedIn"],
      source_urls: ["https://careers...","https://linkedin.com/..."]
    }
  ]);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ API running at http://localhost:${PORT}`);
});
