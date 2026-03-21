# KSUMC CPG Platform — Technical Critique & Industry-Grade Roadmap

**Date:** March 21, 2026
**Auditor:** Platform Architecture Review
**Target:** https://majidalmadi-dot.github.io/CPG-platform/

---

## Executive Summary

The KSUMC CPG Platform is an ambitious prototype that demonstrates the *concept* of an AI-powered clinical practice guideline development system. It covers an impressive breadth of functionality: a 10-stage GRADE workflow, five AI skill modules (SR/MA, CEA, EtG, Health Policy, PHPSA), a Delphi consensus voting system, framework compliance dashboards, lifecycle tracking, and Gemini-powered AI streaming.

However, in its current form, **the platform is a functional prototype, not a production system**. Deploying it for real clinical guideline work would expose critical gaps in data integrity, security, scalability, and reliability. Below is an honest assessment of where it stands and what it would take to reach industry grade.

---

## Current State: What Works

- **Concept & Scope:** The platform correctly models the full CPG lifecycle (NICE/GIN-McMaster/GRADE/AGREE II/ADAPTE). The 10-stage workflow is clinically sound.
- **AI Integration:** Gemini streaming works. The 56 domain-specific system prompts are well-crafted and model-agnostic.
- **Single-File Deployment:** GitHub Pages hosting makes it instantly accessible — no server to manage.
- **Visual Quality:** The UI looks professional. Color-coded GRADE levels, progress bars, and framework compliance scores are well-designed.
- **Feature Breadth:** Delphi voting, COI management, topic scoring, EtR tables, PRISMA flow, forest plots, cost-effectiveness tools — the feature list is extensive.

---

## Critical Issues (Blockers for Real Use)

### 1. All Data Lives in localStorage — It Will Be Lost

**Severity: CRITICAL**

Every piece of data the platform stores — committee members, votes, recommendations, COI declarations, workflow progress, project metadata, the trash bin — is in the browser's `localStorage`. This means:

- If a user clears their browser data, **everything is gone forever**
- Data exists only on the specific browser on the specific device it was entered on
- Two users on different computers see completely different data
- There is no backup, no sync, no recovery
- localStorage has a ~5–10 MB limit — a serious guideline project will hit this

**What industry grade looks like:** A real database (PostgreSQL via Supabase, which is already partially integrated) with proper tables for projects, recommendations, votes, committee members, audit logs, and document versions. The Supabase tables `profiles`, `guidelines`, and `kv_store` exist but are barely used.

### 2. Security Is Superficial

**Severity: CRITICAL**

