const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const https = require('https');

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

// ─── NPI PROXY ─────────────────────────────────────────────────────────────────
// Proxies requests to the CMS NPI Registry to avoid browser CORS issues
app.get('/api/npi-proxy', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || !targetUrl.startsWith('https://npiregistry.cms.hhs.gov/')) {
    return res.status(400).json({ error: 'Invalid URL' });
  }
  try {
    const data = await new Promise((resolve, reject) => {
      https.get(targetUrl, (response) => {
        let body = '';
        response.on('data', chunk => body += chunk);
        response.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('Invalid JSON from NPI registry')); }
        });
      }).on('error', reject);
    });
    res.json(data);
  } catch (e) {
    console.error('NPI proxy error:', e.message);
    res.status(502).json({ error: 'NPI registry lookup failed', detail: e.message });
  }
});

// ─── BD NOTE GENERATOR (AI-powered via Anthropic) ─────────────────────────────
app.post('/api/bd-note', async (req, res) => {
  const { provider } = req.body;
  if (!provider) return res.status(400).json({ error: 'No provider data' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.json({ note: 'BD Note generation requires ANTHROPIC_API_KEY environment variable to be set in Render.' });
  }

  const prompt = `You are a healthcare business development analyst for Ally Psychiatry, a multi-state outpatient behavioral health organization that acquires retiring solo and small-group psychiatric practices.

Analyze this provider as a potential acquisition/transition target:
- Name: ${provider.providerName}${provider.credential ? ', ' + provider.credential : ''}
- Practice/Org: ${provider.orgName || 'Solo listing (no group)'}
- Specialty: ${provider.specialty}
- Location: ${provider.city}, ${provider.state}
- NPI Enrollment Year: ${provider.enrollYear || 'Unknown'}
- Direct Phone: ${provider.phone || 'None on record'}
- Sourcing Score: ${provider.score}/100 (Tier ${provider.tier})
- Scoring factors: ${provider.scoringNotes.join('; ')}

Write a 2–3 sentence BD analyst note covering: (1) why this is or isn't a strong acquisition target, (2) one key risk or next validation step, (3) recommended first outreach approach. Be direct and specific. No filler phrases.`;

  try {
    const postData = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }]
    });

    const note = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': ANTHROPIC_API_KEY,
          'Content-Length': Buffer.byteLength(postData)
        }
      };
      const req = https.request(options, (resp) => {
        let body = '';
        resp.on('data', chunk => body += chunk);
        resp.on('end', () => {
          try {
            const data = JSON.parse(body);
            const text = data.content && data.content[0] && data.content[0].text;
            resolve(text || 'Analysis unavailable.');
          } catch (e) { reject(e); }
        });
      });
      req.on('error', reject);
      req.write(postData);
      req.end();
    });

    res.json({ note });
  } catch (e) {
    console.error('BD note error:', e.message);
    res.json({ note: 'Note generation failed. Verify ANTHROPIC_API_KEY is set in Render environment variables.' });
  }
});


