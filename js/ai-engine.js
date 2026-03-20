// ============================================================
// KSUMC CPG PLATFORM — LIVE AI ENGINE (Google Gemini)
// ============================================================
// Provides real AI-powered analysis for all 48 tools across
// SR/MA, CEA, and Health Policy Scanner workflows.
// Uses Google Gemini API (free tier: 15 RPM).
// API key stored persistently in localStorage with basic obfuscation.
// ============================================================

(function() {
'use strict';

// ---- API KEY MANAGEMENT ----
var KEY_STORAGE = 'ksumc_ai_key';
var MODEL_STORAGE = 'ksumc_ai_model';

function _obfuscate(str) {
  return btoa(str.split('').reverse().join(''));
}
function _deobfuscate(str) {
  try { return atob(str).split('').reverse().join(''); } catch(e) { return ''; }
}

// Hardwired API key (fallback if no user-set key)
var _HW = _obfuscate('AIzaSyBE_smT5wfFYR2baZetJ8FEqZ009p_Xz9g');

window.AIEngine = {
  getKey: function() {
    var stored = localStorage.getItem(KEY_STORAGE);
    if (stored) return _deobfuscate(stored);
    // Fallback to hardwired key
    return _deobfuscate(_HW);
  },
  setKey: function(key) {
    if (key) localStorage.setItem(KEY_STORAGE, _obfuscate(key));
    else localStorage.removeItem(KEY_STORAGE);
  },
  getModel: function() {
    return localStorage.getItem(MODEL_STORAGE) || 'gemini-2.0-flash';
  },
  setModel: function(m) {
    localStorage.setItem(MODEL_STORAGE, m);
  },
  hasKey: function() {
    return !!this.getKey();
  }
};

// ---- SETTINGS MODAL ----
window.openAISettings = function() {
  var existing = document.getElementById('ai-settings-modal');
  if (existing) existing.remove();

  var currentKey = AIEngine.getKey();
  var masked = currentKey ? currentKey.substring(0, 10) + '...' + currentKey.slice(-6) : '';
  var currentModel = AIEngine.getModel();

  var modal = document.createElement('div');
  modal.id = 'ai-settings-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', 'AI Engine Settings');

  modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;max-width:520px;width:95%;border-top:4px solid var(--ai1)">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">' +
    '<h3 style="margin:0;font-size:18px">⚙️ AI Engine Settings</h3>' +
    '<button class="btn btn-sm" onclick="this.closest(\'[role=dialog]\').remove()">✕</button></div>' +

    '<div style="margin-bottom:16px">' +
    '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Google Gemini API Key</label>' +
    '<div style="font-size:11px;color:#64748B;margin-bottom:6px">Your key is stored locally on this device and sent only to the Google AI API. Get your free key at <a href="https://aistudio.google.com/apikey" target="_blank" style="color:var(--ai1)">aistudio.google.com/apikey</a></div>' +
    '<input id="ai-key-input" type="password" placeholder="AIza..." value="' + (currentKey || '') + '" style="width:100%;padding:10px 12px;border:1px solid var(--b);border-radius:8px;font-size:13px;font-family:monospace">' +
    (currentKey ? '<div style="margin-top:4px;font-size:11px;color:var(--ok)">✅ Key configured: ' + masked + '</div>' : '<div style="margin-top:4px;font-size:11px;color:var(--warn)">⚠️ No API key set — AI tools will show simulated output</div>') +
    '</div>' +

    '<div style="margin-bottom:16px">' +
    '<label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px">Model</label>' +
    '<select id="ai-model-select" style="width:100%;padding:10px 12px;border:1px solid var(--b);border-radius:8px;font-size:13px">' +
    '<option value="gemini-2.0-flash"' + (currentModel === 'gemini-2.0-flash' ? ' selected' : '') + '>Gemini 2.0 Flash (Recommended — fast + free)</option>' +
    '<option value="gemini-2.5-flash-preview-05-20"' + (currentModel === 'gemini-2.5-flash-preview-05-20' ? ' selected' : '') + '>Gemini 2.5 Flash (Latest — most capable)</option>' +
    '<option value="gemini-2.0-flash-lite"' + (currentModel === 'gemini-2.0-flash-lite' ? ' selected' : '') + '>Gemini 2.0 Flash-Lite (Fastest — lightest)</option>' +
    '</select></div>' +

    '<div style="margin-bottom:18px;padding:12px;background:#F8FAFC;border-radius:8px;font-size:11px;color:#64748B">' +
    '<strong>How it works:</strong> Each AI tool sends a domain-specific prompt to Gemini with context from your current workflow. Results stream in real-time. The free tier supports 15 requests per minute. Your API key never leaves your browser except to call the Google AI API directly.' +
    '</div>' +

    '<div style="display:flex;gap:8px;justify-content:flex-end">' +
    '<button class="btn btn-o" onclick="AIEngine.setKey(\'\');this.closest(\'[role=dialog]\').remove();showToast(\'API key removed\',\'warn\')">Clear Key</button>' +
    '<button class="btn btn-p" onclick="saveAISettings()">Save Settings</button>' +
    '</div></div>';

  document.body.appendChild(modal);
  trapFocus(modal);
};

window.saveAISettings = function() {
  var key = document.getElementById('ai-key-input').value.trim();
  var model = document.getElementById('ai-model-select').value;
  AIEngine.setKey(key);
  AIEngine.setModel(model);
  document.getElementById('ai-settings-modal').remove();

  // Update demo banner
  var banner = document.querySelector('.demo-banner');
  if (banner) {
    if (key) {
      banner.innerHTML = '🟢 <strong>AI Engine Live</strong> — Connected to Gemini (' + model + '). All 48 tools are active. Free tier.';
      banner.style.background = 'linear-gradient(90deg, #D1FAE5, #A7F3D0)';
      banner.style.color = '#065F46';
      banner.style.borderColor = '#10B981';
    } else {
      banner.innerHTML = '⚠️ <strong>Prototype Mode</strong> — AI tools display simulated outputs for demonstration purposes. Connect to backend services for live analysis.';
      banner.style.background = 'linear-gradient(90deg, #FEF3C7, #FDE68A)';
      banner.style.color = '#92400E';
      banner.style.borderColor = '#F59E0B';
    }
  }

  showToast(key ? 'AI Engine connected — all tools are live!' : 'AI settings saved (no key)', key ? 'ok' : 'info');
};

// ---- CALL GEMINI API (with streaming) ----
window.callGemini = async function(systemPrompt, userMessage, onChunk, onDone, onError) {
  var key = AIEngine.getKey();
  if (!key) {
    if (onError) onError('NO_KEY');
    return;
  }

  var model = AIEngine.getModel();
  var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':streamGenerateContent?alt=sse&key=' + key;

  var body = {
    system_instruction: {
      parts: [{ text: systemPrompt }]
    },
    contents: [{
      role: 'user',
      parts: [{ text: userMessage }]
    }],
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7
    }
  };

  try {
    var resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!resp.ok) {
      var errBody = await resp.text();
      try { errBody = JSON.parse(errBody).error.message; } catch(e) {}
      if (onError) onError(resp.status === 400 && errBody.indexOf('API key') !== -1 ? 'INVALID_KEY' : 'API_ERROR: ' + errBody);
      return;
    }

    var reader = resp.body.getReader();
    var decoder = new TextDecoder();
    var fullText = '';
    var buffer = '';

    while (true) {
      var result = await reader.read();
      if (result.done) break;

      buffer += decoder.decode(result.value, { stream: true });
      var lines = buffer.split('\n');
      buffer = lines.pop(); // keep incomplete line

      for (var i = 0; i < lines.length; i++) {
        var line = lines[i].trim();
        if (!line.startsWith('data: ')) continue;
        var data = line.substring(6);
        if (data === '[DONE]' || !data) continue;

        try {
          var evt = JSON.parse(data);
          // Gemini streams candidates[0].content.parts[0].text
          if (evt.candidates && evt.candidates[0] && evt.candidates[0].content && evt.candidates[0].content.parts) {
            var parts = evt.candidates[0].content.parts;
            for (var j = 0; j < parts.length; j++) {
              if (parts[j].text) {
                fullText += parts[j].text;
                if (onChunk) onChunk(parts[j].text, fullText);
              }
            }
          }
        } catch(e) {}
      }
    }

    if (onDone) onDone(fullText);
  } catch(err) {
    if (onError) onError('NETWORK: ' + err.message);
  }
};

