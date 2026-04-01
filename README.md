# Ally Psychiatry — BD Deal Tracker

A full-stack Business Development app for tracking hospital/RHC deal pipeline, scoring opportunities, and managing BD team members.

## Features

- **Dashboard** — Stats, stage breakdown, activity feed, top scored deals
- **Pipeline (Kanban)** — Visual kanban board across 6 deal stages
- **Opportunities** — Full CRUD table with filter by stage/state
- **Scorecard Builder** — 11-category deal scoring system (matches your existing BD Scorecard v.f.xlsx)
- **Hospital Reference** — Searchable national hospital database (5,400+ facilities)
- **RHC Reference** — Searchable national RHC database (5,400+ facilities)
- **Team Management** — BD team members with territory/role
- **Import** — CSV/XLSX import for Hospital and RHC national lists
- **Activity Log** — Track calls, meetings, proposals per opportunity
- **Persistent Storage** — SQLite on Render disk (survives deploys)

## Deploy to Render

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/YOUR_USERNAME/ally-bd-app.git
git push -u origin main
```

### Step 2: Create Render Service
1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Render auto-detects `render.yaml`
4. Click **Deploy**

### Step 3: Add Persistent Disk (IMPORTANT)
1. In your Render service → **Disks** tab
2. Add disk: Name `ally-bd-data`, Mount `/opt/render/project/data`, Size `1 GB`
3. Redeploy

### Environment Variables (auto-set via render.yaml)
- `DATA_DIR=/opt/render/project/data` — where SQLite DB is stored

## Local Development
```bash
npm install
npm start
# App runs on http://localhost:3000
```

## Import National Data
1. Go to **Import Data** page in the app
2. Upload `Hospital_National_List_2025.csv`
3. Upload `RHC_National_List_Q4_2025.xlsx`
4. Both load client-side and send to the server in 500-record chunks

## Scorecard Logic
Matches the Ally Psychiatry BD Scorecard v.f.xlsx exactly:
- 11 categories with Tier 1/2/3 scoring
- Tier 1 = 1pt × Weight, Tier 2 = 2pt × Weight, Tier 3 = 3pt × Weight
- Max score: 60 points
- Tier A: 75%+ | Tier B: 50–74% | Tier C: 25–49%

## Tech Stack
- **Backend**: Node.js + Express
- **Database**: SQLite via better-sqlite3 (persistent on Render disk)
- **Frontend**: Vanilla JS/HTML/CSS (no build step needed)
- **Brand**: Montserrat font, Ally Psychiatry color system
