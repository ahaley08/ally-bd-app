const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── PERSISTENT STORAGE ───────────────────────────────────────────────────────
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'db.json');

function readDB() {
  try {
    if (fs.existsSync(DB_PATH)) {
      return JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('DB read error:', e.message);
  }
  return getDefaultDB();
}

function writeDB(db) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
  } catch (e) {
    console.error('DB write error:', e.message);
  }
}

function nextId(collection) {
  if (!collection.length) return 1;
  return Math.max(...collection.map(r => r.id || 0)) + 1;
}

function now() {
  return new Date().toISOString();
}

function getDefaultDB() {
  const db = {
    team_members: [],
    opportunities: [],
    pipeline_stages: [],
    scorecard_entries: [],
    activity_log: [],
    hospitals: [],
    rhc_facilities: []
  };

  const team = [
    { id: 1, name: 'Dr. Chili', title: 'Chief Medical Officer', email: '', phone: '', role: 'BD', territory: 'Multi-State', notes: '', active: true, created_at: now() },
    { id: 2, name: 'Chad', title: 'VP Business Development', email: '', phone: '', role: 'BD', territory: 'Multi-State', notes: '', active: true, created_at: now() },
    { id: 3, name: 'Eric Worthan', title: 'COO', email: '', phone: '', role: 'Leadership', territory: 'All', notes: '', active: true, created_at: now() },
    { id: 4, name: 'Charlie Tyson', title: 'CFO', email: '', phone: '', role: 'Leadership', territory: 'All', notes: '', active: true, created_at: now() },
  ];
  db.team_members = team;

  const STAGES = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  const stageOrder = { 'Identified': 0, 'Contacted/Awareness': 1, 'Meeting': 2, 'Data Exchange': 3, 'Pro Forma/Proposal': 4, 'Close': 5 };

  const oppData = [
    { name: 'Coosa Valley', type: 'Hospital', source: 'Current Book Expansion', stage: 'Pro Forma/Proposal', state: 'AL', city: 'Sylacauga', notes: 'CVMC looking to cutout Horizon as BH Mngt Co. Chad in active dialogue with COO and CFO.', status: '3/27 Contract in hand, RHC contract in hand, pro forma complete', score: 48, score_pct: 0.80 },
    { name: 'CGH Medical Center (Illinois)', type: 'Hospital/Horizon', source: 'Referral', stage: 'Pro Forma/Proposal', state: 'IL', city: 'Chicago', notes: 'Chad sent proforma to Charlie for review', status: null, score: 0, score_pct: 0 },
    { name: 'Brookwood Baptist - Intake', type: 'Hospital - Mgmt/SLA', source: 'Referral', stage: 'Meeting', state: 'AL', city: 'Birmingham', notes: 'Chad/Chili to meet to finalize proposal', status: null, score: 0, score_pct: 0 },
    { name: 'McCalla', type: 'Sub - PHP', source: 'Referral', stage: 'Meeting', state: 'AL', city: 'McCalla', notes: 'Chad will share pricing with Mike at McCalla', status: null, score: 0, score_pct: 0 },
    { name: 'WellStar', type: 'Health System', source: 'Outbound', stage: 'Identified', state: 'GA', city: 'Atlanta', notes: null, status: null, score: 0, score_pct: 0 },
    { name: 'Pickens County', type: 'Rural Hospital', source: 'Outbound', stage: 'Identified', state: 'AL', city: 'Pickens County', notes: 'Chad will reach out to Chaim to review opportunity', status: null, score: 0, score_pct: 0 },
    { name: 'Haleyville', type: 'Rural Hospital', source: 'Outbound', stage: 'Identified', state: 'AL', city: 'Haleyville', notes: null, status: null, score: 0, score_pct: 0 },
    { name: 'Russellville', type: 'Rural Hospital', source: 'Outbound', stage: 'Identified', state: 'AL', city: 'Russellville', notes: null, status: null, score: 0, score_pct: 0 },
    { name: 'Crenshaw Community Hospital', type: 'Hospital - SLA', source: 'Referral', stage: 'Meeting', state: 'AL', city: 'Luverne', notes: 'Chad will connect with Mitch on next steps with Judge Purdue', status: null, score: 0, score_pct: 0 },
    { name: 'Geriatric Unit - Gallatin TN', type: 'Hospital', source: 'Outbound', stage: 'Identified', state: 'TN', city: 'Gallatin', notes: 'Gather more data on facility, Dr Chili to reach out', status: null, score: 0, score_pct: 0 },
    { name: 'Covenant Health Knoxville', type: 'Hospital', source: 'Outbound', stage: 'Identified', state: 'TN', city: 'Knoxville', notes: 'Find contact to work through, Dr. Chili to reach out', status: null, score: 0, score_pct: 0 },
    { name: 'Saginaw Michigan', type: 'Hospital/Horizon', source: 'Referral', stage: 'Pro Forma/Proposal', state: 'MI', city: 'Saginaw', notes: 'Proposal for full service only', status: null, score: 0, score_pct: 0 },
    { name: 'Evolve MD', type: 'Practice', source: 'Referral', stage: 'Identified', state: null, city: null, notes: 'Chad connected with Paul, he wants a finders fee', status: null, score: 0, score_pct: 0 },
  ];

  let oppId = 1;
  let stageId = 1;
  for (const o of oppData) {
    const opp = { id: oppId, ...o, assigned_to: null, npi: null, address: null, phone: null, top_line_revenue: null, ebitda_dollars: null, ebitda_pct: null, facility_type: null, active: true, created_at: now(), updated_at: now() };
    db.opportunities.push(opp);
    const currentIdx = stageOrder[o.stage] ?? 0;
    for (let i = 0; i < STAGES.length; i++) {
      db.pipeline_stages.push({ id: stageId++, opportunity_id: oppId, stage: STAGES[i], completed: i <= currentIdx, completed_at: i <= currentIdx ? now() : null, notes: null });
    }
    oppId++;
  }

  return db;
}

