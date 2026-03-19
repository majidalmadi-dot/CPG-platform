/**
 * KSUMC CPG Platform — Supabase Authentication & Database Layer
 *
 * SETUP INSTRUCTIONS:
 * 1. Create a free account at https://supabase.com
 * 2. Create a new project (name: ksumc-cpg-platform)
 * 3. Replace SUPABASE_URL and SUPABASE_ANON_KEY below with your project credentials
 * 4. Run the SQL migrations in /api/migrations.sql in the Supabase SQL Editor
 * 5. Enable Email Auth in Authentication → Providers
 */

// ============================================================
// CONFIGURATION — Replace with your Supabase project credentials
// ============================================================
const SUPABASE_URL = 'https://ufxqmmhfskbvxitahovo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmeHFtbWhmc2tidnhpdGFob3ZvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MjI2MjAsImV4cCI6MjA4OTQ5ODYyMH0._MPRG11holiU2_-8VDWOh5TuM25pu-cXnkRyHiNZkqU';

// ============================================================
// Initialize Supabase Client
// ============================================================
let supabase = null;

function initSupabase() {
  if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('✅ Supabase initialized');
    return true;
  }
  console.warn('⚠️ Supabase JS library not loaded. Running in demo mode.');
  return false;
}

// ============================================================
// AUTHENTICATION
// ============================================================

// Role hierarchy for the platform
const ROLES = {
  'nsc_chair': { level: 1, label: 'Steering Committee Chair', permissions: ['all'] },
  'nsc_member': { level: 1, label: 'NSC Member', permissions: ['vote', 'endorse', 'view_all'] },
  'toc_lead': { level: 2, label: 'Technical Committee Lead', permissions: ['quality_gate', 'approve', 'view_all'] },
  'toc_member': { level: 2, label: 'TOC Member', permissions: ['review', 'quality_gate', 'view_all'] },
  'gdg_chair': { level: 3, label: 'GDG Chair', permissions: ['draft', 'edit', 'consensus', 'view_own'] },
  'gdg_member': { level: 3, label: 'GDG Panel Member', permissions: ['draft', 'vote', 'view_own'] },
  'ert_lead': { level: 4, label: 'Evidence Review Lead', permissions: ['search', 'extract', 'grade', 'view_own'] },
  'ert_member': { level: 4, label: 'Evidence Reviewer', permissions: ['search', 'screen', 'extract', 'view_own'] },
  'reviewer': { level: 5, label: 'External Reviewer', permissions: ['comment', 'view_assigned'] },
  'public': { level: 5, label: 'Public Consultation', permissions: ['comment', 'view_published'] }
};

async function signUp(email, password, fullName, role) {
  if (!supabase) return demoResponse('signup', { email, fullName, role });

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName, role: role, institution: 'KSUMC' }
    }
  });

  if (error) throw error;

  // Insert into profiles table
  if (data.user) {
    await supabase.from('profiles').insert({
      id: data.user.id,
      email: email,
      full_name: fullName,
      role: role,
      institution: 'KSUMC',
      coi_status: 'pending'
    });
  }

  return data;
}

async function signIn(email, password) {
  if (!supabase) return demoResponse('signin', { email });

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;

  // Fetch profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  return { ...data, profile };
}

async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
  window.location.reload();
}

async function getCurrentUser() {
  if (!supabase) return null;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return { ...user, profile };
}

function hasPermission(userRole, permission) {
  const role = ROLES[userRole];
  if (!role) return false;
  return role.permissions.includes('all') || role.permissions.includes(permission);
}

// ============================================================
// DATABASE OPERATIONS — Guidelines
// ============================================================

async function createGuideline(guidelineData) {
  if (!supabase) return demoResponse('create_guideline', guidelineData);

  const { data, error } = await supabase
    .from('guidelines')
    .insert(guidelineData)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getGuidelines(filters = {}) {
  if (!supabase) return demoGuidelines();

  let query = supabase.from('guidelines').select(`
    *,
    created_by:profiles!guidelines_created_by_fkey(full_name, role),
    gdg_chair:profiles!guidelines_gdg_chair_fkey(full_name)
  `);

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.specialty) query = query.eq('specialty', filters.specialty);
  if (filters.search) query = query.ilike('title', `%${filters.search}%`);

  const { data, error } = await query.order('updated_at', { ascending: false });
  if (error) throw error;
  return data;
}

async function updateGuidelineStage(guidelineId, newStage, notes) {
  if (!supabase) return demoResponse('update_stage', { guidelineId, newStage });

  const { data, error } = await supabase
    .from('guidelines')
    .update({
      current_stage: newStage,
      updated_at: new Date().toISOString(),
      stage_notes: notes
    })
    .eq('id', guidelineId)
    .select()
    .single();

  if (error) throw error;

  // Log stage transition
  await supabase.from('audit_log').insert({
    guideline_id: guidelineId,
    action: 'stage_change',
    details: { from_stage: null, to_stage: newStage, notes }
  });

  return data;
}

