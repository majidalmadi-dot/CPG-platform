-- ============================================================
-- KSUMC National CPG Authority Platform
-- Supabase PostgreSQL Database Schema
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. USER PROFILES & ROLES
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  full_name_ar TEXT, -- Arabic name
  role TEXT NOT NULL DEFAULT 'public' CHECK (role IN (
    'nsc_chair', 'nsc_member', 'toc_lead', 'toc_member',
    'gdg_chair', 'gdg_member', 'ert_lead', 'ert_member',
    'reviewer', 'public'
  )),
  institution TEXT DEFAULT 'KSUMC',
  department TEXT,
  specialty TEXT,
  phone TEXT,
  coi_status TEXT DEFAULT 'pending' CHECK (coi_status IN ('clear', 'pending', 'flagged', 'recused')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. GUIDELINES (Core entity)
-- ============================================================
CREATE TABLE IF NOT EXISTS guidelines (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id TEXT UNIQUE, -- e.g. KSUMC-CPG-2024-001
  title TEXT NOT NULL,
  title_ar TEXT, -- Arabic title
  specialty TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scoping' CHECK (status IN (
    'scoping', 'pico', 'searching', 'appraising', 'synthesizing',
    'etr', 'drafting', 'external_review', 'public_comment',
    'nsc_review', 'published', 'overdue', 'archived'
  )),
  current_stage INTEGER DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 10),
  pathway TEXT DEFAULT 'de_novo' CHECK (pathway IN ('de_novo', 'adapte', 'hybrid', 'rapid')),
  version TEXT DEFAULT 'v1.0',
  requesting_body TEXT,
  rationale TEXT,

  -- Key people
  created_by UUID REFERENCES profiles(id),
  gdg_chair UUID REFERENCES profiles(id),

  -- Quality scores
  agree_score NUMERIC(5,2),
  gin_score TEXT,
  grade_overall TEXT,

  -- Dates
  target_completion DATE,
  published_at DATE,
  review_due DATE,
  stage_notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 3. PICO QUESTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS pico_questions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  population TEXT NOT NULL,
  intervention TEXT NOT NULL,
  comparator TEXT NOT NULL,
  outcomes TEXT NOT NULL, -- JSON array with importance ranking
  setting TEXT,
  time_horizon TEXT,
  study_designs TEXT,
  saudi_context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 4. EVIDENCE SEARCHES
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  pico_id UUID REFERENCES pico_questions(id),
  database_name TEXT NOT NULL, -- PubMed, Cochrane, EMBASE, etc.
  search_strategy TEXT NOT NULL,
  date_searched DATE NOT NULL DEFAULT CURRENT_DATE,
  records_found INTEGER DEFAULT 0,
  searched_by UUID REFERENCES profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 5. PRISMA TRACKING