// ---- CONTEXT EXTRACTION FROM CURRENT WORKFLOW ----
window.extractWorkflowContext = function(domain) {
  var ctx = {};

  if (domain === 'SR/MA') {
    // Get PICO inputs
    var picoFields = document.querySelectorAll('#p-ai_srma input, #p-ai_srma textarea, #p-ai_srma select');
    picoFields.forEach(function(f) {
      var label = f.placeholder || f.getAttribute('aria-label') || f.name || '';
      if (f.value && f.value.trim()) ctx[label] = f.value.trim();
    });
    // Get active stage
    var activeStage = document.querySelector('#p-ai_srma .srma-stage[style*="display: block"], #p-ai_srma .srma-stage[style*="display:block"]');
    if (activeStage) ctx._stage = activeStage.id;
    // Get SR/MA project table data
    var rows = document.querySelectorAll('#p-ai_srma table tr');
    if (rows.length > 1) {
      ctx._projects = [];
      rows.forEach(function(r, i) {
        if (i === 0) return;
        var cells = r.querySelectorAll('td');
        if (cells.length >= 2) ctx._projects.push(cells[0].textContent.trim());
      });
    }
  }

  if (domain === 'CEA') {
    var ceaFields = document.querySelectorAll('#p-ai_cea input, #p-ai_cea textarea, #p-ai_cea select');
    ceaFields.forEach(function(f) {
      var label = f.placeholder || f.getAttribute('aria-label') || f.name || '';
      if (f.value && f.value.trim()) ctx[label] = f.value.trim();
    });
    var activeStage = document.querySelector('#p-ai_cea .cea-stage[style*="display: block"], #p-ai_cea .cea-stage[style*="display:block"]');
    if (activeStage) ctx._stage = activeStage.id;
  }

  if (domain === 'Health Policy') {
    var hpsFields = document.querySelectorAll('#p-ai_hps input, #p-ai_hps textarea, #p-ai_hps select');
    hpsFields.forEach(function(f) {
      var label = f.placeholder || f.getAttribute('aria-label') || f.name || '';
      if (f.value && f.value.trim()) ctx[label] = f.value.trim();
    });
    var activeStage = document.querySelector('#p-ai_hps .hps-stage[style*="display: block"], #p-ai_hps .hps-stage[style*="display:block"]');
    if (activeStage) ctx._stage = activeStage.id;
  }

  // Get active GRADE project if any
  var activeProj = localStorage.getItem('ksumc_active_project');
  if (activeProj) {
    try {
      var projects = JSON.parse(localStorage.getItem('ksumc_projects') || '[]');
      var proj = projects.find(function(p) { return p.id === activeProj; });
      if (proj) {
        ctx._project = { title: proj.title, picos: proj.picos, stage: proj.stage };
      }
    } catch(e) {}
  }

  return ctx;
};

// ---- SYSTEM PROMPTS FOR ALL 48 TOOLS ----
var PROMPTS = {};