// ============================================================
// DATABASE OPERATIONS — GRADE Evidence Profiles
// ============================================================

async function saveGradeProfile(guidelineId, outcomeData) {
  if (!supabase) return demoResponse('save_grade', outcomeData);

  const { data, error } = await supabase
    .from('grade_profiles')
    .upsert({
      guideline_id: guidelineId,
      ...outcomeData,
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getGradeProfiles(guidelineId) {
  if (!supabase) return demoGradeProfiles();

  const { data, error } = await supabase
    .from('grade_profiles')
    .select('*')
    .eq('guideline_id', guidelineId)
    .order('outcome_importance', { ascending: true });

  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE OPERATIONS — COI Declarations
// ============================================================

async function submitCOI(userId, coiData) {
  if (!supabase) return demoResponse('submit_coi', coiData);

  const { data, error } = await supabase
    .from('coi_declarations')
    .insert({
      user_id: userId,
      ...coiData,
      status: 'pending_review'
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// ============================================================
// DATABASE OPERATIONS — Delphi Voting
// ============================================================

async function submitDelphiVote(recommendationId, userId, vote, comments) {
  if (!supabase) return demoResponse('delphi_vote', { vote });

  const { data, error } = await supabase
    .from('delphi_votes')
    .upsert({
      recommendation_id: recommendationId,
      user_id: userId,
      vote: vote, // 1-9 scale
      comments: comments,
      round: 1
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function getDelphiResults(recommendationId) {
  if (!supabase) return demoDelphiResults();

  const { data, error } = await supabase
    .from('delphi_votes')
    .select('vote, round')
    .eq('recommendation_id', recommendationId);

  if (error) throw error;

  // Calculate consensus
  const votes = data.map(d => d.vote);
  const median = votes.sort((a,b) => a-b)[Math.floor(votes.length/2)];
  const agree = votes.filter(v => v >= 7).length;
  const consensus = (agree / votes.length * 100).toFixed(0);

  return { votes: data, median, consensus: `${consensus}%`, totalVoters: votes.length };
}

// ============================================================
// REAL-TIME SUBSCRIPTIONS (Supabase Realtime)
// ============================================================

function subscribeToGuideline(guidelineId, callback) {
  if (!supabase) return null;

  return supabase
    .channel(`guideline-${guidelineId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'guidelines',
      filter: `id=eq.${guidelineId}`
    }, callback)
    .subscribe();
}

function subscribeToComments(guidelineId, callback) {
  if (!supabase) return null;

  return supabase
    .channel(`comments-${guidelineId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'review_comments',
      filter: `guideline_id=eq.${guidelineId}`
    }, callback)
    .subscribe();
}

// ============================================================
// DEMO MODE — Returns mock data when Supabase is not configured
// ============================================================

function demoResponse(action, data) {
  console.log(`[DEMO] ${action}:`, data);
  return { id: 'demo-' + Date.now(), ...data, demo: true };
}

function demoGuidelines() {
  return [
    { id: 1, title: 'Type 2 Diabetes — Adult Management', specialty: 'Endocrinology', status: 'published', current_stage: 10, version: 'v2.1', agree_score: 91, gin_score: '16/18', published_at: '2024-01-15' },
    { id: 2, title: 'Asthma Management — Adult', specialty: 'Pulmonology', status: 'in_development', current_stage: 5, version: 'v1.0', agree_score: null, gin_score: '12/18' },
    { id: 3, title: 'CRC National Screening Protocol', specialty: 'Oncology', status: 'under_review', current_stage: 7, version: 'v1.2', agree_score: 84, gin_score: '15/18', published_at: '2023-03-10' },
    { id: 4, title: 'NAFLD/NASH Clinical Pathway', specialty: 'Hepatology', status: 'public_comment', current_stage: 8, version: 'v1.0', agree_score: 88, gin_score: '17/18' },
    { id: 5, title: 'H. pylori Eradication', specialty: 'Gastroenterology', status: 'overdue', current_stage: 10, version: 'v1.1', agree_score: 72, gin_score: '11/18', published_at: '2022-06-01' }
  ];
}

function demoGradeProfiles() {
  return [
    { outcome: 'HbA1c reduction', importance: 'critical', studies: '8 RCTs (n=12,450)', rob: 'serious', inconsistency: 'not_serious', indirectness: 'not_serious', imprecision: 'not_serious', pub_bias: 'undetected', effect: 'MD −0.9% (−1.1, −0.7)', certainty: 'moderate' },
    { outcome: 'CV events (MACE)', importance: 'critical', studies: '4 RCTs (n=38,200)', rob: 'not_serious', inconsistency: 'not_serious', indirectness: 'not_serious', imprecision: 'not_serious', pub_bias: 'undetected', effect: 'RR 0.88 (0.82, 0.94)', certainty: 'high' }
  ];
}

function demoDelphiResults() {
  return { votes: [], median: 8, consensus: '89%', totalVoters: 12 };
}

// Auto-initialize on load
document.addEventListener('DOMContentLoaded', initSupabase);