// ─── CLAUDE WEB SEARCH ─────────────────────────────────────────────────────────
// Calls Anthropic API with web_search tool to find facility/employer/school targets
app.post('/api/web-search', async (req, res) => {
  const { query, location, category } = req.body;
  if (!query || !location) return res.status(400).json({ error: 'query and location required' });

  const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
  if (!ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not set in environment variables.' });
  }

  const prompt = `You are a healthcare business development researcher for Ally Psychiatry, a multi-state behavioral health organization.

Find a list of ${category} in ${location}. Search for: "${query} ${location}"

Return ONLY a valid JSON array — no markdown fences, no explanation text before or after, just the raw JSON array starting with [ and ending with ].

Each object in the array must have exactly these fields:
{
  "name": "organization name",
  "address": "street address or empty string",
  "city": "city name",
  "state": "2-letter state code",
  "phone": "phone number or empty string",
  "website": "website URL or empty string",
  "description": "one sentence about what this organization does",
  "source": "where you found this"
}

Return up to 20 real, verifiable organizations. Do not invent entries.`;

  try {
    const postData = JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{ role: 'user', content: prompt }]
    });

    const rawResponse = await new Promise((resolve, reject) => {
      const options = {
        hostname: 'api.anthropic.com',
        path: '/v1/messages',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'web-search-2025-03-05',
          'x-api-key': ANTHROPIC_API_KEY,
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const apiReq = https.request(options, (apiRes) => {
        let body = '';
        apiRes.on('data', chunk => body += chunk);
        apiRes.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch (e) { reject(new Error('Invalid JSON from Anthropic: ' + body.slice(0, 200))); }
        });
      });
      apiReq.on('error', reject);
      apiReq.write(postData);
      apiReq.end();
    });

    // Log stop reason for debugging
    console.log('Web search stop_reason:', rawResponse.stop_reason);
    console.log('Web search content blocks:', (rawResponse.content || []).map(b => b.type));

    // If Claude needs to continue (tool_use), we need to send follow-up messages
    // Handle multi-turn tool use cycle
    let finalText = '';
    let messages = [{ role: 'user', content: prompt }];
    let currentResponse = rawResponse;

    // Loop up to 5 times to handle tool use cycles
    for (let turn = 0; turn < 5; turn++) {
      const content = currentResponse.content || [];
      
      // Collect any text blocks
      const textBlocks = content.filter(b => b.type === 'text');
      if (textBlocks.length > 0) {
        finalText = textBlocks.map(b => b.text).join(' ');
      }

      // If stop reason is end_turn or no tool_use blocks, we're done
      const toolUseBlocks = content.filter(b => b.type === 'tool_use');
      if (currentResponse.stop_reason === 'end_turn' || toolUseBlocks.length === 0) {
        break;
      }

      // Add assistant response to messages
      messages.push({ role: 'assistant', content: content });

      // Add tool results for each tool_use block
      const toolResults = toolUseBlocks.map(block => ({
        type: 'tool_result',
        tool_use_id: block.id,
        content: block.input ? JSON.stringify(block.input) : ''
      }));
      messages.push({ role: 'user', content: toolResults });

      // Make follow-up request
      const followUpData = JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 4000,
        tools: [{ type: 'web_search_20250305', name: 'web_search' }],
        messages
      });

      currentResponse = await new Promise((resolve, reject) => {
        const options = {
          hostname: 'api.anthropic.com',
          path: '/v1/messages',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
            'anthropic-beta': 'web-search-2025-03-05',
            'x-api-key': ANTHROPIC_API_KEY,
            'Content-Length': Buffer.byteLength(followUpData)
          }
        };
        const req2 = https.request(options, (r2) => {
          let body = '';
          r2.on('data', chunk => body += chunk);
          r2.on('end', () => {
            try { resolve(JSON.parse(body)); }
            catch (e) { reject(new Error('Follow-up parse error: ' + body.slice(0, 200))); }
          });
        });
        req2.on('error', reject);
        req2.write(followUpData);
        req2.end();
      });

      console.log(`Turn ${turn + 1} stop_reason:`, currentResponse.stop_reason);
    }

    // Get final text from last response if not already captured
    if (!finalText) {
      const lastContent = currentResponse.content || [];
      finalText = lastContent.filter(b => b.type === 'text').map(b => b.text).join(' ');
    }

    console.log('Final text preview:', finalText.slice(0, 300));

    // Strip markdown fences if present
    let jsonText = finalText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    // Find the JSON array boundaries
    const arrStart = jsonText.indexOf('[');
    const arrEnd = jsonText.lastIndexOf(']');

    if (arrStart === -1 || arrEnd === -1 || arrEnd <= arrStart) {
      console.error('No JSON array found in response. Full text:', finalText.slice(0, 1000));
      return res.status(500).json({ 
        error: 'No results array found in response',
        preview: finalText.slice(0, 500)
      });
    }

    let results = [];
    try {
      results = JSON.parse(jsonText.slice(arrStart, arrEnd + 1));
    } catch (e) {
      console.error('JSON parse error:', e.message);
      return res.status(500).json({ 
        error: 'Failed to parse results: ' + e.message,
        preview: jsonText.slice(arrStart, arrStart + 500)
      });
    }

    res.json({ results, query: `${query} ${location}`, count: results.length });

  } catch (e) {
    console.error('Web search error:', e.message);
    res.status(502).json({ error: 'Search failed: ' + e.message });
  }
});

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
  if (!process.env.ANTHROPIC_API_KEY) {
    console.warn('⚠ ANTHROPIC_API_KEY not set — BD Note generation will be disabled');
  }
});