let DB = readDB();

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── TEAM ──────────────────────────────────────────────────────────────────────
app.get('/api/team', (req, res) => {
  res.json(DB.team_members.filter(t => t.active).sort((a, b) => a.name.localeCompare(b.name)));
});

app.post('/api/team', (req, res) => {
  const member = { id: nextId(DB.team_members), ...req.body, active: true, created_at: now(), updated_at: now() };
  DB.team_members.push(member);
  writeDB(DB);
  res.json(member);
});

app.put('/api/team/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = DB.team_members.findIndex(t => t.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  DB.team_members[idx] = { ...DB.team_members[idx], ...req.body, id, updated_at: now() };
  writeDB(DB);
  res.json({ success: true });
});

app.delete('/api/team/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = DB.team_members.findIndex(t => t.id === id);
  if (idx !== -1) { DB.team_members[idx].active = false; writeDB(DB); }
  res.json({ success: true });
});

// ─── OPPORTUNITIES ─────────────────────────────────────────────────────────────
app.get('/api/opportunities', (req, res) => {
  const opps = DB.opportunities.filter(o => o.active).sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at));
  const result = opps.map(o => {
    const team = DB.team_members.find(t => t.id === o.assigned_to);
    return { ...o, assigned_name: team ? team.name : null };
  });
  res.json(result);
});

app.get('/api/opportunities/:id', (req, res) => {
  const opp = DB.opportunities.find(o => o.id === parseInt(req.params.id));
  if (!opp) return res.status(404).json({ error: 'Not found' });
  const team = DB.team_members.find(t => t.id === opp.assigned_to);
  res.json({
    ...opp,
    assigned_name: team ? team.name : null,
    stages: DB.pipeline_stages.filter(s => s.opportunity_id === opp.id).sort((a, b) => a.id - b.id),
    scorecard: DB.scorecard_entries.filter(s => s.opportunity_id === opp.id),
    activity: DB.activity_log.filter(a => a.opportunity_id === opp.id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 20)
      .map(a => ({ ...a, member_name: (DB.team_members.find(t => t.id === a.team_member_id) || {}).name || null }))
  });
});

app.post('/api/opportunities', (req, res) => {
  const STAGES = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  const stageOrder = { 'Identified': 0, 'Contacted/Awareness': 1, 'Meeting': 2, 'Data Exchange': 3, 'Pro Forma/Proposal': 4, 'Close': 5 };
  const opp = { id: nextId(DB.opportunities), score: 0, score_pct: 0, active: true, created_at: now(), updated_at: now(), ...req.body };
  DB.opportunities.push(opp);
  const currentIdx = stageOrder[opp.stage] ?? 0;
  let sid = nextId(DB.pipeline_stages);
  STAGES.forEach((s, i) => {
    DB.pipeline_stages.push({ id: sid++, opportunity_id: opp.id, stage: s, completed: i <= currentIdx, completed_at: i <= currentIdx ? now() : null });
  });
  writeDB(DB);
  res.json(opp);
});

app.put('/api/opportunities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = DB.opportunities.findIndex(o => o.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  DB.opportunities[idx] = { ...DB.opportunities[idx], ...req.body, id, updated_at: now() };
  writeDB(DB);
  res.json({ success: true });
});

app.delete('/api/opportunities/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const idx = DB.opportunities.findIndex(o => o.id === id);
  if (idx !== -1) { DB.opportunities[idx].active = false; writeDB(DB); }
  res.json({ success: true });
});

