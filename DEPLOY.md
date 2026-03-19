# KSUMC National CPG Authority Platform — Deployment Guide

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    GitHub Pages (Frontend)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Dashboard │ │GRADE     │ │Evidence  │ │AI Skills │      │
│  │          │ │Workflow  │ │Search    │ │Modules   │      │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────┘      │
│       └─────────────┴────────────┴─────────────┘            │
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌─────────────┐  ┌──────────────┐  ┌──────────────────┐
│  Supabase   │  │  PubMed API  │  │  Cochrane /      │
│  (Auth+DB)  │  │  (NCBI)      │  │  CrossRef APIs   │
│  FREE TIER  │  │  FREE        │  │  FREE            │
└─────────────┘  └──────────────┘  └──────────────────┘
```

---

## Phase 1: Deploy to GitHub Pages (5 minutes)

### Step 1: Create GitHub Repository

```bash
# Option A: Using GitHub CLI
gh repo create ksumc-cpg-platform --public --description "KSUMC National CPG Authority Platform"

# Option B: Go to https://github.com/new
# Name: ksumc-cpg-platform
# Visibility: Public (required for free GitHub Pages)
```

### Step 2: Push the Code

```bash
cd ksumc-cpg-platform

# Initialize git
git init
git add .
git commit -m "Initial deployment: KSUMC CPG Platform with AI skills"

# Push to GitHub
git remote add origin https://github.com/YOUR_USERNAME/ksumc-cpg-platform.git
git branch -M main
git push -u origin main
```

### Step 3: Enable GitHub Pages

1. Go to your repository on GitHub
2. Click **Settings** → **Pages** (left sidebar)
3. Under "Source", select **Deploy from a branch**
4. Branch: **main** / Folder: **/ (root)**
5. Click **Save**

Your site will be live at:
```
https://YOUR_USERNAME.github.io/ksumc-cpg-platform/
```

### Step 4: Custom Domain (Optional)

1. In **Settings → Pages**, enter your custom domain: `cpg.ksumc.edu.sa`
2. Add a CNAME record in your DNS:
   - Type: CNAME
   - Name: cpg
   - Value: YOUR_USERNAME.github.io
3. Check "Enforce HTTPS"

---

## Phase 2: Set Up Supabase Backend (15 minutes)

### Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) → Sign up (free)
2. Click **New Project**
   - Name: `ksumc-cpg-platform`
   - Database Password: (save this securely)
   - Region: Choose closest to Saudi Arabia (e.g., `eu-central-1` Frankfurt)
3. Wait for project to provision (~2 minutes)

### Step 2: Run Database Migrations

1. In Supabase Dashboard → **SQL Editor** → **New Query**
2. Copy the entire contents of `api/migrations.sql`
3. Click **Run** — this creates all 14 tables

### Step 3: Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** (already enabled by default)
3. Optional: Enable **Google** or **Microsoft** for SSO
4. Go to **Authentication** → **URL Configuration**
5. Set Site URL: `https://YOUR_USERNAME.github.io/ksumc-cpg-platform/`

### Step 4: Get Your API Keys

1. Go to **Settings** → **API**
2. Copy:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: `eyJhbGciOi...`
3. Open `js/supabase-auth.js` and replace:
   ```javascript
   const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
   const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';
   ```

### Step 5: Add Supabase JS Library

Add this script tag to `index.html` before the other JS files:
```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="js/supabase-auth.js"></script>
<script src="js/pubmed-api.js"></script>
```

---

## Phase 3: Enable Live PubMed API (5 minutes)

The PubMed API (NCBI E-Utilities) works immediately with no API key at 3 requests/second.

### For Higher Rate Limits (Optional):

1. Register at [https://www.ncbi.nlm.nih.gov/account/](https://www.ncbi.nlm.nih.gov/account/)
2. Go to **Settings** → **API Key Management** → Generate key
3. Open `js/pubmed-api.js` and set:
   ```javascript
   const NCBI_API_KEY = 'your_api_key_here';
   ```
4. This increases your rate limit to 10 requests/second

### Available API Functions:

```javascript
// Search PubMed
const results = await CPG_API.searchPubMed('diabetes GLP-1 receptor agonists RCT', 50);

// Get abstract
const abstract = await CPG_API.getPubMedAbstract('12345678');

// Find related articles
const related = await CPG_API.getRelatedArticles('12345678');

// DOI lookup via CrossRef
const metadata = await CPG_API.lookupDOI('10.1056/NEJMoa1603827');

// Auto-classify study design
const design = CPG_API.classifyStudyDesign(article);

// Auto-select RoB tool
const robTool = CPG_API.selectRoBTool('RCT'); // Returns: RoB 2

// Calculate GRADE certainty
const grade = CPG_API.calculateGradeCertainty({
  study_design: 'RCT',
  rob: 'serious',
  inconsistency: 'not_serious',
  indirectness: 'not_serious',
  imprecision: 'not_serious',
  pub_bias: 'undetected'
}); // Returns: { label: 'Moderate', symbol: '⊕⊕⊕◯' }
```

---

## Phase 4: Deploy Updates

After making changes, push to GitHub and it auto-deploys:

```bash
git add .
git commit -m "Update: added new guideline module"
git push
```

GitHub Pages automatically rebuilds within 1-2 minutes.

---

## File Structure

```
ksumc-cpg-platform/
├── index.html              ← Main platform (rename from ksumc_cpg_platform.html)
├── DEPLOY.md               ← This file
├── js/
│   ├── supabase-auth.js    ← Authentication + database layer
│   └── pubmed-api.js       ← PubMed, CrossRef, GRADE engine
├── api/
│   └── migrations.sql      ← Supabase database schema (14 tables)
└── css/
    └── (styles embedded in index.html)
```

---

## Database Schema Summary

| Table | Purpose | Records |
|-------|---------|---------|
| `profiles` | User accounts with roles (NSC → Public) | Users |
| `guidelines` | Core guideline entity, status tracking | Guidelines |
| `pico_questions` | PICO framework per clinical question | Questions |
| `evidence_searches` | Search strategies per database | Searches |
| `prisma_flow` | PRISMA flow diagram data | Per guideline |
| `included_studies` | Studies included in synthesis | Studies |
| `grade_profiles` | GRADE evidence profiles per outcome | Outcomes |
| `recommendations` | Final recommendations with EtR | Recs |
| `delphi_votes` | Modified Delphi consensus voting | Votes |
| `review_comments` | External + public review comments | Comments |
| `coi_declarations` | Conflict of interest declarations | COIs |
| `audit_log` | Full audit trail of all actions | Events |
| `agree_assessments` | AGREE II quality assessments | Assessments |
| `cea_models` | Cost-effectiveness analysis models | Models |

---

## Security Notes

- **Row Level Security (RLS)** is enabled on all sensitive tables
- NSC/TOC members can view audit logs; others cannot
- Guidelines are readable by all authenticated users
- Only authorized roles (GDG Chair+) can create/edit guidelines
- Public comments allow unauthenticated input during consultation
- COI declarations are only visible to Ethics Officer + the declaring user
- All Supabase data is encrypted at rest and in transit

---

## Cost

| Service | Tier | Cost |
|---------|------|------|
| GitHub Pages | Free | $0/month |
| Supabase | Free tier | $0/month (500MB DB, 50K auth users) |
| PubMed API | Free | $0 |
| CrossRef API | Free | $0 |
| **Total** | | **$0/month** |

For production scale (>50K users), Supabase Pro is $25/month.