// ===== SR/MA PROMPTS (21 tools) =====
PROMPTS['SR/MA'] = {
  pico: {
    system: "You are an expert systematic review methodologist specializing in PICO (Population, Intervention, Comparison, Outcome) framework refinement. You help researchers formulate precise, searchable clinical questions. For each PICO component, suggest MeSH terms, free-text synonyms, related concepts, and Boolean operators. Output in a structured format with clear headings.",
    buildPrompt: function(ctx) {
      var p = 'Refine the following PICO question and expand MeSH terms for a systematic review search:\n\n';
      if (ctx._project && ctx._project.picos) {
        ctx._project.picos.forEach(function(pico) {
          p += 'Population: ' + (pico.p || 'Not specified') + '\n';
          p += 'Intervention: ' + (pico.i || 'Not specified') + '\n';
          p += 'Comparison: ' + (pico.c || 'Not specified') + '\n';
          p += 'Outcome: ' + (pico.o || 'Not specified') + '\n\n';
        });
      }
      Object.keys(ctx).forEach(function(k) { if (!k.startsWith('_') && ctx[k]) p += k + ': ' + ctx[k] + '\n'; });
      if (p.trim().endsWith(':\n\n')) p += 'Please provide a general example PICO refinement for a clinical systematic review, demonstrating MeSH terms for each component.\n';
      return p;
    }
  },
  register: {
    system: "You are an expert in systematic review registration. Generate a complete PROSPERO registration form draft. Include: review title, anticipated start/end dates, stage of review, named contact, organisational affiliation, review question in PICO format, searches (databases, date limits, language), condition/domain, participants, intervention, comparator, types of study, context, main outcomes, additional outcomes, data extraction, risk of bias assessment, strategy for data synthesis, analysis of subgroups, dissemination plans. Use formal academic language.",
    buildPrompt: function(ctx) {
      return 'Draft a PROSPERO registration based on this review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  protocol: {
    system: "You are an expert systematic review methodologist. Draft a complete systematic review protocol following PRISMA-P 2015 guidelines with all 17 required items. Include: administrative information, introduction (rationale, objectives), methods (eligibility criteria, information sources, search strategy, study selection, data collection, risk of bias, data synthesis, meta-bias, confidence in evidence). Use formal academic language suitable for journal submission.",
    buildPrompt: function(ctx) {
      return 'Draft a PRISMA-P 2015 compliant protocol for this systematic review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  eligibility: {
    system: "You are a systematic review methodologist. Create a structured eligibility criteria table for study inclusion/exclusion. Include columns for: Criterion, Inclusion, Exclusion. Cover: Population, Intervention, Comparator, Outcome, Study Design, Setting, Date range, Language, Publication type. Format as a clear markdown table.",
    buildPrompt: function(ctx) {
      return 'Create eligibility criteria for this systematic review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  mesh: {
    system: "You are a medical librarian expert in MeSH (Medical Subject Headings) and database search strategy. For each concept provided, output: the primary MeSH heading, MeSH tree number, exploded subheadings, entry terms, free-text synonyms, and suggested Boolean search syntax for PubMed, Embase, and Cochrane CENTRAL. Format clearly with markdown headings for each concept.",
    buildPrompt: function(ctx) {
      var terms = [];
      Object.keys(ctx).forEach(function(k) { if (!k.startsWith('_') && ctx[k]) terms.push(ctx[k]); });
      if (ctx._project && ctx._project.picos) {
        ctx._project.picos.forEach(function(pico) {
          if (pico.p) terms.push('Population: ' + pico.p);
          if (pico.i) terms.push('Intervention: ' + pico.i);
        });
      }
      return 'Expand MeSH terms and generate multi-database search syntax for:\n\n' + (terms.length ? terms.join('\n') : 'Please provide a demonstration with a common clinical topic (e.g., SGLT2 inhibitors in type 2 diabetes).');
    }
  },
  pubmed: {
    system: "You are a medical librarian expert. Given a search strategy, translate it into optimized PubMed syntax with [MeSH Terms], [tw], [tiab] tags. Estimate expected yield based on strategy complexity. Identify potential issues (over-sensitive, too narrow). Suggest refinements. Also provide the strategy adapted for Embase and Cochrane CENTRAL.",
    buildPrompt: function(ctx) {
      var strategy = '';
      Object.keys(ctx).forEach(function(k) { if (!k.startsWith('_') && ctx[k]) strategy += ctx[k] + '\n'; });
      return 'Optimize this PubMed search strategy and estimate yield:\n\n' + (strategy || 'Generate a sample optimized PubMed search strategy for a common clinical question.');
    }
  },
  press: {
    system: "You are a peer reviewer of electronic search strategies using the PRESS (Peer Review of Electronic Search Strategies) 2015 Evidence-Based Checklist. Evaluate the search strategy against all PRESS domains: translation of research question, Boolean/proximity operators, subject headings, text word searching, spelling/syntax/line numbers, limits/filters. Provide specific recommendations for each domain. Rate overall quality.",
    buildPrompt: function(ctx) {
      return 'Perform a PRESS peer review on this search strategy:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  screen: {
    system: "You are an AI screening assistant for systematic reviews. Given eligibility criteria and a study title/abstract, classify as: INCLUDE (clearly meets criteria), EXCLUDE (clearly does not meet, state reason), or UNCERTAIN (needs human review). Maintain high sensitivity (>95%). Provide brief rationale for each decision. If no specific studies are provided, demonstrate the screening logic with example abstracts.",
    buildPrompt: function(ctx) {
      return 'Apply these eligibility criteria to screen the following:\n\n' + JSON.stringify(ctx, null, 2) + '\n\nIf no abstracts are available, demonstrate the screening approach with 3 example abstracts.';
    }
  },
  dedup: {
    system: "You are an expert in reference management and deduplication for systematic reviews. Explain and implement a multi-pass deduplication strategy using: exact DOI matching, exact PMID matching, fuzzy title matching (Levenshtein distance), author-year matching, and preprint-journal pair detection. Provide statistics on expected duplicate rates across databases.",
    buildPrompt: function(ctx) {
      return 'Design a deduplication strategy for this review across these databases:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  fulltext: {
    system: "You are a systematic review methodologist expert in full-text assessment. For each study, document: inclusion/exclusion decision, specific exclusion reason coded per PRISMA 2020 taxonomy (wrong population, wrong intervention, wrong comparator, wrong outcome, wrong study design, wrong setting, duplicate, unavailable). Format as a structured table.",
    buildPrompt: function(ctx) {
      return 'Design a full-text assessment form and exclusion reason taxonomy for:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  rob: {
    system: "You are an expert in risk of bias assessment. For RCTs, use RoB 2 tool (Cochrane) domains: randomization process, deviations from intended interventions, missing outcome data, measurement of outcome, selection of reported result. For non-randomized studies, use ROBINS-I domains. Provide domain-level judgements (low/some concerns/high) with support statements. Output as a structured assessment table.",
    buildPrompt: function(ctx) {
      return 'Create a risk of bias assessment framework for this review. Include worked examples:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  robnarrative: {
    system: "You are a systematic review methodologist. Write a publication-ready narrative description of risk of bias findings. Summarize by domain, highlight problematic studies, describe overall risk profile, and state implications for confidence in results. Use formal academic language suitable for the Results section of a journal manuscript.",
    buildPrompt: function(ctx) {
      return 'Write a narrative risk of bias synthesis for this review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  sensitivity: {
    system: "You are a meta-analysis statistician. Plan and describe sensitivity analyses: (1) excluding high risk-of-bias studies, (2) excluding outliers (identified by leave-one-out), (3) varying correlation assumptions, (4) fixed vs random effects comparison, (5) influence diagnostics. For each, describe rationale, method, expected impact, and interpretation guidelines.",
    buildPrompt: function(ctx) {
      return 'Plan sensitivity analyses for this meta-analysis:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  extract: {
    system: "You are a data extraction specialist for systematic reviews. Design a comprehensive data extraction form. Include fields for: study identification, methods, participants (demographics, sample size), intervention details (dose, duration, frequency), comparator, outcomes (definition, measurement tool, timepoints), results (effect estimates, CIs, p-values, raw data), risk of bias, and funding. Format as a structured template.",
    buildPrompt: function(ctx) {
      return 'Design a data extraction form for this systematic review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  convert: {
    system: "You are a biostatistician specializing in meta-analysis data preparation. Explain methods to convert reported statistics: median/IQR to mean/SD (Wan 2014, Luo 2018, Shi 2020 methods), SE to SD, 95% CI to SD, p-value to effect size, OR to RR, HR to RR. Provide formulas, assumptions, and worked examples. Warn about skewness and when conversion is inappropriate.",
    buildPrompt: function(ctx) {
      return 'Guide me through statistical conversions needed for this meta-analysis:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  interpret: {
    system: "You are a biostatistician expert in heterogeneity assessment. Analyze and interpret: I² statistic (with 95% CI), τ² (between-study variance), Cochran's Q test, prediction interval, H² statistic. Classify heterogeneity (low/moderate/substantial/considerable per Cochrane Handbook). Identify potential sources through subgroup analysis and meta-regression. Provide publication-ready text.",
    buildPrompt: function(ctx) {
      return 'Interpret heterogeneity for this meta-analysis and suggest investigations:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  nma: {
    system: "You are an expert in network meta-analysis (NMA). Help design the network: identify all treatment nodes, map direct comparisons, check network connectivity, assess transitivity assumption, plan consistency assessment (node-splitting, design-by-treatment interaction). Recommend frequentist (netmeta R package) or Bayesian (JAGS/OpenBUGS) approach. Generate R code templates.",
    buildPrompt: function(ctx) {
      return 'Design a network meta-analysis for this review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  grade: {
    system: "You are a GRADE methodology expert. For each outcome, assess the 5 GRADE domains: risk of bias, inconsistency, indirectness, imprecision, publication bias. Start at high certainty for RCTs, very low for observational. Apply downgrading/upgrading criteria. Generate a complete GRADE evidence profile table with footnotes explaining each judgement. Use standard GRADE terminology (high/moderate/low/very low).",
    buildPrompt: function(ctx) {
      return 'Create a GRADE evidence profile for this review. Include all outcomes and domains:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  sof: {
    system: "You are a Cochrane Summary of Findings table expert. Create a publication-ready SoF table with columns: Outcomes, Number of participants (studies), Certainty of evidence (GRADE), Relative effect (95% CI), Anticipated absolute effects (risk with control, risk difference with intervention). Include footnotes explaining GRADE downgrades. Follow Cochrane Handbook Chapter 14 format.",
    buildPrompt: function(ctx) {
      return 'Generate a Summary of Findings table for this review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  abstract: {
    system: "You are an academic writing expert for systematic reviews. Draft a structured abstract (300-400 words) with sections: Background, Objectives, Search Methods, Selection Criteria, Data Collection and Analysis, Main Results, Authors' Conclusions. Follow Cochrane/PRISMA abstract format. Use precise quantitative language.",
    buildPrompt: function(ctx) {
      return 'Draft a structured abstract for this systematic review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  },
  cochra: {
    system: "You are an expert in health communication. Write a Cochrane-style Plain Language Summary accessible to patients, caregivers, and non-specialist healthcare providers. Structure: What is the aim of this review? What was studied? Key results, How reliable are the results? What does this mean? Keep language at 8th-grade reading level. Avoid jargon.",
    buildPrompt: function(ctx) {
      return 'Write a plain language summary for this systematic review:\n\n' + JSON.stringify(ctx, null, 2);
    }
  }
};

// ===== CEA PROMPTS (19 tools) =====
PROMPTS['CEA'] = {
  frame: {
    system: "You are a health economist specializing in cost-effectiveness analysis. Help frame the decision problem: define the target population, decision context (formulary listing, HTA submission, clinical pathway decision), intervention, and all relevant comparators. Consider the Saudi Arabian healthcare context including MOH formulary processes, Saudi FDA requirements, and NUPCO procurement pathways.",
    buildPrompt: function(ctx) { return 'Frame this health economic decision problem:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  comparators: {
    system: "You are a health economist. Identify all clinically relevant comparators for a cost-effectiveness analysis. Search clinical guidelines (NICE, WHO, Saudi MOH), formulary data, and standard of care in the Saudi Arabian context. Include active treatments, watchful waiting, and best supportive care where appropriate. Justify inclusion/exclusion of each comparator.",
    buildPrompt: function(ctx) { return 'Identify relevant comparators for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  perspective: {
    system: "You are a health economist expert in HTA methodology. Recommend the appropriate analysis perspective (healthcare payer, societal, patient) and time horizon. Reference NICE, iDSI, and Saudi HTA guidelines. Explain cost categories included/excluded for each perspective. Recommend discount rate (typically 3-5% for Saudi context).",
    buildPrompt: function(ctx) { return 'Recommend perspective and time horizon for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  markov: {
    system: "You are a health economic modeler expert in Markov models. Design the optimal model structure: define health states based on disease progression, identify transition probabilities, set cycle length, define absorbing states. Draw the state-transition diagram in text format. Reference published models in the same disease area. Provide R/TreeAge code templates.",
    buildPrompt: function(ctx) { return 'Design a Markov model for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  states: {
    system: "You are a health economic modeler. Search published economic evaluations and clinical literature to identify clinically meaningful health states. For each state: define entry criteria, typical duration, associated costs, utility values, and transition destinations. Ensure states are mutually exclusive and collectively exhaustive.",
    buildPrompt: function(ctx) { return 'Identify health states for this economic model:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  validate: {
    system: "You are an HTA assessor specializing in model validation. Cross-reference the model against published CEAs in the same disease area. Check: face validity (clinical experts agree), internal validity (calculations correct), cross-validity (results consistent with similar models), external validity (outputs match observed data). Provide specific validation tests.",
    buildPrompt: function(ctx) { return 'Validate this economic model structure:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  utilities: {
    system: "You are a health economist specializing in health-related quality of life. Search for EQ-5D utility values from: HERC database, CEA Registry (Tufts), published literature, and Saudi/GCC-specific valuations. For each health state, provide: utility value, source, sample size, instrument used, country of valuation, quality score. Flag if Saudi tariff is available.",
    buildPrompt: function(ctx) { return 'Find utility values for these health states:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  mapping: {
    system: "You are an expert in EQ-5D mapping/crosswalk algorithms. Apply validated mapping algorithms to convert disease-specific or generic HRQL scores to EQ-5D-3L or EQ-5D-5L utilities. Reference the HERC mapping database. Provide the mapping equation, R² value, RMSE, and appropriate caveats. Warn about limitations of mapping approaches.",
    buildPrompt: function(ctx) { return 'Map these HRQL scores to EQ-5D utilities:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  icer: {
    system: "You are a health economist. Calculate and interpret the ICER (Incremental Cost-Effectiveness Ratio). Compare against: Saudi GDP-based thresholds (1-3× GDP per capita ≈ $23,000-$69,000/QALY), NICE thresholds (£20,000-£30,000/QALY), WHO-CHOICE thresholds. Position on the cost-effectiveness plane. Provide decision recommendation with uncertainty caveats.",
    buildPrompt: function(ctx) { return 'Interpret this ICER in the Saudi context:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  dominance: {
    system: "You are a health economist specializing in multi-comparator CEA. Check for simple dominance (one strategy costs less AND is more effective) and extended dominance (a strategy is dominated by a linear combination of others). Plot the cost-effectiveness frontier. Identify dominated strategies and explain implications for the efficiency frontier.",
    buildPrompt: function(ctx) { return 'Check for dominance across these comparators:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  owsa: {
    system: "You are a health economic modeler expert in sensitivity analysis. Design a one-way sensitivity analysis (OWSA): list all parameters, their base-case values, plausible ranges (95% CI or ±20%), and sources. Identify the top 10 most influential parameters. Describe how to generate and interpret a tornado diagram. Provide R/Excel code template.",
    buildPrompt: function(ctx) { return 'Design OWSA for this economic model:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  threshold: {
    system: "You are a health economist. Perform threshold analysis: find the exact parameter values at which the cost-effectiveness conclusion changes (ICER crosses the WTP threshold). Report thresholds for: drug price, efficacy, utility values, discount rate, and time horizon. Present results as a decision-relevant threshold table.",
    buildPrompt: function(ctx) { return 'Run threshold analysis on these parameters:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  voi: {
    system: "You are an expert in Value of Information analysis. Calculate EVPI (Expected Value of Perfect Information) and EVPPI (Expected Value of Partial Perfect Information) for key parameters. Interpret: if EVPI exceeds the cost of further research, additional studies are justified. Identify which parameters have the highest information value. Reference methods from Briggs, Claxton & Sculpher.",
    buildPrompt: function(ctx) { return 'Perform VOI analysis for this economic evaluation:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  scenario: {
    system: "You are a health economic modeler. Design scenario analyses: (1) base case, (2) best case (most favorable assumptions), (3) worst case (least favorable), (4) clinical expert scenario, (5) Saudi-specific scenario (local epidemiology, costs). For each: list parameter changes, rationale, expected ICER range. Present as a structured scenario comparison table.",
    buildPrompt: function(ctx) { return 'Design scenario analyses for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  bia: {
    system: "You are a health economist with expertise in Saudi Arabian epidemiology. Provide Saudi-specific data for budget impact analysis: disease prevalence/incidence from MOH/GBD data, population demographics from GASTAT, drug costs from NUPCO tenders, hospital costs from MOH DRG tariffs. Include Saudi-specific treatment patterns and healthcare utilization rates.",
    buildPrompt: function(ctx) { return 'Provide Saudi epidemiology data for this BIA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  uptake: {
    system: "You are a market access expert in Saudi Arabia. Estimate market uptake curves based on: formulary listing timeline (SFDA registration → NUPCO listing → hospital formulary), prescriber adoption patterns, therapeutic area benchmarks, KOL influence, guideline inclusion. Model S-curve adoption with Saudi-specific parameters.",
    buildPrompt: function(ctx) { return 'Model uptake curves for this intervention in Saudi Arabia:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  cheers: {
    system: "You are an expert in health economic reporting. Draft a complete manuscript following CHEERS 2022 (Consolidated Health Economic Evaluation Reporting Standards) with all 28 items. Include: title, abstract, introduction (context, objectives), methods (target population, setting, comparators, perspective, time horizon, discount rate, health outcomes, costs, model, assumptions, analytics), results (study parameters, incremental costs/effects, uncertainty), discussion (limitations, generalizability), other (funding, conflicts).",
    buildPrompt: function(ctx) { return 'Draft a CHEERS 2022 manuscript for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  hta: {
    system: "You are an HTA submission expert familiar with Saudi FDA, NICE, and international HTA formats. Generate a structured HTA submission dossier with: executive summary, disease burden, unmet need, clinical evidence review, economic evaluation (model description, inputs, results), budget impact analysis, patient perspective, and implementation considerations.",
    buildPrompt: function(ctx) { return 'Generate an HTA dossier outline for this submission:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  policybrief: {
    system: "You are a health policy communication expert. Create a 2-page policy brief for healthcare decision-makers. Structure: key message box (3-4 bullets), background (1 paragraph), evidence summary, economic findings (ICER, budget impact), equity considerations, implementation recommendations, and references. Use clear, non-technical language appropriate for senior MOH leadership.",
    buildPrompt: function(ctx) { return 'Create a decision-maker policy brief for this CEA:\n\n' + JSON.stringify(ctx, null, 2); }
  }
};

// ===== HEALTH POLICY SCANNER PROMPTS (16 tools) =====
PROMPTS['Health Policy'] = {
  scope: {
    system: "You are a health policy analyst specializing in Saudi Arabia and GCC health systems. Define a comprehensive scan scope including: geographic scope (national/GCC/global), policy domains, WHO building blocks coverage, target organizations (MOH, SHC, SFDA, SCFHS, NTP), date range, document types (legislation, regulations, circulars, strategies), and search languages (Arabic + English).",
    buildPrompt: function(ctx) { return 'Define the scan scope for this health policy analysis:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  keywords: {
    system: "You are a bilingual (English/Arabic) health policy researcher. Generate comprehensive search terms including: English keywords, Arabic equivalents (with diacritics), MeSH policy terms, Saudi regulatory terminology, Vision 2030 keywords, and Boolean search strings. Format with both languages side by side.",
    buildPrompt: function(ctx) { return 'Generate bilingual search keywords for this policy topic:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  orgscan: {
    system: "You are an expert on Saudi Arabian healthcare organizations. For each relevant organization (MOH, SHC, SFDA, SCFHS, NTP, CBAHI, KACST, Saudi Red Crescent), describe: mandate, regulatory authority, key recent policies, website URL, and relevance to the topic. Identify coordination mechanisms and potential mandate overlaps.",
    buildPrompt: function(ctx) { return 'Scan organizations relevant to this health policy topic:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  mandate: {
    system: "You are a health systems governance expert for Saudi Arabia. Map organizational mandates: identify which Saudi health authorities have jurisdiction, where mandates overlap, where gaps exist, and how coordination mechanisms work. Reference the Health Sector Transformation Program, Council of Health Insurance structure, and Vision 2030 governance framework.",
    buildPrompt: function(ctx) { return 'Map organizational mandates for this policy area:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  crawl: {
    system: "You are a policy intelligence analyst. Describe a systematic approach to crawling Saudi health authority portals for policy documents. Cover: target URLs (MOH, SHC, SFDA Arabic/English portals), document types to capture (ministerial decisions, circulars, strategic plans, technical guidelines), metadata to extract, and archiving strategy. Note Arabic-language document handling requirements.",
    buildPrompt: function(ctx) { return 'Design a portal crawl strategy for this policy scan:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  gazette: {
    system: "You are an expert in Saudi legislative research. Guide searching Um Al-Qura (the Saudi Official Gazette), Royal Decrees, Council of Ministers decisions, and Shura Council recommendations for health-related legislation. Explain the Saudi legislative hierarchy and how health laws are enacted, amended, and enforced.",
    buildPrompt: function(ctx) { return 'Search Saudi legislative sources for this health topic:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  gcc: {
    system: "You are a GCC health policy analyst. Compare policies across all 6 GCC states (Saudi Arabia, UAE, Qatar, Kuwait, Bahrain, Oman). For each: identify relevant policies, regulatory body, implementation status, and harmonization with GCC Health Council recommendations. Identify best practices and cross-border policy learning opportunities.",
    buildPrompt: function(ctx) { return 'Cross-reference GCC policies for this health topic:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  extract: {
    system: "You are a policy metadata extraction specialist. Extract structured information from health policy documents: title (English + Arabic), issuing authority, date of issue, effective date, legal status (binding/advisory), scope (national/regional/institutional), target population, key provisions (numbered), related policies, enforcement mechanism, and review schedule.",
    buildPrompt: function(ctx) { return 'Extract structured metadata from this policy document:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  classify: {
    system: "You are a health systems classification expert. Classify policies against the 6 WHO building blocks: (1) Service delivery, (2) Health workforce, (3) Health information systems, (4) Access to medicines, (5) Health financing, (6) Leadership/governance. Also map to Saudi-specific domains: HSTP pillars, NTP targets, and Vision 2030 VROs. Justify each classification.",
    buildPrompt: function(ctx) { return 'Classify this policy using WHO building blocks:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  critique: {
    system: "You are a health policy quality appraiser. Apply an AGREE II-inspired framework: (1) Scope and purpose, (2) Stakeholder involvement, (3) Rigour of development (evidence base), (4) Clarity of presentation, (5) Applicability, (6) Editorial independence. Score each domain 1-7. Provide specific strengths and improvement recommendations.",
    buildPrompt: function(ctx) { return 'Appraise the quality of this health policy:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  v2030: {
    system: "You are an expert on Saudi Vision 2030 health sector targets. Score each policy against: NTP health indicators, VRO (Vision Realization Office) metrics, Health Sector Transformation Program KPIs, privatization targets, Saudization requirements, digital health strategy, and quality/patient safety benchmarks. Identify alignment gaps and acceleration opportunities.",
    buildPrompt: function(ctx) { return 'Assess Vision 2030 alignment for this policy:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  intl: {
    system: "You are an international health policy benchmarking expert. Compare Saudi policies against: WHO recommendations, OECD Health at a Glance indicators, UHC service coverage index, comparable high-income country policies (Australia, Canada, UK, Singapore). Identify where Saudi Arabia leads, lags, or is unique. Recommend evidence-based policy adaptations.",
    buildPrompt: function(ctx) { return 'Benchmark this Saudi policy internationally:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  equity: {
    system: "You are a health equity analyst. Assess each policy for equity dimensions: (1) Geographic access (urban/rural), (2) Gender responsiveness, (3) Vulnerable populations (migrant workers, elderly, disabled), (4) Socioeconomic gradients, (5) Insurance coverage gaps, (6) Cultural/linguistic accessibility. Use the PROGRESS-Plus framework. Recommend equity-enhancing modifications.",
    buildPrompt: function(ctx) { return 'Assess health equity impact of this policy:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  landscape: {
    system: "You are a senior health policy researcher. Generate a comprehensive policy landscape report with: executive summary, methodology, findings organized by WHO building block, policy timeline, gap analysis heat map description, stakeholder map, key themes, contradictions/overlaps, and prioritized recommendations. Write in formal report style suitable for WHO or MOH leadership.",
    buildPrompt: function(ctx) { return 'Generate a full policy landscape report for:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  policybrief: {
    system: "You are a senior health policy advisor to the Saudi Health Council. Write a minister-ready policy brief (2 pages): key findings box, background, methodology summary, critical findings, gap analysis, strategic recommendations with implementation timeline, responsible authority, and expected impact. Use formal yet accessible language appropriate for ministerial communication.",
    buildPrompt: function(ctx) { return 'Write a minister-ready policy brief on:\n\n' + JSON.stringify(ctx, null, 2); }
  },
  recommendations: {
    system: "You are a health policy implementation expert. Draft prioritized, actionable recommendations. For each: state the recommendation clearly, assign priority (critical/high/medium), responsible authority, implementation timeline, resource requirements, dependencies, expected impact, and monitoring indicators. Structure as a numbered action plan suitable for a governance committee.",
    buildPrompt: function(ctx) { return 'Draft actionable policy recommendations for:\n\n' + JSON.stringify(ctx, null, 2); }
  }
};

// ---- REWRITTEN showAIToolModal (live streaming) ----
window.showAIToolModal = function(domain, tool, color) {
  var modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center';
  modal.onclick = function(e) { if (e.target === modal) modal.remove(); };
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', domain + ' - ' + tool.t);

  var isLive = AIEngine.hasKey();
  var statusBadge = isLive
    ? '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;background:#D1FAE5;color:#065F46;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;border-radius:4px;border:1px solid #10B981">🟢 Live</span>'
    : '<span class="demo-badge">Demo</span>';

  modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:24px;max-width:700px;width:95%;max-height:85vh;overflow-y:auto;border-top:4px solid ' + color + '">' +
    '<div style="display:flex;justify-content:space-between;align-items:center">' +
    '<div><div style="font-size:11px;color:' + color + ';font-weight:600;text-transform:uppercase;letter-spacing:0.5px">' + domain + ' AI Tool ' + statusBadge + '</div>' +
    '<h3 style="margin:4px 0 0">' + tool.icon + ' ' + tool.t + '</h3></div>' +
    '<button class="btn btn-sm" onclick="this.closest(\'[role=dialog]\').remove()">✕</button></div>' +
    '<p style="margin:12px 0;font-size:13px;color:#64748B">' + tool.desc + '</p>' +
    '<div id="ai-live-status" style="margin:12px 0;font-size:12px;color:#64748B"></div>' +
    '<div id="ai-live-output" style="margin:12px 0;display:none">' +
    '<div id="ai-live-result" style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:16px;font-size:13px;line-height:1.7;max-height:400px;overflow-y:auto;white-space:pre-wrap;font-family:\'Segoe UI\',system-ui,sans-serif"></div>' +
    '</div>' +
    '<div id="ai-live-actions" style="margin-top:12px;display:none;display:flex;gap:6px;flex-wrap:wrap">' +
    '<button class="btn btn-ai btn-sm" onclick="navigator.clipboard.writeText(document.getElementById(\'ai-live-result\').innerText);showToast(\'Copied!\',\'ok\')">📋 Copy</button>' +
    '<button class="btn btn-ai btn-sm" onclick="var w=window.open(\'\',\'_blank\');w.document.write(\'<pre>\'+document.getElementById(\'ai-live-result\').innerHTML+\'</pre>\');w.print()">📄 Export</button>' +
    (!isLive ? '<button class="btn btn-sm btn-p" onclick="this.closest(\'[role=dialog]\').remove();openAISettings()">🔑 Connect API Key</button>' : '') +
    '<button class="btn btn-sm btn-o" onclick="this.closest(\'[role=dialog]\').remove()">Close</button>' +
    '</div></div>';

  document.body.appendChild(modal);
  trapFocus(modal);

  var statusEl = document.getElementById('ai-live-status');
  var outputEl = document.getElementById('ai-live-output');
  var resultEl = document.getElementById('ai-live-result');
  var actionsEl = document.getElementById('ai-live-actions');

  if (!isLive) {
    // DEMO MODE — simulate as before
    statusEl.innerHTML = '<div style="color:var(--warn);font-weight:600">⚠️ No API key configured — showing simulated output</div>';
    runDemoMode(domain, tool, color, statusEl, outputEl, resultEl, actionsEl);
    return;
  }

  // LIVE MODE — call Gemini
  var domainPrompts = PROMPTS[domain];
  var toolKey = findToolKey(domain, tool.t);
  var promptConfig = domainPrompts ? domainPrompts[toolKey] : null;

  if (!promptConfig) {
    statusEl.innerHTML = '<div style="color:var(--err)">❌ Prompt not configured for this tool</div>';
    actionsEl.style.display = 'flex';
    return;
  }

  var context = extractWorkflowContext(domain);
  var systemPrompt = promptConfig.system;
  var userPrompt = promptConfig.buildPrompt(context);

  statusEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px"><div style="width:12px;height:12px;border:2px solid ' + color + ';border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div> Calling Gemini (' + AIEngine.getModel() + ')...</div>' +
    '<style>@keyframes spin{to{transform:rotate(360deg)}}</style>';
  outputEl.style.display = 'block';
  resultEl.textContent = '';

  callGemini(
    systemPrompt,
    userPrompt,
    // onChunk
    function(chunk, fullText) {
      resultEl.textContent = fullText;
      resultEl.scrollTop = resultEl.scrollHeight;
      statusEl.innerHTML = '<div style="display:flex;align-items:center;gap:8px;color:' + color + '"><div style="width:12px;height:12px;border:2px solid ' + color + ';border-top-color:transparent;border-radius:50%;animation:spin 0.8s linear infinite"></div> Streaming response... (' + fullText.length + ' chars)</div>';
    },
    // onDone
    function(fullText) {
      statusEl.innerHTML = '<div style="color:var(--ok);font-weight:600">✅ Complete — ' + fullText.length + ' characters generated</div>';
      // Render markdown-like formatting
      resultEl.innerHTML = simpleMarkdown(fullText);
      actionsEl.style.display = 'flex';
      announce(tool.t + ' analysis complete');
    },
    // onError
    function(err) {
      if (err === 'NO_KEY') {
        statusEl.innerHTML = '<div style="color:var(--warn)">⚠️ No API key — <a href="#" onclick="event.preventDefault();this.closest(\'[role=dialog]\').remove();openAISettings()">Configure in Settings</a></div>';
        runDemoMode(domain, tool, color, statusEl, outputEl, resultEl, actionsEl);
      } else if (err === 'INVALID_KEY') {
        statusEl.innerHTML = '<div style="color:var(--err)">❌ Invalid API key — <a href="#" onclick="event.preventDefault();this.closest(\'[role=dialog]\').remove();openAISettings()">Update in Settings</a></div>';
      } else {
        statusEl.innerHTML = '<div style="color:var(--err)">❌ ' + escHtml(err) + '</div>';
      }
      actionsEl.style.display = 'flex';
    }
  );
};

// ---- FIND TOOL KEY FROM TOOL TITLE ----
function findToolKey(domain, title) {
  var domainPrompts = PROMPTS[domain];
  if (!domainPrompts) return null;

  // Try exact match on tool definitions
  var domainFn = domain === 'SR/MA' ? 'aiSRMA' : domain === 'CEA' ? 'aiCEA' : 'aiHPS';
  // Build reverse map from title to key
  var fnStr = (window[domainFn] || function(){}).toString();

  // Search all keys in prompts
  var keys = Object.keys(domainPrompts);
  for (var i = 0; i < keys.length; i++) {
    // Check if the title matches any tool definition
    var k = keys[i];
    if (title.toLowerCase().indexOf(k) !== -1) return k;
  }

  // Fallback: fuzzy match first word
  var firstWord = title.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '');
  for (var i = 0; i < keys.length; i++) {
    if (keys[i].indexOf(firstWord) !== -1 || firstWord.indexOf(keys[i]) !== -1) return keys[i];
  }

  // Last resort: match by looking at the original tool dispatch functions
  return keys[0]; // fallback to first tool
}

// ---- SIMPLE MARKDOWN RENDERER ----
function simpleMarkdown(text) {
  return text
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/^### (.+)$/gm, '<h4 style="margin:14px 0 6px;color:var(--p);font-size:14px">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 style="margin:16px 0 8px;color:var(--pd);font-size:15px">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 style="margin:18px 0 8px;font-size:16px">$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code style="background:#F1F5F9;padding:1px 4px;border-radius:3px;font-size:12px">$1</code>')
    .replace(/^\|(.+)\|$/gm, function(match) {
      var cells = match.split('|').filter(function(c) { return c.trim(); });
      return '<tr>' + cells.map(function(c) { return '<td style="padding:4px 8px;border:1px solid #E2E8F0">' + c.trim() + '</td>'; }).join('') + '</tr>';
    })
    .replace(/^- (.+)$/gm, '<div style="padding:2px 0 2px 16px">• $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, '<div style="padding:2px 0 2px 16px">$1. $2</div>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>');
}

// ---- DEMO MODE FALLBACK (original simulation) ----
function runDemoMode(domain, tool, color, statusEl, outputEl, resultEl, actionsEl) {
  var stepTexts = [
    '🔍 Analyzing input parameters...',
    '📚 Searching relevant literature and databases...',
    '🧠 Applying domain-specific AI models...',
    '📊 Generating structured output...',
    '✅ Quality check and validation complete'
  ];

  var stepsHTML = '';
  var pct = 0;
  var step = 0;

  outputEl.style.display = 'block';
  resultEl.textContent = '';

  var interval = setInterval(function() {
    pct += Math.random() * 15 + 5;
    if (pct > 100) pct = 100;

    statusEl.innerHTML = '<div style="margin-bottom:6px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:4px"><span>Processing (demo)...</span><span>' + Math.round(pct) + '%</span></div><div style="height:6px;background:#E2E8F0;border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:linear-gradient(90deg,' + color + ',#7C3AED);border-radius:3px;transition:width 0.3s"></div></div></div>' + stepsHTML;

    if (step < stepTexts.length && pct > (step + 1) * 18) {
      stepsHTML += '<div style="padding:2px 0;color:#16A34A;font-size:12px">' + stepTexts[step] + '</div>';
      step++;
    }

    if (pct >= 100) {
      clearInterval(interval);
      statusEl.innerHTML = '<div style="color:var(--ok);font-weight:600">✅ Demo complete</div>';
      resultEl.innerHTML = '<div style="color:var(--ok);font-weight:600;margin-bottom:8px">✅ ' + tool.t + ' — Complete <span class="demo-badge">Simulated Output</span></div>' +
        '<p>This is a simulated demo output. Connect your Google Gemini API key in Settings to get real AI-powered analysis.</p>' +
        '<p style="margin-top:8px"><strong>What you\'d get with a live connection:</strong></p>' +
        '<div style="padding:2px 0 2px 16px">• Domain-specific analysis from Gemini AI</div>' +
        '<div style="padding:2px 0 2px 16px">• Structured output following ' + domain + ' methodology standards</div>' +
        '<div style="padding:2px 0 2px 16px">• Context-aware results based on your current workflow inputs</div>' +
        '<div style="padding:2px 0 2px 16px">• Real-time streaming response</div>' +
        '<div style="margin-top:8px;padding:8px;background:#F0FDF4;border-radius:6px;border-left:3px solid #16A34A">' +
        '<strong>To activate:</strong> Click the ⚙️ Settings icon in the sidebar or <a href="#" onclick="event.preventDefault();openAISettings()" style="color:var(--ai1);font-weight:600">click here</a> to enter your Gemini API key.</div>';
      actionsEl.style.display = 'flex';
    }
  }, 400);
}

// ---- INIT: Update banner on load if key exists ----
document.addEventListener('DOMContentLoaded', function() {
  if (AIEngine.hasKey()) {
    var banner = document.querySelector('.demo-banner');
    if (banner) {
      var model = AIEngine.getModel();
      banner.innerHTML = '🟢 <strong>AI Engine Live</strong> — Connected to Gemini (' + model + '). All 48 tools are active. Free tier.';
      banner.style.background = 'linear-gradient(90deg, #D1FAE5, #A7F3D0)';
      banner.style.color = '#065F46';
      banner.style.borderColor = '#10B981';
    }
  }
});

})();
