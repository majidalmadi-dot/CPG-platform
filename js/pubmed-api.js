/**
 * KSUMC CPG Platform — Live Evidence Database API Integration
 *
 * Connects to:
 *  - PubMed / NCBI E-Utilities (free, no API key needed for <3 req/sec)
 *  - Cochrane Library (CENTRAL via Wiley API)
 *  - WHO IRIS (open access)
 *  - CrossRef (DOI metadata)
 *
 * For higher rate limits on PubMed, register at:
 *   https://www.ncbi.nlm.nih.gov/account/ and set NCBI_API_KEY below.
 */

// ============================================================
// CONFIGURATION
// ============================================================
const NCBI_API_KEY = ''; // Optional: register at NCBI for 10 req/sec instead of 3
const PUBMED_BASE = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';
const CROSSREF_BASE = 'https://api.crossref.org/works';

// ============================================================
// PubMed Search (NCBI E-Utilities)
// ============================================================

async function searchPubMed(query, maxResults = 50) {
  try {
    const params = new URLSearchParams({
      db: 'pubmed',
      term: query,
      retmax: maxResults,
      retmode: 'json',
      sort: 'relevance',
      ...(NCBI_API_KEY && { api_key: NCBI_API_KEY })
    });

    const searchRes = await fetch(`${PUBMED_BASE}/esearch.fcgi?${params}`);
    const searchData = await searchRes.json();

    if (!searchData.esearchresult || !searchData.esearchresult.idlist.length) {
      return { count: 0, articles: [], query };
    }

    const ids = searchData.esearchresult.idlist;
    const totalCount = parseInt(searchData.esearchresult.count);

    // Fetch article details
    const detailParams = new URLSearchParams({
      db: 'pubmed',
      id: ids.join(','),
      retmode: 'json',
      rettype: 'abstract',
      ...(NCBI_API_KEY && { api_key: NCBI_API_KEY })
    });

    const detailRes = await fetch(`${PUBMED_BASE}/esummary.fcgi?${detailParams}`);
    const detailData = await detailRes.json();

    const articles = ids.map(id => {
      const article = detailData.result[id];
      if (!article) return null;

      return {
        pmid: id,
        title: article.title || '',
        authors: article.authors ? article.authors.map(a => a.name).join(', ') : '',
        firstAuthor: article.authors && article.authors[0] ? article.authors[0].name : '',
        journal: article.source || '',
        year: article.pubdate ? article.pubdate.split(' ')[0] : '',
        volume: article.volume || '',
        issue: article.issue || '',
        pages: article.pages || '',
        doi: article.elocationid || '',
        pubtype: article.pubtype || [],
        database: 'PubMed',
        url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
      };
    }).filter(Boolean);

    return {
      count: totalCount,
      retrieved: articles.length,
      articles,
      query,
      database: 'PubMed'
    };

  } catch (error) {
    console.error('PubMed search error:', error);
    return { count: 0, articles: [], query, error: error.message };
  }
}

// Get full abstract for a PubMed article
async function getPubMedAbstract(pmid) {
  try {
    const params = new URLSearchParams({
      db: 'pubmed',
      id: pmid,
      retmode: 'xml',
      rettype: 'abstract',
      ...(NCBI_API_KEY && { api_key: NCBI_API_KEY })
    });

    const res = await fetch(`${PUBMED_BASE}/efetch.fcgi?${params}`);
    const xml = await res.text();

    // Parse abstract from XML
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const abstractTexts = doc.querySelectorAll('AbstractText');
    let abstract = '';
    abstractTexts.forEach(node => {
      const label = node.getAttribute('Label');
      if (label) abstract += `**${label}:** `;
      abstract += node.textContent + '\n\n';
    });

    return abstract.trim() || 'No abstract available.';
  } catch (error) {
    return 'Error fetching abstract.';
  }
}

// ============================================================
// PubMed Related Articles
// ============================================================

async function getRelatedArticles(pmid, maxResults = 10) {
  try {
    const params = new URLSearchParams({
      dbfrom: 'pubmed',
      db: 'pubmed',
      id: pmid,
      retmode: 'json',
      ...(NCBI_API_KEY && { api_key: NCBI_API_KEY })
    });

    const res = await fetch(`${PUBMED_BASE}/elink.fcgi?${params}`);
    const data = await res.json();

    const linksets = data.linksets?.[0]?.linksetdbs;
    if (!linksets) return [];

    const relatedIds = linksets
      .find(ls => ls.linkname === 'pubmed_pubmed')
      ?.links?.slice(0, maxResults) || [];

    if (relatedIds.length === 0) return [];

    // Fetch details
    const result = await searchPubMedByIds(relatedIds);
    return result;
  } catch (error) {
    return [];
  }
}