-- ============================================================
CREATE TABLE IF NOT EXISTS prisma_flow (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID UNIQUE REFERENCES guidelines(id) ON DELETE CASCADE,
  total_identified INTEGER DEFAULT 0,
  duplicates_removed INTEGER DEFAULT 0,
  screened_ta INTEGER DEFAULT 0,
  excluded_ta INTEGER DEFAULT 0,
  excluded_ta_reasons JSONB DEFAULT '{}',
  fulltext_reviewed INTEGER DEFAULT 0,
  excluded_ft INTEGER DEFAULT 0,
  excluded_ft_reasons JSONB DEFAULT '{}',
  included_qualitative INTEGER DEFAULT 0,
  included_quantitative INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 6. INCLUDED STUDIES
-- ============================================================
CREATE TABLE IF NOT EXISTS included_studies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  pmid TEXT,
  doi TEXT,
  title TEXT NOT NULL,
  authors TEXT,
  journal TEXT,
  year INTEGER,
  study_design TEXT, -- RCT, Cohort, Case-control, etc.
  sample_size INTEGER,
  population_desc TEXT,
  intervention_desc TEXT,
  comparator_desc TEXT,
  rob_tool TEXT, -- RoB2, ROBINS-I, NOS, QUADAS-2
  rob_overall TEXT CHECK (rob_overall IN ('low', 'some_concerns', 'high', NULL)),
  rob_domains JSONB DEFAULT '{}',
  extraction_data JSONB DEFAULT '{}',
  extracted_by UUID REFERENCES profiles(id),
  verified_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. GRADE EVIDENCE PROFILES
-- ============================================================
CREATE TABLE IF NOT EXISTS grade_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  pico_id UUID REFERENCES pico_questions(id),
  outcome_name TEXT NOT NULL,
  outcome_importance TEXT CHECK (outcome_importance IN ('critical', 'important', 'low')),
  num_studies INTEGER DEFAULT 0,
  total_participants INTEGER DEFAULT 0,
  study_design TEXT DEFAULT 'RCT',

  -- 5 GRADE domains (downgrade)
  risk_of_bias TEXT DEFAULT 'not_serious' CHECK (risk_of_bias IN ('not_serious', 'serious', 'very_serious')),
  inconsistency TEXT DEFAULT 'not_serious' CHECK (inconsistency IN ('not_serious', 'serious', 'very_serious')),
  indirectness TEXT DEFAULT 'not_serious' CHECK (indirectness IN ('not_serious', 'serious', 'very_serious')),
  imprecision TEXT DEFAULT 'not_serious' CHECK (imprecision IN ('not_serious', 'serious', 'very_serious')),
  publication_bias TEXT DEFAULT 'undetected' CHECK (publication_bias IN ('undetected', 'suspected')),

  -- Upgrade factors
  large_effect BOOLEAN DEFAULT false,
  very_large_effect BOOLEAN DEFAULT false,
  dose_response BOOLEAN DEFAULT false,
  plausible_confounding BOOLEAN DEFAULT false,

  -- Results
  effect_estimate TEXT, -- e.g. "MD −0.9% (−1.1, −0.7)"
  absolute_effect TEXT,
  certainty TEXT CHECK (certainty IN ('high', 'moderate', 'low', 'very_low')),
  certainty_symbol TEXT, -- ⊕⊕⊕⊕ etc.

  footnotes TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(guideline_id, outcome_name)
);

-- ============================================================
-- 8. RECOMMENDATIONS (from EtR Framework)
-- ============================================================
CREATE TABLE IF NOT EXISTS recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  recommendation_number TEXT NOT NULL, -- e.g. "1.1"
  text TEXT NOT NULL,
  text_ar TEXT, -- Arabic version
  strength TEXT CHECK (strength IN ('strong_for', 'conditional_for', 'conditional_against', 'strong_against')),
  certainty TEXT CHECK (certainty IN ('high', 'moderate', 'low', 'very_low')),

  -- EtR judgements (11 domains)
  etr_problem_priority TEXT,
  etr_desirable_effects TEXT,
  etr_undesirable_effects TEXT,
  etr_certainty TEXT,
  etr_values TEXT,
  etr_balance TEXT,
  etr_resources TEXT,
  etr_cost_effectiveness TEXT,
  etr_equity TEXT,
  etr_acceptability TEXT,
  etr_feasibility TEXT,

  -- Saudi context
  saudi_context_notes TEXT,

  -- Consensus
  delphi_round INTEGER DEFAULT 0,
  consensus_percentage NUMERIC(5,2),

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 9. DELPHI VOTING
-- ============================================================
CREATE TABLE IF NOT EXISTS delphi_votes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  recommendation_id UUID REFERENCES recommendations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id),
  round INTEGER NOT NULL DEFAULT 1,
  vote INTEGER NOT NULL CHECK (vote BETWEEN 1 AND 9), -- 1-3 disagree, 4-6 neutral, 7-9 agree
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(recommendation_id, user_id, round)
);

-- ============================================================
-- 10. REVIEW COMMENTS (External + Public)
-- ============================================================
CREATE TABLE IF NOT EXISTS review_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  recommendation_id UUID REFERENCES recommendations(id),
  commenter_id UUID REFERENCES profiles(id),
  commenter_name TEXT, -- For public comments without account
  commenter_email TEXT,
  commenter_affiliation TEXT,
  comment_type TEXT CHECK (comment_type IN ('peer_review', 'public', 'stakeholder', 'patient')),
  section TEXT,
  comment_text TEXT NOT NULL,
  response_text TEXT, -- GDG response
  response_action TEXT CHECK (response_action IN ('accepted', 'partially_accepted', 'noted', 'rejected')),
  responded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

