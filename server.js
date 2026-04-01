const express = require('express');
const Database = require('better-sqlite3');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Persistent storage path for Render
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, 'ally_bd.db');
const db = new Database(DB_PATH);

// Enable WAL for better concurrency
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ─── SCHEMA ──────────────────────────────────────────────────────────────────
db.exec(`
  CREATE TABLE IF NOT EXISTS team_members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    title TEXT,
    email TEXT,
    phone TEXT,
    territory TEXT,
    role TEXT DEFAULT 'BD',
    notes TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS opportunities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT,
    source TEXT,
    stage TEXT DEFAULT 'Identified',
    assigned_to INTEGER,
    state TEXT,
    city TEXT,
    facility_type TEXT,
    npi TEXT,
    address TEXT,
    phone TEXT,
    top_line_revenue REAL,
    ebitda_dollars REAL,
    ebitda_pct REAL,
    score INTEGER DEFAULT 0,
    score_pct REAL DEFAULT 0,
    notes TEXT,
    status TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(assigned_to) REFERENCES team_members(id)
  );

  CREATE TABLE IF NOT EXISTS scorecard_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    tier INTEGER,
    weight INTEGER NOT NULL,
    score INTEGER DEFAULT 0,
    FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS pipeline_stages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER NOT NULL,
    stage TEXT NOT NULL,
    completed INTEGER DEFAULT 0,
    completed_at TEXT,
    notes TEXT,
    FOREIGN KEY(opportunity_id) REFERENCES opportunities(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS activity_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    opportunity_id INTEGER,
    team_member_id INTEGER,
    action TEXT NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY(opportunity_id) REFERENCES opportunities(id),
    FOREIGN KEY(team_member_id) REFERENCES team_members(id)
  );

  CREATE TABLE IF NOT EXISTS hospitals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    facility_id TEXT,
    facility_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    county TEXT,
    phone TEXT,
    hospital_type TEXT,
    ownership TEXT,
    emergency_services TEXT,
    overall_rating INTEGER
  );

  CREATE TABLE IF NOT EXISTS rhc_facilities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    enrollment_id TEXT,
    npi TEXT,
    ccn TEXT,
    organization_name TEXT,
    dba_name TEXT,
    address1 TEXT,
    address2 TEXT,
    city TEXT,
    state TEXT,
    zip TEXT,
    phone TEXT,
    provider_type TEXT,
    org_type TEXT,
    proprietary_nonprofit TEXT
  );
`);

// ─── SEED INITIAL DATA ────────────────────────────────────────────────────────
const teamCount = db.prepare('SELECT COUNT(*) as c FROM team_members').get();
if (teamCount.c === 0) {
  const insertMember = db.prepare(`
    INSERT INTO team_members (name, title, email, role, territory, active)
    VALUES (?, ?, ?, ?, ?, 1)
  `);
  insertMember.run('Dr. Chili', 'Chief Medical Officer', '', 'BD', 'Multi-State');
  insertMember.run('Chad', 'VP Business Development', '', 'BD', 'Multi-State');
  insertMember.run('Eric Worthan', 'COO', '', 'Leadership', 'All');
  insertMember.run('Charlie Tyson', 'CFO', '', 'Leadership', 'All');
}