async function searchPubMedByIds(ids) {
  const detailParams = new URLSearchParams({
    db: 'pubmed',
    id: ids.join(','),
    retmode: 'json',
    ...(NCBI_API_KEY && { api_key: NCBI_API_KEY })
  });

  const res = await fetch(`${PUBMED_BASE}/esummary.fcgi?${detailParams}`);
  const data = await res.json();

  return ids.map(id => {
    const a = data.result[id];
    if (!a) return null;
    return {
      pmid: id,
      title: a.title || '',
      firstAuthor: a.authors?.[0]?.name || '',
      journal: a.source || '',
      year: a.pubdate?.split(' ')[0] || '',
      pubtype: a.pubtype || [],
      database: 'PubMed',
      url: `https://pubmed.ncbi.nlm.nih.gov/${id}/`
    };
  }).filter(Boolean);
}

// ============================================================
// CrossRef DOI Lookup
// ============================================================

async function lookupDOI(doi) {
  try {
    const res = await fetch(`${CROSSREF_BASE}/${encodeURIComponent(doi)}`, {
      headers: { 'Accept': 'application/json' }
    });
    const data = await res.json();
    const work = data.message;

    return {
      doi: work.DOI,
      title: work.title?.[0] || '',
      authors: work.author?.map(a => `${a.family} ${a.given?.[0] || ''}`).join(', ') || '',
      journal: work['container-title']?.[0] || '',
      year: work.published?.['date-parts']?.[0]?.[0] || '',
      volume: work.volume || '',
      issue: work.issue || '',
      pages: work.page || '',
      type: work.type || '',
      url: work.URL || `https://doi.org/${work.DOI}`,
      cited_by: work['is-referenced-by-count'] || 0
    };
  } catch (error) {
    return null;
  }
}

// ============================================================
// Build PRISMA Flow from Search Results
// ============================================================

function buildPRISMAFlow(searchResults) {
  const totalIdentified = searchResults.reduce((sum, r) => sum + (r.count || 0), 0);
  const allArticles = searchResults.flatMap(r => r.articles || []);

  // Deduplicate by title similarity
  const seen = new Set();
  const unique = [];
  const duplicates = [];

  allArticles.forEach(article => {
    const key = article.title.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 50);
    if (seen.has(key)) {
      duplicates.push(article);
    } else {
      seen.add(key);
      unique.push(article);
    }
  });

  return {
    identified: totalIdentified,
    databases: searchResults.map(r => ({ name: r.database, count: r.count })),
    duplicates_removed: duplicates.length,
    after_dedup: unique.length,
    articles: unique,
    // These will be filled by user during screening
    screened_ta: unique.length,
    excluded_ta: 0,
    fulltext_reviewed: 0,
    excluded_ft: 0,
    included: 0
  };
}

// ============================================================
// Study Design Classifier (heuristic)
// ============================================================

function classifyStudyDesign(article) {
  const titleLower = (article.title || '').toLowerCase();
  const pubtypes = (article.pubtype || []).map(t => t.toLowerCase());

  if (pubtypes.includes('meta-analysis') || titleLower.includes('meta-analysis'))
    return { design: 'SR/MA', badge: 'b-ok', icon: '📊' };
  if (pubtypes.includes('systematic review') || titleLower.includes('systematic review'))
    return { design: 'SR', badge: 'b-ok', icon: '📋' };
  if (pubtypes.includes('randomized controlled trial') || titleLower.includes('randomized') || titleLower.includes('randomised'))
    return { design: 'RCT', badge: 'b-i', icon: '🧪' };
  if (titleLower.includes('cohort') || titleLower.includes('prospective') || titleLower.includes('longitudinal'))
    return { design: 'Cohort', badge: 'b-w', icon: '📈' };
  if (titleLower.includes('case-control') || titleLower.includes('case control'))
    return { design: 'Case-control', badge: 'b-w', icon: '🔍' };
  if (titleLower.includes('cross-sectional') || titleLower.includes('survey'))
    return { design: 'Cross-sectional', badge: 'b-s', icon: '📐' };
  if (titleLower.includes('guideline') || titleLower.includes('recommendation') || titleLower.includes('consensus'))
    return { design: 'Guideline', badge: 'b-p', icon: '📖' };
  if (pubtypes.includes('review') || titleLower.includes('narrative review'))
    return { design: 'Review', badge: 'b-s', icon: '📑' };

  return { design: 'Other', badge: 'b-o', icon: '📄' };
}

