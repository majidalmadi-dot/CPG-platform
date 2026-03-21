#!/usr/bin/env python3
"""
Dynamic CPG Project Data Generator for KSUMC Platform
Injects real clinical guideline project data into index.html
"""

import re
from datetime import datetime, timedelta

# ============================================================
# PROJECT DATA STORE
# ============================================================

PROJECTS = [
    # Published projects
    {
        "id": "t2dm",
        "title": "Type 2 Diabetes Mellitus — Adult Management",
        "code": "KSUMC-CPG-2024-001",
        "version": "v2.1",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Endocrinology",
        "pathway": "de_novo",
        "publishDate": "2024-01-15",
        "reviewDue": "2027-01-15",
        "agreeII": 91,
        "ginScore": "16/18",
        "recommendations": 14,
        "panelSize": 9,
        "lastActivity": {"text": "Published v2.1, final NSC approval", "timeAgo": "2mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "htn",
        "title": "Hypertension — Primary Care",
        "code": "KSUMC-CPG-2024-005",
        "version": "v1.2",
        "status": "published",
        "stage": "published",
        "department": "MOH",
        "domain": "Cardiology",
        "pathway": "adapte",
        "publishDate": "2024-03-10",
        "reviewDue": "2027-03-10",
        "agreeII": 88,
        "ginScore": "15/18",
        "recommendations": 11,
        "panelSize": 8,
        "lastActivity": {"text": "Published v1.2, ADAPTE from ESC/ESH", "timeAgo": "1mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "ckd",
        "title": "Chronic Kidney Disease Management",
        "code": "KSUMC-CPG-2023-008",
        "version": "v1.0",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Nephrology",
        "pathway": "de_novo",
        "publishDate": "2023-09-20",
        "reviewDue": "2026-09-20",
        "agreeII": 85,
        "ginScore": "14/18",
        "recommendations": 12,
        "panelSize": 7,
        "lastActivity": {"text": "Published v1.0", "timeAgo": "6mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "vte",
        "title": "VTE Prophylaxis in Hospitalized Patients",
        "code": "KSUMC-CPG-2023-011",
        "version": "v1.1",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Hematology",
        "pathway": "de_novo",
        "publishDate": "2023-11-05",
        "reviewDue": "2026-11-05",
        "agreeII": 90,
        "ginScore": "17/18",
        "recommendations": 9,
        "panelSize": 6,
        "lastActivity": {"text": "Published v1.1", "timeAgo": "4mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "sepsis",
        "title": "Sepsis and Septic Shock Management",
        "code": "KSUMC-CPG-2024-009",
        "version": "v2.0",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Critical Care",
        "pathway": "de_novo",
        "publishDate": "2024-06-01",
        "reviewDue": "2027-06-01",
        "agreeII": 93,
        "ginScore": "18/18",
        "recommendations": 18,
        "panelSize": 10,
        "lastActivity": {"text": "Published v2.0, NSC consensus", "timeAgo": "3 weeks ago"},
        "stageDetail": "Published"
    },
    {
        "id": "dfcare",
        "title": "Diabetic Foot Care and Prevention",
        "code": "KSUMC-CPG-2024-004",
        "version": "v1.0",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Surgery/Vascular",
        "pathway": "de_novo",
        "publishDate": "2024-02-14",
        "reviewDue": "2027-02-14",
        "agreeII": 82,
        "ginScore": "13/18",
        "recommendations": 10,
        "panelSize": 7,
        "lastActivity": {"text": "Published v1.0", "timeAgo": "2mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "epilepsy",
        "title": "Epilepsy Management in Adults",
        "code": "KSUMC-CPG-2023-009",
        "version": "v1.0",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Neurology",
        "pathway": "de_novo",
        "publishDate": "2023-08-10",
        "reviewDue": "2026-08-10",
        "agreeII": 86,
        "ginScore": "14/18",
        "recommendations": 13,
        "panelSize": 6,
        "lastActivity": {"text": "Published v1.0", "timeAgo": "7mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "antimicrobial",
        "title": "Antimicrobial Stewardship Program",
        "code": "KSUMC-CPG-2024-014",
        "version": "v1.3",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Infectious Disease",
        "pathway": "de_novo",
        "publishDate": "2024-12-01",
        "reviewDue": "2027-12-01",
        "agreeII": 94,
        "ginScore": "18/18",
        "recommendations": 16,
        "panelSize": 8,
        "lastActivity": {"text": "Published v1.3, final NSC approval", "timeAgo": "2mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "anemia",
        "title": "Iron Deficiency Anemia Management",
        "code": "KSUMC-CPG-2024-007",
        "version": "v1.0",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Hematology",
        "pathway": "de_novo",
        "publishDate": "2024-04-12",
        "reviewDue": "2027-04-12",
        "agreeII": 87,
        "ginScore": "15/18",
        "recommendations": 8,
        "panelSize": 5,
        "lastActivity": {"text": "Published v1.0", "timeAgo": "1mo ago"},
        "stageDetail": "Published"
    },
    {
        "id": "thyroid",
        "title": "Thyroid Disorders and Dysfunction",
        "code": "KSUMC-CPG-2023-010",
        "version": "v1.1",
        "status": "published",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Endocrinology",
        "pathway": "de_novo",
        "publishDate": "2023-07-20",
        "reviewDue": "2026-07-20",
        "agreeII": 83,
        "ginScore": "13/18",
        "recommendations": 11,
        "panelSize": 6,
        "lastActivity": {"text": "Published v1.1", "timeAgo": "8mo ago"},
        "stageDetail": "Published"
    },
    # Overdue project
    {
        "id": "hpylori",
        "title": "H. pylori Eradication Therapy",
        "code": "KSUMC-CPG-2022-003",
        "version": "v1.1",
        "status": "overdue",
        "stage": "published",
        "department": "KSUMC",
        "domain": "Gastroenterology",
        "pathway": "de_novo",
        "publishDate": "2022-06-01",
        "reviewDue": "2025-06-01",
        "agreeII": 72,
        "ginScore": "11/18",
        "recommendations": 8,
        "panelSize": 5,
        "lastActivity": {"text": "Review overdue, needs update", "timeAgo": "9mo ago"},
        "stageDetail": "OVERDUE"
    },
    # Under review project
    {
        "id": "crc",
        "title": "Colorectal Cancer Screening Protocol",
        "code": "KSUMC-CPG-2023-012",
        "version": "v1.2",
        "status": "review",
        "stage": "external_review",
        "department": "NTP",
        "domain": "Oncology",
        "pathway": "de_novo",
        "publishDate": "2023-03-15",
        "reviewDue": "2026-03-15",
        "agreeII": 84,
        "ginScore": "15/18",
        "recommendations": 10,
        "panelSize": 9,
        "lastActivity": {"text": "External review comments received", "timeAgo": "1 week ago"},
        "stageDetail": "Under Review"
    },
    # In development projects
    {
        "id": "asthma",
        "title": "Asthma Management in Adults",
        "code": "KSUMC-CPG-2025-002",
        "version": "v0.8",
        "status": "in_dev",
        "stage": "etr_consensus",
        "department": "Saudi Thoracic Society",
        "domain": "Pulmonology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 12,
        "lastActivity": {"text": "Delphi Round 2 voting closed, 85% consensus reached", "timeAgo": "5 hours ago"},
        "stageDetail": "Delphi Consensus"
    },
    {
        "id": "nafld",
        "title": "NAFLD and NASH Management",
        "code": "KSUMC-CPG-2025-003",
        "version": "v0.9",
        "status": "external_review",
        "stage": "external_review",
        "department": "KSUMC",
        "domain": "Hepatology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 10,
        "lastActivity": {"text": "Sent to 3 external reviewers", "timeAgo": "6 days ago"},
        "stageDetail": "External Review"
    },
    {
        "id": "htpreg",
        "title": "Hypertension in Pregnancy",
        "code": "KSUMC-CPG-2025-004",
        "version": "v0.6",
        "status": "in_dev",
        "stage": "grade_appraisal",
        "department": "KSUMC",
        "domain": "OB/GYN",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 9,
        "lastActivity": {"text": "GRADE appraisal in progress", "timeAgo": "3 weeks ago"},
        "stageDetail": "GRADE Appraisal"
    },
    {
        "id": "hf",
        "title": "Heart Failure Management",
        "code": "KSUMC-CPG-2025-001",
        "version": "v0.5",
        "status": "in_dev",
        "stage": "grade_appraisal",
        "department": "KSUMC",
        "domain": "Cardiology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 11,
        "lastActivity": {"text": "AI completed GRADE evidence profiles", "timeAgo": "3 days ago"},
        "stageDetail": "GRADE Profiles"
    },
    {
        "id": "retinop",
        "title": "Diabetic Retinopathy Screening",
        "code": "KSUMC-CPG-2025-005",
        "version": "v0.1",
        "status": "in_dev",
        "stage": "scoping",
        "department": "MOH",
        "domain": "Ophthalmology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 8,
        "lastActivity": {"text": "Topic nomination submitted to NSC", "timeAgo": "2 weeks ago"},
        "stageDetail": "Scoping"
    },
    {
        "id": "sickle",
        "title": "Sickle Cell Disease Management",
        "code": "KSUMC-CPG-2025-006",
        "version": "v0.2",
        "status": "in_dev",
        "stage": "scoping",
        "department": "KSUMC",
        "domain": "Hematology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 7,
        "lastActivity": {"text": "PICO framework approved by Technical Committee", "timeAgo": "1 week ago"},
        "stageDetail": "PICO Approved"
    },
    {
        "id": "ra",
        "title": "Rheumatoid Arthritis Treatment",
        "code": "KSUMC-CPG-2025-007",
        "version": "v0.4",
        "status": "in_dev",
        "stage": "evidence_search",
        "department": "KSUMC",
        "domain": "Rheumatology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 10,
        "lastActivity": {"text": "PubMed search returned 847 results, screening started", "timeAgo": "2 days ago"},
        "stageDetail": "Evidence Search"
    },
    {
        "id": "obesity",
        "title": "Pediatric Obesity Management",
        "code": "KSUMC-CPG-2025-008",
        "version": "v0.3",
        "status": "in_dev",
        "stage": "evidence_search",
        "department": "KSUMC",
        "domain": "Pediatrics",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 9,
        "lastActivity": {"text": "Search strategy validated by methodologist", "timeAgo": "4 days ago"},
        "stageDetail": "Search Strategy"
    },
    {
        "id": "breastcancer",
        "title": "Breast Cancer Screening Guidelines",
        "code": "KSUMC-CPG-2025-009",
        "version": "v0.9",
        "status": "external_review",
        "stage": "external_review",
        "department": "KSUMC",
        "domain": "Oncology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 14,
        "lastActivity": {"text": "Sent for international expert review", "timeAgo": "2 weeks ago"},
        "stageDetail": "International Review"
    },
    {
        "id": "osteoporosis",
        "title": "Osteoporosis Screening and Treatment",
        "code": "KSUMC-CPG-2025-010",
        "version": "v0.4",
        "status": "in_dev",
        "stage": "evidence_search",
        "department": "KSUMC",
        "domain": "Endocrinology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 8,
        "lastActivity": {"text": "Systematic review protocol registered", "timeAgo": "3 weeks ago"},
        "stageDetail": "Protocol Review"
    },
    {
        "id": "pain",
        "title": "Chronic Pain Management",
        "code": "KSUMC-CPG-2025-011",
        "version": "v0.1",
        "status": "in_dev",
        "stage": "scoping",
        "department": "KSUMC",
        "domain": "Anesthesia",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 6,
        "lastActivity": {"text": "Topic scoping initiated", "timeAgo": "1 month ago"},
        "stageDetail": "Scoping"
    },
    {
        "id": "stroke",
        "title": "Acute Stroke Management",
        "code": "KSUMC-CPG-2025-012",
        "version": "v0.7",
        "status": "in_dev",
        "stage": "grade_appraisal",
        "department": "KSUMC",
        "domain": "Neurology",
        "pathway": "de_novo",
        "publishDate": None,
        "reviewDue": None,
        "agreeII": None,
        "ginScore": None,
        "recommendations": None,
        "panelSize": 11,
        "lastActivity": {"text": "RoB assessment 80% complete", "timeAgo": "2 weeks ago"},
        "stageDetail": "RoB Assessment"
    },
]


def read_html(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        return f.read()


def write_html(filepath, content):
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)


def generate_dashboard_html():
    """Generate dynamic dashboard HTML"""
    published = [p for p in PROJECTS if p['status'] == 'published']
    in_dev = [p for p in PROJECTS if p['status'] == 'in_dev']
    total_panel = sum(p['panelSize'] for p in PROJECTS)
    
    # Build stats
    stats_html = f"""<div class="grid g4">
<div class="stat"><div class="sv">{len(published)}</div><div class="sl">Published Guidelines</div><div class="sc up">↑ {len([p for p in published if p['publishDate'] and '2024' in p['publishDate']])} new this year</div></div>
<div class="stat"><div class="sv">{len(in_dev)}</div><div class="sl">In Development</div><div class="sc up">↑ {len([p for p in in_dev if p['stage'] in ['etr_consensus', 'grade_appraisal']])} advancing</div></div>
<div class="stat"><div class="sv">{total_panel}</div><div class="sl">Panel Members</div><div class="sc up">{len(set(p['department'] for p in PROJECTS))} committees</div></div>
<div class="stat" style="border-left:3px solid var(--ai1)"><div class="sv" style="color:var(--ai1)">5</div><div class="sl">AI Skills Active</div><div class="sc up">All engines online</div></div>
</div>"""
    
    # Build kanban columns
    kanban_html = '<div class="kanban">'
    
    # Define stages and colors
    stages = [
        ('scoping', 'Scoping & PICO', 'var(--info)'),
        ('evidence_search', 'Evidence Search', 'var(--s)'),
        ('grade_appraisal', 'GRADE Appraisal', 'var(--warn)'),
        ('etr_consensus', 'EtR & Consensus', 'var(--a)'),
        ('external_review', 'External Review', 'var(--ok)'),
    ]
    
    for stage_key, stage_label, color in stages:
        stage_projects = [p for p in PROJECTS if p['stage'] == stage_key]
        kanban_html += f"""<div class="kb-col"><div class="kb-ct"><span style="width:7px;height:7px;border-radius:50%;background:{color}"></span>{stage_label}</div>"""
        
        for proj in stage_projects[:2]:  # Limit to 2 per column for cleanliness
            kanban_html += f"""<div class="kb-card" onclick="showGuidelineDetail('{proj['id']}')"><h4>{proj['title']}</h4><p>{proj['department']} · {proj['domain']}</p><div style="margin-top:6px"><span class="badge b-i">{proj['stageDetail']}</span></div></div>"""
        
        kanban_html += '</div>'
    
    kanban_html += '</div>'
    
    # Build recent activity timeline
    activity_projects = sorted(PROJECTS, key=lambda p: p['lastActivity']['timeAgo'], reverse=False)[:5]
    activity_html = '<div class="tl">'
    for proj in activity_projects:
        activity_html += f"""<div class="tl-i"><div class="tl-d"></div><div><strong>{proj['title']}</strong> — {proj['lastActivity']['text']} <span style="font-size:10px;color:var(--tl)">{proj['lastActivity']['timeAgo']}</span></div></div>"""
    activity_html += '</div>'
    
    return stats_html, kanban_html, activity_html


def generate_lifecycle_html():
    """Generate dynamic lifecycle tracker HTML"""
    # Sort: overdue first, then in_dev, then review, then published
    sorted_projects = sorted(PROJECTS, key=lambda p: (
        0 if p['status'] == 'overdue' else
        1 if p['status'] == 'in_dev' else
        2 if p['status'] == 'review' else
        3
    ))
    
    # Build table rows
    table_html = """<table>
<tr><th>Guideline</th><th>Ver</th><th>Status</th><th>Published</th><th>Review Due</th><th>AGREE II</th><th>GIN</th><th></th><th></th></tr>
"""
    
    for proj in sorted_projects:
        status_badge = {
            'published': '<span class="badge b-ok">Published</span>',
            'overdue': '<span class="badge b-err">Overdue</span>',
            'review': '<span class="badge b-i">Review</span>',
            'in_dev': '<span class="badge b-w">In Dev</span>',
            'external_review': '<span class="badge b-i">External</span>',
        }[proj['status']]
        
        agree_val = f"<span style=\"color:var(--ok);font-weight:600\">{proj['agreeII']}%</span>" if proj['agreeII'] else "<span style=\"color:var(--tl)\">—</span>"
        gin_val = f"<span style=\"color:var(--ok);font-weight:600\">{proj['ginScore']}</span>" if proj['ginScore'] else "<span style=\"color:var(--tl)\">—</span>"
        
        pub_date = proj['publishDate'] if proj['publishDate'] else "—"
        review_due = proj['reviewDate'] if 'reviewDate' in proj else (proj['reviewDue'] if proj['reviewDue'] else "—")
        
        # Overdue warning
        if proj['status'] == 'overdue':
            review_due = f"<span style=\"color:var(--err);font-weight:600\">{review_due} ⚠️</span>"
        elif proj['status'] == 'review' and proj['reviewDue']:
            review_due = f"<span style=\"color:var(--warn)\">{review_due}</span>"
        
        table_html += f"""<tr data-gl-id="{proj['id']}" style="cursor:pointer" onclick="showGuidelineDetail('{proj['id']}')"><td><strong>{proj['title']}</strong><br><span style="font-size:10px;color:var(--tl)">{proj['code']}</span></td><td>{proj['version']}</td><td>{status_badge}</td><td>{pub_date}</td><td>{review_due}</td><td>{agree_val}</td><td>{gin_val}</td><td><button class="btn btn-sm btn-o" onclick="event.stopPropagation()">View →</button></td><td><button class="btn btn-sm" style="color:var(--err);font-size:11px" onclick="event.stopPropagation();archiveGuideline('{proj['id']}','{proj['title']}')" title="Move to trash">🗑️</button></td></tr>
"""
    
    table_html += '</table>'
    
    # Build published repository
    published = [p for p in PROJECTS if p['status'] == 'published']
    repo_html = '<div class="grid g3">'
    
    for proj in published[:9]:  # Show first 9 published
        repo_html += f"""<div class="card" data-gl-id="{proj['id']}" style="border-left:4px solid var(--ok);cursor:pointer" onclick="showGuidelineDetail('{proj['id']}')">
<div style="display:flex;justify-content:space-between;align-items:center"><span class="badge b-ok">Published {proj['version']}</span><span style="font-size:10px;color:var(--tl)">📄 PDF</span></div>
<h3 style="font-size:13px;margin:8px 0 3px">{proj['title']}</h3>
<p style="font-size:11px;color:var(--tl)">{proj['code']} · {proj['domain']} · {proj['recommendations']} recommendations · AGREE II: {proj['agreeII']}%</p>
<div style="font-size:10px;color:var(--tl);margin-top:6px">📅 Published: {proj['publishDate']} · 📋 Next review: {proj['reviewDue']}</div>
</div>"""
    
    repo_html += '</div>'
    
    # Build analytics stats
    avg_agree = int(sum(p['agreeII'] for p in published) / len(published)) if published else 0
    analytics_html = f"""<div class="grid g4">
<div class="stat"><div class="sv">{len(published)}</div><div class="sl">Published</div></div>
<div class="stat"><div class="sv">{avg_agree}%</div><div class="sl">Avg AGREE II</div></div>
<div class="stat"><div class="sv">14.2mo</div><div class="sl">Avg Dev Time</div></div>
<div class="stat"><div class="sv">78%</div><div class="sl">On-time Review</div></div>
</div>"""
    
    return table_html, repo_html, analytics_html


def generate_js_data():
    """Generate JavaScript project data array"""
    js_code = """
// ============================================================
// CPG PROJECT DATA STORE
// ============================================================
const CPG_PROJECTS = """ + str(PROJECTS).replace("'", '"') + """;

// ============================================================
// RENDER FUNCTIONS
// ============================================================

function renderDashboard() {
    const published = CPG_PROJECTS.filter(p => p.status === 'published');
    const inDev = CPG_PROJECTS.filter(p => p.status === 'in_dev');
    const totalPanel = CPG_PROJECTS.reduce((sum, p) => sum + p.panelSize, 0);
    const newThisYear = published.filter(p => p.publishDate && p.publishDate.includes('2024')).length;
    const advancing = inDev.filter(p => ['etr_consensus', 'grade_appraisal'].includes(p.stage)).length;
    const committees = new Set(CPG_PROJECTS.map(p => p.department)).size;
    
    // Update stats
    const statValues = document.querySelectorAll('#p-dashboard .stat .sv');
    if (statValues[0]) statValues[0].textContent = published.length;
    if (statValues[1]) statValues[1].textContent = inDev.length;
    if (statValues[2]) statValues[2].textContent = totalPanel;
    
    // Update stat descriptions
    const statDesc = document.querySelectorAll('#p-dashboard .stat .sc');
    if (statDesc[0]) statDesc[0].textContent = '↑ ' + newThisYear + ' new this year';
    if (statDesc[1]) statDesc[1].textContent = '↑ ' + advancing + ' advancing';
    if (statDesc[2]) statDesc[2].textContent = committees + ' committees';
}

function renderLifecycle() {
    const sorted = CPG_PROJECTS.sort((a, b) => {
        const order = {'overdue': 0, 'in_dev': 1, 'review': 2, 'published': 3};
        return (order[a.status] || 99) - (order[b.status] || 99);
    });
    
    const published = CPG_PROJECTS.filter(p => p.status === 'published');
    const avgAgree = Math.round(published.reduce((sum, p) => sum + (p.agreeII || 0), 0) / (published.length || 1));
    
    // Update analytics
    const statVals = document.querySelectorAll('#p-lifecycle .stat .sv');
    if (statVals[0]) statVals[0].textContent = published.length;
    if (statVals[1]) statVals[1].textContent = avgAgree + '%';
}

// Call render functions on page load
document.addEventListener('DOMContentLoaded', () => {
    renderDashboard();
    renderLifecycle();
});
"""
    return js_code


def main():
    """Main process"""
    html_path = '/tmp/cpg-push/index.html'
    
    print("Reading HTML file...")
    html_content = read_html(html_path)
    
    print("Generating dynamic content...")
    stats_html, kanban_html, activity_html = generate_dashboard_html()
    table_html, repo_html, analytics_html = generate_lifecycle_html()
    js_code = generate_js_data()
    
    # Replace dashboard content placeholder
    print("Updating dashboard section...")
    # Find and update the stats in dashboard
    dashboard_pattern = r'(<div class="page active" id="p-dashboard"[^>]*>)\s*(<div class="grid g4">.*?</div>)'
    html_content = re.sub(
        dashboard_pattern,
        r'\1\n' + stats_html,
        html_content,
        flags=re.DOTALL
    )
    
    # Replace lifecycle table
    print("Updating lifecycle table...")
    lifecycle_pattern = r'(<div class="page" id="p-lifecycle"[^>]*>.*?<div class="card">.*?<div class="card-t"[^>]*>Guideline Lifecycle Tracker</div>)\s*(<table>.*?</table>)'
    html_content = re.sub(
        lifecycle_pattern,
        r'\1\n' + table_html,
        html_content,
        flags=re.DOTALL
    )
    
    # Inject JS before </body>
    print("Injecting JavaScript data store...")
    body_close = '</body>'
    if body_close in html_content:
        js_inject = '\n<script>\n' + js_code + '\n</script>\n'
        html_content = html_content.replace(body_close, js_inject + body_close)
    
    print("Writing updated HTML...")
    write_html(html_path, html_content)
    
    print(f"✓ Successfully updated {html_path}")
    print(f"  - Injected {len(PROJECTS)} CPG projects")
    print(f"  - {len([p for p in PROJECTS if p['status'] == 'published'])} published guidelines")
    print(f"  - {len([p for p in PROJECTS if p['status'] == 'in_dev'])} in development")
    print(f"  - {len([p for p in PROJECTS if p['status'] == 'overdue'])} overdue")
    print(f"  - {len([p for p in PROJECTS if p['status'] == 'review'])} under review")
    print(f"  - {len([p for p in PROJECTS if p['status'] == 'external_review'])} in external review")


if __name__ == '__main__':
    main()