const oppCount = db.prepare('SELECT COUNT(*) as c FROM opportunities').get();
if (oppCount.c === 0) {
  const insertOpp = db.prepare(`
    INSERT INTO opportunities (name, type, source, stage, state, city, notes, status, score, score_pct)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const opps = [
    ['Coosa Valley', 'Hospital', 'Current Book Expansion', 'Pro Forma/Proposal', 'AL', 'Sylacauga', 'CVMC looking to cutout Horizon as BH Mngt Co. Chad in active dialogue with COO and CFO.', '3/27 Contract in hand for service continuation, have RHC contract in hand, pro forma complete', 48, 0.80],
    ['CGH Medical Center (Illinois)', 'Hospital/Horizon', 'Referral', 'Pro Forma/Proposal', 'IL', 'Chicago', 'Chad sent proforma to Charlie for review', null, 0, 0],
    ['Brookwood Baptist - Intake', 'Hospital - Mgmt/SLA', 'Referral', 'Meeting', 'AL', 'Birmingham', 'Chad/Chili to meet to finalize proposal', null, 0, 0],
    ['McCalla', 'Sub - PHP', 'Referral', 'Meeting', 'AL', 'McCalla', 'Chad will share pricing with Mike at McCalla', null, 0, 0],
    ['WellStar', 'Health System', 'Outbound', 'Identified', 'GA', 'Atlanta', null, null, 0, 0],
    ['Pickens County', 'Rural Hospital', 'Outbound', 'Identified', 'AL', 'Pickens County', 'Chad will reach out to Chaim to review opportunity', null, 0, 0],
    ['Haleyville', 'Rural Hospital', 'Outbound', 'Identified', 'AL', 'Haleyville', null, null, 0, 0],
    ['Russellville', 'Rural Hospital', 'Outbound', 'Identified', 'AL', 'Russellville', null, null, 0, 0],
    ['Crenshaw Community Hospital', 'Hospital - SLA', 'Referral', 'Meeting', 'AL', 'Luverne', 'Chad will connect with Mitch on next steps with Judge Purdue', null, 0, 0],
    ['Geriatric Unit - Gallatin TN', 'Hospital', 'Outbound', 'Identified', 'TN', 'Gallatin', 'Gather more data on facility, Dr Chili to reach out', null, 0, 0],
    ['Covenant Health Knoxville', 'Hospital', 'Outbound', 'Identified', 'TN', 'Knoxville', 'Find contact to work through, Dr. Chili to reach out', null, 0, 0],
    ['Saginaw Michigan', 'Hospital/Horizon', 'Referral', 'Pro Forma/Proposal', 'MI', 'Saginaw', 'Proposal for full service only', null, 0, 0],
    ['Evolve MD', 'Practice', 'Paul', 'Identified', null, null, 'Chad connected with Paul, he wants a finders fee', null, 0, 0],
  ];

  const insertStages = db.prepare(`
    INSERT INTO pipeline_stages (opportunity_id, stage, completed)
    VALUES (?, ?, ?)
  `);

  const stages = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  const stageOrder = { 'Identified': 0, 'Contacted/Awareness': 1, 'Meeting': 2, 'Data Exchange': 3, 'Pro Forma/Proposal': 4, 'Close': 5 };

  for (const opp of opps) {
    const result = insertOpp.run(...opp);
    const oppId = result.lastInsertRowid;
    const currentStageIdx = stageOrder[opp[3]] ?? 0;
    for (let i = 0; i < stages.length; i++) {
      insertStages.run(oppId, stages[i], i <= currentStageIdx ? 1 : 0);
    }
  }
}

// ─── MIDDLEWARE ────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ─── API ROUTES ───────────────────────────────────────────────────────────────

// Team Members
app.get('/api/team', (req, res) => {
  const members = db.prepare('SELECT * FROM team_members ORDER BY name').all();
  res.json(members);
});

app.post('/api/team', (req, res) => {
  const { name, title, email, phone, territory, role, notes } = req.body;
  const result = db.prepare(`
    INSERT INTO team_members (name, title, email, phone, territory, role, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, title, email, phone, territory, role || 'BD', notes);
  res.json({ id: result.lastInsertRowid, ...req.body });
});

app.put('/api/team/:id', (req, res) => {
  const { name, title, email, phone, territory, role, notes, active } = req.body;
  db.prepare(`
    UPDATE team_members SET name=?, title=?, email=?, phone=?, territory=?, role=?, notes=?, active=?, updated_at=datetime('now')
    WHERE id=?
  `).run(name, title, email, phone, territory, role, notes, active ?? 1, req.params.id);
  res.json({ success: true });
});