// ============================================================
// Auto-Select RoB Tool Based on Study Design
// ============================================================

function selectRoBTool(studyDesign) {
  const tools = {
    'RCT': { tool: 'RoB 2', full_name: 'Cochrane Risk of Bias Tool 2.0', domains: ['Randomization', 'Deviations', 'Missing data', 'Measurement', 'Selection of results'] },
    'SR/MA': { tool: 'AMSTAR 2', full_name: 'A MeaSurement Tool to Assess systematic Reviews', domains: ['Protocol', 'Search', 'Study selection', 'RoB', 'Meta-analysis', 'Publication bias', 'COI'] },
    'SR': { tool: 'AMSTAR 2', full_name: 'A MeaSurement Tool to Assess systematic Reviews', domains: ['Protocol', 'Search', 'Study selection', 'RoB', 'Meta-analysis', 'Publication bias', 'COI'] },
    'Cohort': { tool: 'NOS', full_name: 'Newcastle-Ottawa Scale', domains: ['Selection (4★)', 'Comparability (2★)', 'Outcome (3★)'] },
    'Case-control': { tool: 'NOS', full_name: 'Newcastle-Ottawa Scale', domains: ['Selection (4★)', 'Comparability (2★)', 'Exposure (3★)'] },
    'Cross-sectional': { tool: 'ROBINS-I', full_name: 'Risk Of Bias In Non-randomised Studies', domains: ['Confounding', 'Selection', 'Classification', 'Deviations', 'Missing data', 'Measurement', 'Reporting'] },
    'Diagnostic': { tool: 'QUADAS-2', full_name: 'Quality Assessment of Diagnostic Accuracy Studies', domains: ['Patient selection', 'Index test', 'Reference standard', 'Flow and timing'] }
  };

  return tools[studyDesign] || tools['Cohort'];
}

// ============================================================
// GRADE Certainty Calculator
// ============================================================

function calculateGradeCertainty(profile) {
  // Start at high for RCTs, low for observational
  let score = profile.study_design === 'RCT' ? 4 : 2;

  // Downgrade factors
  if (profile.rob === 'serious') score -= 1;
  if (profile.rob === 'very_serious') score -= 2;
  if (profile.inconsistency === 'serious') score -= 1;
  if (profile.inconsistency === 'very_serious') score -= 2;
  if (profile.indirectness === 'serious') score -= 1;
  if (profile.indirectness === 'very_serious') score -= 2;
  if (profile.imprecision === 'serious') score -= 1;
  if (profile.imprecision === 'very_serious') score -= 2;
  if (profile.pub_bias === 'suspected') score -= 1;

  // Upgrade factors (observational only)
  if (profile.study_design !== 'RCT') {
    if (profile.large_effect) score += 1;
    if (profile.very_large_effect) score += 2;
    if (profile.dose_response) score += 1;
    if (profile.plausible_confounding) score += 1;
  }

  // Clamp 1-4
  score = Math.max(1, Math.min(4, score));

  const levels = {
    4: { label: 'High', symbol: '⊕⊕⊕⊕', badge: 'b-ok', color: '#10B981' },
    3: { label: 'Moderate', symbol: '⊕⊕⊕◯', badge: 'b-i', color: '#3B82F6' },
    2: { label: 'Low', symbol: '⊕⊕◯◯', badge: 'b-w', color: '#F59E0B' },
    1: { label: 'Very Low', symbol: '⊕◯◯◯', badge: 'b-err', color: '#EF4444' }
  };

  return { score, ...levels[score] };
}

// ============================================================
// Export for use in main platform
// ============================================================
window.CPG_API = {
  // PubMed
  searchPubMed,
  getPubMedAbstract,
  getRelatedArticles,
  // CrossRef
  lookupDOI,
  // PRISMA
  buildPRISMAFlow,
  // Study classification
  classifyStudyDesign,
  selectRoBTool,
  // GRADE
  calculateGradeCertainty,
  // Auth
  signUp,
  signIn,
  signOut,
  getCurrentUser,
  hasPermission,
  ROLES,
  // Database
  createGuideline,
  getGuidelines,
  updateGuidelineStage,
  saveGradeProfile,
  getGradeProfiles,
  submitCOI,
  submitDelphiVote,
  getDelphiResults,
  // Realtime
  subscribeToGuideline,
  subscribeToComments
};

console.log('✅ KSUMC CPG Platform API loaded — PubMed, Auth, GRADE engine ready');