-- ============================================================
-- 11. COI DECLARATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS coi_declarations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  guideline_id UUID REFERENCES guidelines(id),
  declaration_type TEXT NOT NULL, -- financial, intellectual, personal
  description TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('none', 'low', 'moderate', 'high')),
  action_taken TEXT,
  status TEXT DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'cleared', 'restricted', 'recused')),
  reviewed_by UUID REFERENCES profiles(id),
  declared_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

-- ============================================================
-- 12. AUDIT LOG
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id),
  user_id UUID REFERENCES profiles(id) DEFAULT auth.uid(),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 13. AGREE II ASSESSMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS agree_assessments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id) ON DELETE CASCADE,
  assessor_id UUID REFERENCES profiles(id),
  -- 6 domains, each scored 1-7 per item
  domain1_scope JSONB DEFAULT '{}',     -- items 1-3
  domain2_stakeholder JSONB DEFAULT '{}', -- items 4-6
  domain3_rigour JSONB DEFAULT '{}',     -- items 7-14
  domain4_clarity JSONB DEFAULT '{}',    -- items 15-17
  domain5_applicability JSONB DEFAULT '{}', -- items 18-21
  domain6_independence JSONB DEFAULT '{}', -- items 22-23
  overall_score NUMERIC(5,2),
  rigour_score NUMERIC(5,2), -- Critical gate: must be ≥70%
  recommend TEXT CHECK (recommend IN ('yes', 'yes_with_modifications', 'no')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 14. CEA MODELS (Cost-Effectiveness)
-- ============================================================
CREATE TABLE IF NOT EXISTS cea_models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guideline_id UUID REFERENCES guidelines(id),
  recommendation_id UUID REFERENCES recommendations(id),
  title TEXT NOT NULL,
  eval_type TEXT CHECK (eval_type IN ('CUA', 'CEA', 'CBA', 'BIA')),
  model_type TEXT CHECK (model_type IN ('decision_tree', 'markov', 'partsa', 'microsim')),
  perspective TEXT,
  time_horizon TEXT,
  discount_rate NUMERIC(4,2) DEFAULT 3.5,
  currency TEXT DEFAULT 'SAR',
  intervention TEXT,
  comparator TEXT,
  icer NUMERIC(12,2),
  icer_unit TEXT DEFAULT 'SAR/QALY',
  wtp_threshold NUMERIC(12,2),
  conclusion TEXT,
  model_data JSONB DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guidelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE grade_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE coi_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Profiles: users can read all, update own
CREATE POLICY "Profiles readable by all authenticated"
  ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated USING (id = auth.uid());

-- Guidelines: readable by all authenticated, writable by GDG+ roles
CREATE POLICY "Guidelines readable by all authenticated"
  ON guidelines FOR SELECT TO authenticated USING (true);
CREATE POLICY "Guidelines writable by authorized roles"
  ON guidelines FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('nsc_chair', 'nsc_member', 'toc_lead', 'toc_member', 'gdg_chair'))
  );

-- Comments: anyone can read, anyone can insert (public consultation)
CREATE POLICY "Comments readable by all"
  ON review_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anyone can submit comments"
  ON review_comments FOR INSERT TO authenticated WITH CHECK (true);

-- Audit: readable by NSC/TOC only
CREATE POLICY "Audit readable by leadership"
  ON audit_log FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
      AND role IN ('nsc_chair', 'nsc_member', 'toc_lead', 'toc_member'))
  );

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_guidelines_status ON guidelines(status);
CREATE INDEX idx_guidelines_specialty ON guidelines(specialty);
CREATE INDEX idx_grade_guideline ON grade_profiles(guideline_id);
CREATE INDEX idx_studies_guideline ON included_studies(guideline_id);
CREATE INDEX idx_recommendations_guideline ON recommendations(guideline_id);
CREATE INDEX idx_votes_recommendation ON delphi_votes(recommendation_id);
CREATE INDEX idx_comments_guideline ON review_comments(guideline_id);
CREATE INDEX idx_audit_guideline ON audit_log(guideline_id);
CREATE INDEX idx_coi_user ON coi_declarations(user_id);

-- ============================================================
-- DONE! Your KSUMC CPG Platform database is ready.
-- ============================================================