- **API key is hardcoded in source code** (line 25 of ai-engine.js): `AIzaSyBE_smT5wfFYR2baZetJ8FEqZ009p_Xz9g`. Anyone who views the page source gets this key. The `btoa`/string-reversal "obfuscation" provides zero actual protection — it takes 10 seconds to reverse.
- **Supabase credentials** are in client-side code (acceptable for Supabase, but Row Level Security must be configured — it's unclear if it is)
- **No role-based access control**: The admin check is a simple email string comparison (`currentUser.email === 'majid.almadi@gmail.com'`). There's no server-side enforcement — a user could modify JavaScript in the browser to bypass it.
- **No input sanitization**: User inputs are inserted into HTML via `innerHTML` throughout the codebase. This is an XSS (cross-site scripting) vulnerability. A malicious committee member could inject scripts through a recommendation text field.
- **The login gate is client-side only**: The `enforceLoginGate` function hides/shows DOM elements. A user could simply delete the login overlay in DevTools and access everything.

**What industry grade looks like:** API keys on a backend proxy (never in client code), Supabase Row Level Security policies, server-side role checks, input sanitization with `textContent` instead of `innerHTML`, and Content Security Policy headers.

### 3. The Codebase Is a Monolith That Can't Scale

**Severity: HIGH**

| Metric | Current | Industry Standard |
|--------|---------|-------------------|
| index.html | 1,787 lines, 143 KB | Split into components/pages |
| app.js | 5,936 lines, 363 KB | Modular files, <300 lines each |
| Inline styles | 711 instances | External CSS classes |
| Inline onclick handlers | 200 instances | Event listeners in JS |
| Modal creation patterns | 47 duplicated blocks | Reusable modal component |
| `var` declarations | 827 | `const`/`let` (zero `var`) |
| Test files | 0 | Comprehensive test suite |
| Build tools | None | Bundler, linter, minifier |
| Framework | None | React/Vue/Svelte |

Every page, every modal, every UI element is hand-assembled with string concatenation. Adding a new feature means editing a 6,000-line file and hoping nothing breaks. There's no way to safely refactor because there are no tests.

### 4. Data Is Hardcoded in HTML

**Severity: HIGH**

The five demo guidelines (T2DM, H. pylori, CRC, Hypertension, Asthma) are hardcoded directly in the HTML — their details, AGREE II scores, GIN scores, and metadata are all static strings. The `showGuidelineDetail` function contains a massive data object with all guideline content hardwired in JavaScript.

This means:
- You can't add a real guideline without editing code
- You can't update a guideline's status without a code deployment
- The "Active Guidelines" page doesn't reflect actual data — it's a fixed demo display

**What industry grade looks like:** Guidelines stored in a database, rendered dynamically. An admin panel to create/edit/publish guidelines. Version history tracked in the database.

### 5. Email Is mailto: Links, Not Real Email

**Severity: MEDIUM**

The Delphi voting email system opens `mailto:` links, which means:
- It depends on the user having a desktop email client configured
- On many systems, mailto: links open nothing or open the wrong app
- You can't track delivery, opens, or responses
- You can't send from a branded institutional address
- There's no voting link that routes members directly to their ballot

**What industry grade looks like:** A backend email service (SendGrid, AWS SES, or Supabase Edge Functions + Resend) that sends formatted HTML emails with unique voting tokens per member per round.

### 6. No Audit Trail

**Severity: HIGH (for clinical/regulatory context)**

Clinical practice guidelines are regulatory documents. NICE, GIN-McMaster, and AGREE II all require documented evidence of process. The platform currently has:
- No logging of who changed what and when
- No version history for recommendations or guideline text
- No record of individual committee votes (only aggregates in localStorage)
- No tamper-evident records

**What industry grade looks like:** Immutable audit log table in the database recording every action (vote cast, recommendation edited, status changed) with timestamps, user IDs, and before/after values.

---

## Moderate Issues

### 7. No Mobile Responsiveness
Only 7 media queries in the entire CSS. The platform is essentially unusable on phones and tablets. Committee members voting on the go will have a poor experience.

### 8. Accessibility Is Minimal
22 ARIA attributes across 1,787 lines of HTML. Screen reader support is minimal. Keyboard navigation is partially implemented but untested. Color contrast ratios haven't been verified. For a healthcare platform, accessibility isn't optional.

### 9. Error Handling Is Inconsistent
70 try/catch blocks across 5,936 lines sounds reasonable, but many critical operations (localStorage reads, API calls, DOM manipulations) have no error handling. When the Gemini API fails, the error message is technical rather than actionable.

### 10. No Offline Support / PWA
The platform requires an internet connection for everything, including viewing previously entered data (since it's static HTML loaded from GitHub Pages CDN). A Progressive Web App with a service worker would allow offline access.

---

## The Roadmap to Industry Grade

### Phase 1: Data Layer (4–6 weeks)
Move all data from localStorage to Supabase PostgreSQL. Design proper tables: `projects`, `recommendations`, `committee_members`, `votes`, `rounds`, `audit_log`, `documents`, `workflow_states`. Implement Row Level Security. Build a data migration to preserve any existing localStorage data.

### Phase 2: Security Hardening (2–3 weeks)
Move the Gemini API key to a Supabase Edge Function (backend proxy). Replace all `innerHTML` with safe DOM methods or a template engine. Implement server-side role checks. Add Content Security Policy headers. Remove client-side admin bypass vulnerability.

### Phase 3: Architecture Modernization (6–8 weeks)
Migrate to a component framework (React or Vue). Split the monolithic files into modules. Extract the 47 duplicated modal patterns into a reusable component. Replace inline styles with a design system (Tailwind or a custom token-based system). Add a build pipeline (Vite) with linting (ESLint) and formatting (Prettier).

### Phase 4: Real Email & Notifications (2–3 weeks)
Implement Supabase Edge Functions for sending Delphi voting invitations and reminders. Generate unique voting tokens. Build a standalone voting page that committee members access via email link (no login required — token-authenticated).

### Phase 5: Audit & Compliance (3–4 weeks)
Build an immutable audit log. Add version control for guideline documents. Implement digital signatures for consensus decisions. Generate compliance reports showing process adherence to GIN-McMaster, AGREE II, and NICE standards.

### Phase 6: Testing & Quality (3–4 weeks)
Write unit tests for all business logic (voting consensus calculation, GRADE scoring, topic prioritization). Add end-to-end tests for critical workflows. Set up CI/CD with GitHub Actions. Add error monitoring (Sentry or similar).

### Phase 7: UX Polish (2–3 weeks)
Full mobile responsive redesign. Accessibility audit and remediation to WCAG 2.1 AA. Loading states, empty states, and error states for every view. Onboarding flow for new users.

**Total estimated effort: 22–31 weeks of focused development** (1 senior full-stack developer) to reach a production-ready MVP. A team of 2–3 developers could compress this to 3–4 months.

---

## Honest Bottom Line

What you have is a **remarkable interactive prototype** that demonstrates deep domain knowledge of the CPG development process. The clinical workflow is sound, the AI integration concept is valid, and the feature breadth is impressive for what is essentially a single-page HTML application.

But it's a prototype. Using it to develop actual clinical guidelines that affect patient care would be risky because: data can be lost at any time, there's no audit trail for regulatory compliance, security is cosmetic, and there's no multi-user collaboration (everyone sees different data on their own browser).

The good news: the hardest part — understanding the domain and designing the workflow — is done. The path from prototype to production is well-defined engineering work, not a research problem. The Supabase integration is already partially there. The AI prompts are model-agnostic and well-structured. The visual design is professional.

The platform needs to transition from "impressive demo" to "trusted tool." That transition is about data integrity, security, and reliability — not more features.