app.delete('/api/team/:id', (req, res) => {
  db.prepare('UPDATE team_members SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Opportunities
app.get('/api/opportunities', (req, res) => {
  const opps = db.prepare(`
    SELECT o.*, t.name as assigned_name,
      (SELECT GROUP_CONCAT(stage || ':' || completed, '|') FROM pipeline_stages WHERE opportunity_id = o.id ORDER BY id) as stages_data
    FROM opportunities o
    LEFT JOIN team_members t ON o.assigned_to = t.id
    WHERE o.active = 1
    ORDER BY o.updated_at DESC
  `).all();
  res.json(opps);
});

app.get('/api/opportunities/:id', (req, res) => {
  const opp = db.prepare(`
    SELECT o.*, t.name as assigned_name
    FROM opportunities o
    LEFT JOIN team_members t ON o.assigned_to = t.id
    WHERE o.id = ?
  `).get(req.params.id);
  
  if (!opp) return res.status(404).json({ error: 'Not found' });
  
  opp.stages = db.prepare('SELECT * FROM pipeline_stages WHERE opportunity_id = ? ORDER BY id').all(req.params.id);
  opp.scorecard = db.prepare('SELECT * FROM scorecard_entries WHERE opportunity_id = ? ORDER BY id').all(req.params.id);
  opp.activity = db.prepare(`
    SELECT a.*, t.name as member_name FROM activity_log a
    LEFT JOIN team_members t ON a.team_member_id = t.id
    WHERE a.opportunity_id = ? ORDER BY a.created_at DESC LIMIT 20
  `).all(req.params.id);
  
  res.json(opp);
});

app.post('/api/opportunities', (req, res) => {
  const {
    name, type, source, stage, assigned_to, state, city,
    facility_type, npi, address, phone, top_line_revenue,
    ebitda_dollars, ebitda_pct, notes, status
  } = req.body;

  const result = db.prepare(`
    INSERT INTO opportunities (name, type, source, stage, assigned_to, state, city, facility_type, npi, address, phone, top_line_revenue, ebitda_dollars, ebitda_pct, notes, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, type, source, stage || 'Identified', assigned_to || null, state, city, facility_type, npi, address, phone, top_line_revenue, ebitda_dollars, ebitda_pct, notes, status);

  const oppId = result.lastInsertRowid;
  const stages = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  const stageOrder = { 'Identified': 0, 'Contacted/Awareness': 1, 'Meeting': 2, 'Data Exchange': 3, 'Pro Forma/Proposal': 4, 'Close': 5 };
  const currentIdx = stageOrder[stage] ?? 0;
  
  const insertStage = db.prepare('INSERT INTO pipeline_stages (opportunity_id, stage, completed) VALUES (?, ?, ?)');
  for (let i = 0; i < stages.length; i++) {
    insertStage.run(oppId, stages[i], i <= currentIdx ? 1 : 0);
  }

  res.json({ id: oppId, ...req.body });
});

app.put('/api/opportunities/:id', (req, res) => {
  const {
    name, type, source, stage, assigned_to, state, city,
    facility_type, npi, address, phone, top_line_revenue,
    ebitda_dollars, ebitda_pct, score, score_pct, notes, status, active
  } = req.body;

  db.prepare(`
    UPDATE opportunities SET 
      name=?, type=?, source=?, stage=?, assigned_to=?, state=?, city=?,
      facility_type=?, npi=?, address=?, phone=?, top_line_revenue=?,
      ebitda_dollars=?, ebitda_pct=?, score=?, score_pct=?, notes=?, status=?, active=?,
      updated_at=datetime('now')
    WHERE id=?
  `).run(
    name, type, source, stage, assigned_to || null, state, city,
    facility_type, npi, address, phone, top_line_revenue,
    ebitda_dollars, ebitda_pct, score || 0, score_pct || 0, notes, status, active ?? 1,
    req.params.id
  );

  res.json({ success: true });
});

app.delete('/api/opportunities/:id', (req, res) => {
  db.prepare('UPDATE opportunities SET active=0 WHERE id=?').run(req.params.id);
  res.json({ success: true });
});

// Stage updates
app.put('/api/opportunities/:id/stages', (req, res) => {
  const { stages } = req.body;
  const update = db.prepare('UPDATE pipeline_stages SET completed=?, completed_at=CASE WHEN ? = 1 THEN datetime(\'now\') ELSE NULL END WHERE opportunity_id=? AND stage=?');
  
  for (const [stageName, completed] of Object.entries(stages)) {
    update.run(completed ? 1 : 0, completed ? 1 : 0, req.params.id, stageName);
  }
  
  // Update the current stage on the opportunity
  const completedStages = Object.entries(stages).filter(([, v]) => v);
  const stageOrder = ['Identified', 'Contacted/Awareness', 'Meeting', 'Data Exchange', 'Pro Forma/Proposal', 'Close'];
  let currentStage = 'Identified';
  for (const s of stageOrder) {
    if (stages[s]) currentStage = s;
  }
  db.prepare('UPDATE opportunities SET stage=?, updated_at=datetime(\'now\') WHERE id=?').run(currentStage, req.params.id);
  
  res.json({ success: true });
});

// Scorecard
app.post('/api/opportunities/:id/scorecard', (req, res) => {
  const { entries } = req.body; // [{category, tier, weight, score}]
  
  db.prepare('DELETE FROM scorecard_entries WHERE opportunity_id = ?').run(req.params.id);
  
  const insert = db.prepare('INSERT INTO scorecard_entries (opportunity_id, category, tier, weight, score) VALUES (?, ?, ?, ?, ?)');
  let totalScore = 0;
  
  for (const e of entries) {
    const tierScore = e.tier ? e.tier : 0;
    const weighted = tierScore * e.weight;
    totalScore += weighted;
    insert.run(req.params.id, e.category, e.tier, e.weight, weighted);
  }
  
  const maxScore = 60;
  const pct = totalScore / maxScore;
  
  db.prepare('UPDATE opportunities SET score=?, score_pct=?, updated_at=datetime(\'now\') WHERE id=?').run(totalScore, pct, req.params.id);
  
  res.json({ score: totalScore, score_pct: pct });
});

// Activity Log
app.post('/api/activity', (req, res) => {
  const { opportunity_id, team_member_id, action, notes } = req.body;
  const result = db.prepare('INSERT INTO activity_log (opportunity_id, team_member_id, action, notes) VALUES (?, ?, ?, ?)').run(opportunity_id, team_member_id, action, notes);
  res.json({ id: result.lastInsertRowid });
});

// Hospital search
app.get('/api/hospitals', (req, res) => {
  const { q, state, type, limit = 50, offset = 0 } = req.query;
  
  const count = db.prepare('SELECT COUNT(*) as c FROM hospitals').get();
  if (count.c === 0) return res.json({ total: 0, results: [] });
  
  let where = ['1=1'];
  let params = [];
  
  if (q) {
    where.push('(facility_name LIKE ? OR city LIKE ? OR county LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (state) { where.push('state = ?'); params.push(state); }
  if (type) { where.push('hospital_type LIKE ?'); params.push(`%${type}%`); }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM hospitals WHERE ${where.join(' AND ')}`).get(...params).c;
  const results = db.prepare(`SELECT * FROM hospitals WHERE ${where.join(' AND ')} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  
  res.json({ total, results });
});

// RHC search
app.get('/api/rhc', (req, res) => {
  const { q, state, limit = 50, offset = 0 } = req.query;
  
  const count = db.prepare('SELECT COUNT(*) as c FROM rhc_facilities').get();
  if (count.c === 0) return res.json({ total: 0, results: [] });
  
  let where = ['1=1'];
  let params = [];
  
  if (q) {
    where.push('(organization_name LIKE ? OR dba_name LIKE ? OR city LIKE ?)');
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  if (state) { where.push('state = ?'); params.push(state); }
  
  const total = db.prepare(`SELECT COUNT(*) as c FROM rhc_facilities WHERE ${where.join(' AND ')}`).get(...params).c;
  const results = db.prepare(`SELECT * FROM rhc_facilities WHERE ${where.join(' AND ')} LIMIT ? OFFSET ?`).all(...params, parseInt(limit), parseInt(offset));
  
  res.json({ total, results });
});

// Bulk import hospitals
app.post('/api/import/hospitals', (req, res) => {
  const { records } = req.body;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO hospitals (facility_id, facility_name, address, city, state, zip, county, phone, hospital_type, ownership, emergency_services, overall_rating)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r.facility_id, r.facility_name, r.address, r.city, r.state, r.zip, r.county, r.phone, r.hospital_type, r.ownership, r.emergency_services, r.overall_rating);
  });
  
  insertMany(records);
  res.json({ imported: records.length });
});

// Bulk import RHC
app.post('/api/import/rhc', (req, res) => {
  const { records } = req.body;
  const insert = db.prepare(`
    INSERT OR IGNORE INTO rhc_facilities (enrollment_id, npi, ccn, organization_name, dba_name, address1, address2, city, state, zip, phone, provider_type, org_type, proprietary_nonprofit)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  
  const insertMany = db.transaction((rows) => {
    for (const r of rows) insert.run(r.enrollment_id, r.npi, r.ccn, r.organization_name, r.dba_name, r.address1, r.address2, r.city, r.state, r.zip, r.phone, r.provider_type, r.org_type, r.proprietary_nonprofit);
  });
  
  insertMany(records);
  res.json({ imported: records.length });
});

// Stats
app.get('/api/stats', (req, res) => {
  const totalOpps = db.prepare('SELECT COUNT(*) as c FROM opportunities WHERE active=1').get().c;
  const byStage = db.prepare('SELECT stage, COUNT(*) as c FROM opportunities WHERE active=1 GROUP BY stage').all();
  const avgScore = db.prepare('SELECT AVG(score_pct) as a FROM opportunities WHERE active=1 AND score > 0').get().a;
  const recentActivity = db.prepare(`
    SELECT a.*, o.name as opp_name, t.name as member_name 
    FROM activity_log a
    LEFT JOIN opportunities o ON a.opportunity_id = o.id
    LEFT JOIN team_members t ON a.team_member_id = t.id
    ORDER BY a.created_at DESC LIMIT 10
  `).all();
  
  res.json({ totalOpps, byStage, avgScore, recentActivity });
});

// Serve frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Ally BD App running on port ${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
