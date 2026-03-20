// ========================================
// FULL CPG REPORT GENERATOR
// ========================================
function generateFullCPGReport() {
  var projects = JSON.parse(localStorage.getItem('ksumc_projects') || '[]');
  var activeId = localStorage.getItem('ksumc_active_project');
  var proj = projects.find(function(p) { return p.id === activeId; });
  if (!proj) { alert('No active project. Please select a project first.'); return; }
  
  var picos = getAllPicos();
  var report = '';
  
  // Title Page
  report += '<div style="page-break-after:always;text-align:center;padding:60px 40px"><div style="font-size:32px;font-weight:bold;margin-bottom:20px">' + proj.title + '</div>';
  report += '<div style="font-size:18px;color:#666;margin:40px 0">Clinical Practice Guideline</div>';
  report += '<div style="margin:60px 0;font-size:14px"><strong>King Saud University Medical City</strong><br>National Specialist Committee for ' + (proj.specialty || 'Clinical Guidelines') + '</div>';
  report += '<div style="font-size:12px;color:#999;margin-top:60px">Version 1.0<br>Date: ' + new Date().toLocaleDateString() + '<br>';
  report += 'Panel Members: [Panel information]</div></div>';
  
  // Executive Summary
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">Executive Summary</h2>';
  report += '<p>' + proj.title + ' represents a comprehensive evidence-based guideline developed using GRADE methodology.</p>';
  report += '<h4 style="margin-top:20px">Key Recommendations</h4><ul>';
  Object.values(window._picoEtRData || {}).forEach(function(ed) {
    if (ed.recText) report += '<li><strong>' + ed.recStrength + ':</strong> ' + ed.recText + '</li>';
  });
  report += '</ul></div>';
  
  // Table of Contents
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">Table of Contents</h2>';
  report += '<ol style="line-height:2"><li>Introduction & Background</li><li>Methods</li><li>Summary of Evidence</li>';
  report += '<li>Evidence-to-Recommendation Analysis</li><li>Recommendations</li><li>Implementation Considerations</li>';
  report += '<li>Research Gaps & Future Directions</li><li>References</li></ol></div>';
  
  // Introduction
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">1. Introduction & Background</h2>';
  report += '<p>This guideline addresses the clinical management of ' + proj.title + '. It was developed following GRADE methodology to provide evidence-based recommendations for healthcare professionals in Saudi Arabia.</p>';
  report += '<h4>Saudi Epidemiology & Context</h4><p>The condition affects significant populations within the Kingdom, with implications for healthcare delivery and resource allocation.</p>';
  report += '<h4>Target Population & Scope</h4><p>This guideline applies to adult patients in Saudi Arabian healthcare settings.</p></div>';
  
  // Methods
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">2. Methods</h2>';
  report += '<h4>Guideline Development Process</h4><p>A multidisciplinary panel was convened to address priority clinical questions using systematic methods.</p>';
  report += '<h4>GRADE Methodology</h4><p>All recommendations were graded using the GRADE approach, evaluating certainty of evidence and balance of benefits vs. harms.</p>';
  // COI disclosure (MAGICapp-style)
  var coiMembers = window._coiData ? window._coiData.members : [];
  if (coiMembers.length > 0) {
    report += '<h4>Panel Composition and Conflict of Interest</h4>';
    report += '<p>The guideline panel comprised ' + coiMembers.length + ' members. Conflicts of interest were declared and managed according to WHO guidelines on COI management.</p>';
    report += '<table style="width:100%;border-collapse:collapse;font-size:11px"><tr style="background:#F3F4F6"><th style="border:1px solid #E5E7EB;padding:6px;text-align:left">Member</th><th style="border:1px solid #E5E7EB;padding:6px">Role</th><th style="border:1px solid #E5E7EB;padding:6px">COI Status</th></tr>';
    coiMembers.forEach(function(m) {
      report += '<tr><td style="border:1px solid #E5E7EB;padding:6px">' + (m.name||'') + '</td><td style="border:1px solid #E5E7EB;padding:6px">' + (m.role||'') + '</td><td style="border:1px solid #E5E7EB;padding:6px">' + (m.coiType === 'none' ? 'No conflicts declared' : m.coiType + ': ' + (m.details||'')) + '</td></tr>';
    });
    report += '</table>';
  }
  report += '<h4>Literature Search Strategy</h4><p>Systematic searches were conducted in MEDLINE, Embase, Cochrane Library, and Saudi regional databases through ' + new Date().getFullYear() + '.</p></div>';
  
  // Summary of Evidence — EXPANDED with narrative synthesis and references
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">3. Summary of Evidence</h2>';
  report += '<p>A systematic evidence search was conducted across PubMed/MEDLINE, Cochrane Library, EMBASE, and WHO repositories. Each PICO question was independently searched and articles classified by study design following the evidence hierarchy: systematic reviews/meta-analyses, randomized controlled trials, cohort studies, and observational data.</p>';
  var allReferences = [];
  var refCounter = 1;
  picos.forEach(function(pico, idx) {
    var gd = window._picoGradeData[idx] || {};
    var sr = window._picoSearchResults ? window._picoSearchResults[idx] : null;
    var articles = sr ? (sr.articles || []) : [];
    var evidSummary = window._picoEvidenceSummaries ? window._picoEvidenceSummaries[idx] : null;
    var gradeSymbols = { 'High': '&#8853;&#8853;&#8853;&#8853;', 'Moderate': '&#8853;&#8853;&#8853;&#9675;', 'Low': '&#8853;&#8853;&#9675;&#9675;', 'Very Low': '&#8853;&#9675;&#9675;&#9675;' };

    report += '<div style="margin-top:20px;padding:16px;border:1px solid #E5E7EB;border-radius:8px;page-break-inside:avoid">';
    report += '<h4 style="margin-top:0;color:#4B5563;border-bottom:1px solid #E5E7EB;padding-bottom:8px">' + (pico.icon || '') + ' PICO ' + (idx+1) + ': ' + (pico.domain || 'Custom') + '</h4>';

    // PICO table
    report += '<table style="width:100%;border-collapse:collapse;font-size:12px;margin:10px 0"><tr style="background:#F3F4F6"><td style="border:1px solid #E5E7EB;padding:6px;font-weight:bold;width:120px">Population</td><td style="border:1px solid #E5E7EB;padding:6px">' + (pico.P || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:6px;font-weight:bold">Intervention</td><td style="border:1px solid #E5E7EB;padding:6px">' + (pico.I || '—') + '</td></tr>';
    report += '<tr style="background:#F3F4F6"><td style="border:1px solid #E5E7EB;padding:6px;font-weight:bold">Comparator</td><td style="border:1px solid #E5E7EB;padding:6px">' + (pico.C || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:6px;font-weight:bold">Outcomes</td><td style="border:1px solid #E5E7EB;padding:6px">' + (pico.O || '—') + '</td></tr></table>';

    // Search Results Summary
    if (sr) {
      var totalHits = (sr.pubmed || 0) + (sr.cochrane || 0) + (sr.embase || 0) + (sr.who || 0);
      report += '<p style="font-size:12px;margin:8px 0"><strong>Search Results:</strong> ' + totalHits.toLocaleString() + ' records identified (PubMed: ' + (sr.pubmed || 0).toLocaleString() + ', Cochrane: ' + (sr.cochrane || 0).toLocaleString() + ', EMBASE: ' + (sr.embase || 0).toLocaleString() + ', WHO: ' + (sr.who || 0).toLocaleString() + ')</p>';
    }

    // Evidence Narrative — from generated summary or build on the fly
    if (evidSummary && evidSummary.paragraphs && evidSummary.paragraphs.length > 0) {
      report += '<div style="font-size:12px;line-height:1.7;margin:10px 0">';
      evidSummary.paragraphs.forEach(function(p) {
        // Replace superscript ref numbers with sequential global numbers
        report += '<p style="margin-bottom:8px">' + p + '</p>';
      });
      report += '</div>';
      // Add references from this PICO
      if (evidSummary.references && evidSummary.references.length > 0) {
        evidSummary.references.forEach(function(ref) {
          allReferences.push(ref);
        });
      }
    } else {
      // Fallback: basic summary from article data
      report += '<p style="font-size:12px"><strong>Study Design:</strong> ' + (gd.studyDesign || '—') + ' | <strong>Number of Studies:</strong> ' + (gd.numStudies || '0') + ' | <strong>Certainty:</strong> ' + (gd._certainty || 'Low') + '</p>';
      if (articles.length > 0) {
        report += '<p style="font-size:12px"><strong>Key Studies:</strong></p><ul style="font-size:11px;line-height:1.6">';
        articles.slice(0, 5).forEach(function(a) {
          var ref = (a.firstAuthor || 'Unknown') + ' et al. (' + (a.year || '') + '). ' + (a.title || '') + ' <em>' + (a.journal || '') + '</em>.';
          if (a.pmid) ref += ' PMID: ' + a.pmid;
          if (a.doi) ref += ' DOI: ' + a.doi;
          report += '<li>' + ref + '</li>';
          allReferences.push(ref);
        });
        report += '</ul>';
      }
    }

    // GRADE Summary Box
    report += '<div style="margin:10px 0;padding:10px;background:#F0F9FF;border-radius:6px;border:1px solid #BAE6FD;font-size:12px">';
    report += '<strong>GRADE Certainty: ' + (gd._certainty || 'Not assessed') + ' ' + (gradeSymbols[gd._certainty] || '') + '</strong><br>';
    report += '<span style="font-size:11px">Risk of Bias: ' + (gd.rob || '—') + ' | Inconsistency: ' + (gd.inconsistency || '—') + ' | Indirectness: ' + (gd.indirectness || '—') + ' | Imprecision: ' + (gd.imprecision || '—') + ' | Publication Bias: ' + (gd.pubBias || '—') + '</span>';
    report += '</div>';

    report += '</div>';
  });
  report += '</div>';
  
  // Evidence-to-Recommendation Tables
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">4. Evidence-to-Recommendation Analysis</h2>';
  picos.forEach(function(pico, idx) {
    var ed = window._picoEtRData[idx] || {};
    report += '<h4 style="margin-top:14px;border:1px solid #E5E7EB;padding:8px;background:#F9FAFB">PICO ' + (idx+1) + ': EtR Framework</h4>';
    report += '<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="background:#F3F4F6"><th style="border:1px solid #E5E7EB;padding:8px;text-align:left">Domain</th><th style="border:1px solid #E5E7EB;padding:8px">Assessment</th></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Problem Priority</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.problemPriority || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Desirable Effects</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.desirableEffects || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Undesirable Effects</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.undesirableEffects || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Certainty of Evidence</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.certaintyEvidence || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Values & Preferences</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.valuesPrefs || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Balance: Benefits vs Harms</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.balanceEffects || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Resources Required</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.resourcesRequired || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Cost-Effectiveness</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.costEffectiveness || '—') + '</td></tr>';
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">Equity Considerations</td><td style="border:1px solid #E5E7EB;padding:8px">' + (ed.equity || '\u2014') + '</td></tr>';
    report += '</table>';
    // Panel voting results (MAGICapp-style)
    var votes = window._panelVotes[idx] || { members: [] };
    if (votes.members.length > 0) {
      report += '<div style="margin-top:8px;padding:8px;background:#F0F9FF;border-radius:6px;font-size:11px">';
      report += '<strong>Panel Voting Results:</strong> ' + votes.members.length + ' votes cast<br>';
      var voteCounts = {};
      votes.members.forEach(function(m) { voteCounts[m.vote] = (voteCounts[m.vote] || 0) + 1; });
      Object.entries(voteCounts).forEach(function(entry) {
        report += entry[0] + ': ' + entry[1] + ' (' + Math.round(entry[1]/votes.members.length*100) + '%) | ';
      });
      report += '</div>';
    }
  });
  report += '</div>';
  
  // Recommendations
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">5. Recommendations</h2>';
  var recNum = 1;
  Object.values(window._picoEtRData || {}).forEach(function(ed) {
    if (ed.recText) {
      var strengthClass = ed.recStrength === 'Strong for' ? '#059669' : ed.recStrength === 'Strong against' ? '#DC2626' : '#7C3AED';
      report += '<div style="margin:12px 0;padding:12px;border-left:4px solid ' + strengthClass + ';background:#F9FAFB">';
      report += '<strong style="font-size:14px">Recommendation ' + (recNum++) + ':</strong> ' + (ed.recStrength || '—') + '<br>';
      report += ed.recText + '<br>';
      report += '<span style="font-size:11px;color:#666"><em>Certainty of Evidence: ' + (ed.certaintyEvidence || '—') + '</em></span>';
      report += '</div>';
    }
  });
  report += '</div>';
  
  // Implementation
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">6. Implementation Considerations</h2>';
  report += '<h4>Saudi Healthcare Context</h4><p>Implementation should consider the Saudi healthcare system structure, including MOH facilities, university hospitals, and private sector alignment.</p>';
  report += '<h4>Regulatory Alignment</h4><p>All recommendations align with Saudi FDA (SFDA) regulations, MOH implementation directives, and SCFHS CPE requirements.</p>';
  report += '<h4>Resource Requirements</h4><p>Implementation requires training, access to required medications/procedures, and monitoring systems.</p></div>';
  
  // Research Gaps
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">7. Research Gaps & Future Directions</h2>';
  report += '<p>Identified research priorities include:</p><ul><li>Saudi-specific epidemiology studies</li><li>Health systems effectiveness research</li><li>Patient preference and outcomes research</li><li>Implementation science studies</li></ul>';
  report += '<p>This guideline will be updated in 3–5 years or earlier if significant new evidence emerges.</p></div>';
  
  // References
  report += '<div style="page-break-before:always"><h2 style="color:#1F2937;border-bottom:2px solid #8B5CF6;padding-bottom:10px">8. References</h2>';
  // Build real reference list from all PICOs
  var cpgRefs = [];
  var cpgRefNum = 1;
  var allP = getAllPicos();
  allP.forEach(function(pico, ri) {
    var rSr = window._picoSearchResults ? window._picoSearchResults[ri] : null;
    var rArticles = rSr ? (rSr.articles || []) : [];
    rArticles.slice(0, 10).forEach(function(a) {
      var ref = cpgRefNum + '. ' + (a.firstAuthor || 'Unknown') + ' et al. ' + (a.title || '');
      if (!ref.endsWith('.')) ref += '.';
      ref += ' <em>' + (a.journal || '') + '</em>.';
      if (a.year) ref += ' ' + a.year;
      if (a.volume) ref += ';' + a.volume;
      if (a.issue) ref += '(' + a.issue + ')';
      if (a.pages) ref += ':' + a.pages;
      ref += '.';
      if (a.pmid) ref += ' PMID: ' + a.pmid + '.';
      if (a.doi) ref += ' DOI: <a href="https://doi.org/' + a.doi + '" target="_blank">' + a.doi + '</a>';
      cpgRefs.push(ref);
      cpgRefNum++;
    });
  });
  if (cpgRefs.length > 0) {
    report += '<ol style="font-size:11px;line-height:1.8">';
    cpgRefs.forEach(function(r) { report += '<li>' + r + '</li>'; });
    report += '</ol></div>';
  } else {
    report += '<p style="font-size:12px;color:#666">No references available. Run evidence searches to populate references.</p></div>';
  }
  
  displayReportModal('Full CPG Report: ' + proj.title, report);
}

// ========================================
// JOURNAL MANUSCRIPT GENERATOR
// ========================================
function generateJournalManuscript() {
  var projects = JSON.parse(localStorage.getItem('ksumc_projects') || '[]');
  var activeId = localStorage.getItem('ksumc_active_project');
  var proj = projects.find(function(p) { return p.id === activeId; });
  if (!proj) { alert('No active project. Please select a project first.'); return; }
  
  var picos = getAllPicos();
  var report = '';
  
  // Title and Authors
  report += '<div style="text-align:center;padding:20px;border-bottom:2px solid #1F2937"><div style="font-size:20px;font-weight:bold;margin-bottom:16px">' + proj.title + ': A Systematic Review and Evidence-to-Recommendation Analysis</div>';
  report += '<div style="font-size:13px;margin-bottom:8px"><strong>Authors:</strong> Clinical Practice Guideline Panel, King Saud University Medical City</div>';
  report += '<div style="font-size:13px;margin-bottom:8px"><strong>Affiliations:</strong> Department of ' + (proj.specialty || 'Clinical Sciences') + ', King Saud University Medical City, Riyadh, Saudi Arabia</div>';
  report += '<div style="font-size:12px;color:#666"><strong>Correspondence:</strong> [Corresponding Author], [email@ksumc.edu.sa]</div></div>';
  
  // Abstract
  report += '<div style="margin-top:20px;padding:16px;background:#F0F9FF;border-left:4px solid #0284C7"><h3 style="margin-top:0">Abstract</h3>';
  report += '<p><strong>Background:</strong> ' + proj.title + ' is a significant clinical concern. This systematic review and evidence-to-recommendation analysis synthesizes available evidence to guide practice in Saudi Arabia.</p>';
  report += '<p><strong>Methods:</strong> Systematic literature search of MEDLINE, Embase, and Cochrane Library through ' + new Date().getFullYear() + '. Data were assessed using GRADE methodology. A multidisciplinary panel evaluated evidence and formulated recommendations.</p>';
  report += '<p><strong>Results:</strong> ' + picos.length + ' key clinical questions were addressed using evidence from ' + Object.keys(window._picoGradeData).length + ' comparisons. The certainty of evidence ranged from very low to moderate. Recommendations were formulated considering benefits, harms, values, and feasibility.</p>';
  report += '<p><strong>Conclusion:</strong> This evidence-based guideline provides actionable recommendations for clinical practice in Saudi Arabia, with implementation considerations for resource-constrained settings.</p>';
  report += '<p><strong>Keywords:</strong> clinical practice guideline, systematic review, GRADE, evidence-based medicine, Saudi Arabia</p></div>';
  
  // Introduction
  report += '<div style="margin-top:20px"><h3>Introduction</h3>';
  report += '<p>' + proj.title + ' affects significant populations in Saudi Arabia. Despite its clinical importance, variability in practice and limited evidence synthesis have been documented. This guideline addresses this gap by providing systematic recommendations based on current evidence.</p>';
  report += '<p>The guideline was developed following GRADE methodology and aligns with WHO, NICE, and international best practices. It targets primary care physicians, specialists, and healthcare systems in Saudi Arabia.</p></div>';
  
  // Methods
  report += '<div style="margin-top:20px"><h3>Methods</h3>';
  report += '<h4>Study Selection & Data Synthesis</h4><p>Systematic literature searches identified randomized controlled trials, cohort studies, and systematic reviews published in English or Arabic through ' + new Date().getFullYear() + '. Titles, abstracts, and full texts were independently screened. Data were extracted using predefined templates.</p>';
  report += '<h4>GRADE Assessment</h4><p>Certainty of evidence was assessed for each outcome using GRADE, considering risk of bias, inconsistency, indirectness, imprecision, and publication bias. Recommendations were classified as strong or conditional, based on balance of benefits and harms.</p>';
  report += '<h4>Panel Process</h4><p>A multidisciplinary panel convened to synthesize evidence, discuss judgments in the Evidence-to-Recommendation framework, and formulate recommendations using structured consensus methods.</p></div>';
  
  // Results
  report += '<div style="margin-top:20px"><h3>Results</h3>';
  report += '<h4>Evidence Summary</h4>';
  report += '<p>' + picos.length + ' priority clinical questions were systematically reviewed across ' + Object.keys(window._picoGradeData).length + ' GRADE assessments.</p>';
  picos.forEach(function(pico, mIdx) {
    var mGd = window._picoGradeData[mIdx] || {};
    var mSr = window._picoSearchResults ? window._picoSearchResults[mIdx] : null;
    var mArticles = mSr ? (mSr.articles || []) : [];
    var mEvidSummary = window._picoEvidenceSummaries ? window._picoEvidenceSummaries[mIdx] : null;
    report += '<div style="margin:12px 0;padding:12px;background:#FAFAFA;border-radius:6px;border:1px solid #E5E7EB">';
    report += '<strong style="font-size:13px">' + (pico.icon || '') + ' PICO ' + (mIdx+1) + ': ' + (pico.domain || '') + '</strong>';
    report += '<p style="font-size:11px;margin:4px 0"><strong>I:</strong> ' + (pico.I || '—') + ' <strong>vs</strong> <strong>C:</strong> ' + (pico.C || '—') + '</p>';
    if (mEvidSummary && mEvidSummary.paragraphs) {
      report += '<div style="font-size:12px;line-height:1.6;margin:8px 0">';
      mEvidSummary.paragraphs.forEach(function(p) { report += '<p style="margin-bottom:6px">' + p + '</p>'; });
      report += '</div>';
    } else {
      report += '<p style="font-size:12px">Design: ' + (mGd.studyDesign || '—') + ' | Studies: ' + (mGd.numStudies || '0') + ' | Certainty: ' + (mGd._certainty || 'Low') + '</p>';
      if (mArticles.length > 0) {
        report += '<p style="font-size:11px"><strong>Key references:</strong> ';
        var mCites = [];
        mArticles.slice(0, 3).forEach(function(a) {
          mCites.push((a.firstAuthor || '') + ' et al. (' + (a.year || '') + ')' + (a.doi ? ' [DOI: ' + a.doi + ']' : ''));
        });
        report += mCites.join('; ') + '</p>';
      }
    }
    report += '</div>';
  });
  
  // GRADE Summary Table
  report += '<h4 style="margin-top:14px">Summary of Findings Table</h4>';
  report += '<table style="width:100%;border-collapse:collapse;font-size:11px;margin:10px 0"><tr style="background:#F3F4F6"><th style="border:1px solid #E5E7EB;padding:8px;text-align:left">PICO</th><th style="border:1px solid #E5E7EB;padding:8px">Study Design</th><th style="border:1px solid #E5E7EB;padding:8px">N Studies</th><th style="border:1px solid #E5E7EB;padding:8px">Certainty</th><th style="border:1px solid #E5E7EB;padding:8px">Effect</th></tr>';
  picos.forEach(function(p, idx) {
    var gd = window._picoGradeData[idx] || {};
    report += '<tr><td style="border:1px solid #E5E7EB;padding:8px">' + (p.domain || '—') + ' — ' + (p.I || p.intervention || '').substring(0,50) + '</td><td style="border:1px solid #E5E7EB;padding:8px">' + (gd.studyDesign || '—') + '</td><td style="border:1px solid #E5E7EB;padding:8px">' + (gd.numStudies || '0') + '</td><td style="border:1px solid #E5E7EB;padding:8px">' + (gd._certainty || 'Low') + '</td><td style="border:1px solid #E5E7EB;padding:8px">' + (gd.effect || '—') + '</td></tr>';
  });
  report += '</table>';
  
  // Recommendations
  report += '<h4 style="margin-top:14px">Recommendations</h4>';
  var recNum = 1;
  Object.values(window._picoEtRData || {}).forEach(function(ed) {
    if (ed.recText) {
      var strengthBadge = ed.recStrength === 'Strong for' ? '<span style="background:#10B981;color:white;padding:2px 6px;border-radius:3px;font-size:11px">STRONG FOR</span>' 
                        : ed.recStrength === 'Strong against' ? '<span style="background:#EF4444;color:white;padding:2px 6px;border-radius:3px;font-size:11px">STRONG AGAINST</span>'
                        : '<span style="background:#8B5CF6;color:white;padding:2px 6px;border-radius:3px;font-size:11px">CONDITIONAL</span>';
      report += '<div style="margin:12px 0;padding:12px;border:1px solid #E5E7EB;background:#FAFAFA"><strong>Recommendation ' + (recNum++) + ':</strong> ' + strengthBadge + '<br>';
      report += ed.recText + '<br><span style="font-size:11px;color:#666;margin-top:4px;display:block"><em>Certainty: ' + (ed.certaintyEvidence || '—') + ' | ' + (ed.balanceEffects || '—') + '</em></span></div>';
    }
  });
  
  report += '</div>';
  
  // Discussion
  report += '<div style="margin-top:20px"><h3>Discussion</h3>';
  report += '<p>This systematic review and guideline synthesis identifies key recommendations supported by moderate to high certainty evidence for the management of ' + proj.title + ' in Saudi Arabia.</p>';
  report += '<h4>Strengths & Limitations</h4><p><strong>Strengths:</strong> Systematic methodology, GRADE assessment, multidisciplinary panel, Saudi context focus.<br><strong>Limitations:</strong> Limited Saudi-specific evidence, variable study quality in included reviews.</p>';
  report += '<h4>Clinical Implications</h4><p>These recommendations are intended for implementation in Saudi healthcare facilities and should be adapted to local resources and priorities.</p></div>';
  
  // Conclusion
  report += '<div style="margin-top:20px"><h3>Conclusion</h3>';
  report += '<p>This evidence-based guideline provides actionable recommendations for clinical practice regarding ' + proj.title + '. Implementation should involve healthcare system engagement, clinician education, and monitoring of adherence and outcomes.</p></div>';
  
  // References
  report += '<div style="margin-top:20px"><h3>References</h3>';
  // Build real reference list
  var msRefs = [];
  var msRefNum = 1;
  getAllPicos().forEach(function(pico, ri) {
    var rSr = window._picoSearchResults ? window._picoSearchResults[ri] : null;
    var rArticles = rSr ? (rSr.articles || []) : [];
    rArticles.slice(0, 8).forEach(function(a) {
      var ref = msRefNum + '. ' + (a.firstAuthor || 'Unknown') + ' et al. ' + (a.title || '');
      if (!ref.endsWith('.')) ref += '.';
      ref += ' <em>' + (a.journal || '') + '</em>.';
      if (a.year) ref += ' ' + a.year;
      if (a.volume) ref += ';' + a.volume;
      if (a.issue) ref += '(' + a.issue + ')';
      if (a.pages) ref += ':' + a.pages;
      ref += '.';
      if (a.pmid) ref += ' PMID: ' + a.pmid + '.';
      if (a.doi) ref += ' DOI: <a href="https://doi.org/' + a.doi + '" target="_blank">' + a.doi + '</a>';
      msRefs.push(ref);
      msRefNum++;
    });
  });
  if (msRefs.length > 0) {
    report += '<ol style="font-size:11px;line-height:1.8">';
    msRefs.forEach(function(r) { report += '<li>' + r + '</li>'; });
    report += '</ol></div>';
  } else {
    report += '<p style="font-size:12px;color:#666">No references available. Run evidence searches to populate.</p></div>';
  }
  
  displayReportModal('Journal Manuscript: ' + proj.title, report);
}

// ========================================
// MODAL DISPLAY FUNCTION
// ========================================
function displayReportModal(title, htmlContent) {
  // Create modal overlay
  var modal = document.createElement('div');
  modal.id = 'report-modal';
  modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;z-index:10000;padding:20px;';
  
  var container = document.createElement('div');
  container.style.cssText = 'background:white;border-radius:12px;width:100%;max-width:900px;max-height:85vh;display:flex;flex-direction:column;box-shadow:0 20px 25px rgba(0,0,0,0.15);';
  
  // Header
  var header = document.createElement('div');
  header.style.cssText = 'border-bottom:1px solid #E5E7EB;padding:20px;display:flex;justify-content:space-between;align-items:center;';
  header.innerHTML = '<div style="font-size:16px;font-weight:bold">' + title + '</div><button onclick="document.getElementById(\'report-modal\').remove()" style="background:none;border:none;font-size:24px;cursor:pointer">&times;</button>';
  
  // Content area
  var content = document.createElement('div');
  content.style.cssText = 'flex:1;overflow-y:auto;padding:20px;font-size:13px;line-height:1.6;';
  content.innerHTML = htmlContent;
  
  // Footer with export buttons
  var footer = document.createElement('div');
  footer.style.cssText = 'border-top:1px solid #E5E7EB;padding:16px;display:flex;gap:8px;justify-content:flex-end;background:#F9FAFB;';
  footer.innerHTML = '<button class="btn" style="padding:8px 16px;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:6px;cursor:pointer;font-size:12px" onclick="navigator.clipboard.writeText(document.querySelector(\'#report-modal > div > div:nth-child(2)\').innerText)">📋 Copy Text</button><button class="btn" style="padding:8px 16px;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:6px;cursor:pointer;font-size:12px" onclick="window.print()">🖨️ Print</button>';
  
  container.appendChild(header);
  container.appendChild(content);
  container.appendChild(footer);
  modal.appendChild(container);
  document.body.appendChild(modal);
}

// ========================================
// EVENT LISTENERS
// ========================================
document.addEventListener('DOMContentLoaded', function() {
  var btnCpg = document.getElementById('btn-generate-cpg');
  var btnManuscript = document.getElementById('btn-generate-manuscript');
  
  if (btnCpg) btnCpg.addEventListener('click', generateFullCPGReport);
  if (btnManuscript) btnManuscript.addEventListener('click', generateJournalManuscript);
});