app.put('/api/opportunities/:id/stages', (req, res) => {
  const id = parseInt(req.params.id);
  const { stages } = req.body;
  const STAGE_ORDER = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  DB.pipeline_stages = DB.pipeline_stages.map(s => {
    if (s.opportunity_id !== id || !stages.hasOwnProperty(s.stage)) return s;
    return { ...s, completed: !!stages[s.stage], completed_at: stages[s.stage] ? now() : null };
  });
  let currentStage = 'Identified';
  for (const s of STAGE_ORDER) { if (stages[s]) currentStage = s; }
  const idx = DB.opportunities.findIndex(o => o.id === id);
  if (idx !== -1) { DB.opportunities[idx].stage = currentStage; DB.opportunities[idx].updated_at = now(); }
  writeDB(DB);
  res.json({ success: true });
});

app.post('/api/opportunities/:id/scorecard', (req, res) => {
  const id = parseInt(req.params.id);
  const { entries } = req.body;
  DB.scorecard_entries = DB.scorecard_entries.filter(s => s.opportunity_id !== id);
  let totalScore = 0;
  let eid = nextId(DB.scorecard_entries);
  for (const e of entries) {
    const score = (e.tier || 0) * e.weight;
    totalScore += score;
    DB.scorecard_entries.push({ id: eid++, opportunity_id: id, category: e.category, tier: e.tier, weight: e.weight, score });
  }
  const score_pct = totalScore / 60;
  const idx = DB.opportunities.findIndex(o => o.id === id);
  if (idx !== -1) { DB.opportunities[idx].score = totalScore; DB.opportunities[idx].score_pct = score_pct; DB.opportunities[idx].updated_at = now(); }
  writeDB(DB);
  res.json({ score: totalScore, score_pct });
});

// ─── ACTIVITY ──────────────────────────────────────────────────────────────────
app.post('/api/activity', (req, res) => {
  const entry = { id: nextId(DB.activity_log), ...req.body, created_at: now() };
  DB.activity_log.push(entry);
  writeDB(DB);
  res.json(entry);
});

// ─── STATS ─────────────────────────────────────────────────────────────────────
app.get('/api/stats', (req, res) => {
  const activeOpps = DB.opportunities.filter(o => o.active);
  const byStage = {};
  for (const o of activeOpps) { byStage[o.stage] = (byStage[o.stage] || 0) + 1; }
  const byStageArr = Object.entries(byStage).map(([stage, c]) => ({ stage, c }));
  const scored = activeOpps.filter(o => o.score > 0);
  const avgScore = scored.length ? scored.reduce((a, b) => a + (b.score_pct || 0), 0) / scored.length : null;
  const recentActivity = [...DB.activity_log].reverse().slice(0, 10).map(a => ({
    ...a,
    opp_name: (DB.opportunities.find(o => o.id === a.opportunity_id) || {}).name || null,
    member_name: (DB.team_members.find(t => t.id === a.team_member_id) || {}).name || null
  }));
  res.json({ totalOpps: activeOpps.length, byStage: byStageArr, avgScore, recentActivity });
});

// ─── HOSPITALS / RHC ───────────────────────────────────────────────────────────
app.get('/api/hospitals', (req, res) => {
  const { q = '', state = '', limit = 50, offset = 0 } = req.query;
  let results = DB.hospitals;
  if (q) results = results.filter(h => (h.facility_name || '').toLowerCase().includes(q.toLowerCase()) || (h.city || '').toLowerCase().includes(q.toLowerCase()));
  if (state) results = results.filter(h => h.state === state);
  res.json({ total: results.length, results: results.slice(parseInt(offset), parseInt(offset) + parseInt(limit)) });
});

app.get('/api/rhc', (req, res) => {
  const { q = '', state = '', limit = 50, offset = 0 } = req.query;
  let results = DB.rhc_facilities;
  if (q) results = results.filter(r => (r.organization_name || '').toLowerCase().includes(q.toLowerCase()) || (r.dba_name || '').toLowerCase().includes(q.toLowerCase()) || (r.city || '').toLowerCase().includes(q.toLowerCase()));
  if (state) results = results.filter(r => r.state === state);
  res.json({ total: results.length, results: results.slice(parseInt(offset), parseInt(offset) + parseInt(limit)) });
});

app.post('/api/import/hospitals', (req, res) => {
  const { records } = req.body;
  DB.hospitals.push(...records);
  writeDB(DB);
  res.json({ imported: records.length, total: DB.hospitals.length });
});

app.post('/api/import/rhc', (req, res) => {
  const { records } = req.body;
  DB.rhc_facilities.push(...records);
  writeDB(DB);
  res.json({ imported: records.length, total: DB.rhc_facilities.length });
});

// ─── SERVE FRONTEND ────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ally BD App running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
