---
target: main page
total_score: 10
max_score: 32
na_heuristics: 5,9
p0_count: 1
p1_count: 1
target_identity: "file:/home/anorak/Code/microservices-college/conecta-nexus/frontend/app/pages/index.vue"
target_fingerprint: "sha256:0bc0334ac549e9b286da58379b37a53a94e2a7c36cc1b32ab8a3a2955cfc40a0"
target_path: /home/anorak/Code/microservices-college/conecta-nexus/frontend/app/pages/index.vue
timestamp: 2026-10-18T23-23-19Z
slug: app-pages-index-vue
---
# Critique: Conecta Nexus Main Page

**Target**: `app/pages/index.vue`  
**Date**: 2026-10-18  

## Nielsen's 10 Heuristics Score

| # | Heuristic | Score (0–4) | Key Issue |
|---|---|:---:|---|
| 1 | Visibility of System Status | 1 | No indicator of current academic term (e.g. Semestre 2026-1), submission cycles, or user auth state |
| 2 | Match System / Real World | 1 | Clipart metaphors (drink with straw, pen tool) completely detached from systems engineering and enterprise automation |
| 3 | User Control and Freedom | 2 | Theme switching is fluid, but dead anchor links (#retos, #empresas) trap users in dead ends |
| 4 | Consistency and Standards | 2 | CSS tokens in main.css are solid, but social media buttons are prioritized over role-based login/registration |
| 5 | Error Prevention | n/a | Persuasion landing surface with no transactional forms |
| 6 | Recognition Rather Than Recall | 2 | Cards show titles and spots, but lack semester level, tech stack, and duration |
| 7 | Flexibility and Efficiency | 1 | Zero audience bifurcation; engineering students and PYME owners get the identical generic view |
| 8 | Aesthetic and Minimalist Design | 2 | Good typographic scale, but high extraneous noise from rotating stickers, sparkles, and soundwave lines |
| 9 | Error Recovery | n/a | Persuasion landing surface with no form error states |
| 10 | Help and Documentation | 1 | Missing explanation of the three-way model (student-business-faculty) and Ley 1581 compliance |
| **Total** | | **10/32** | **Critical Rework Required (31.2%)** |

## Design Specificity Verdict

**Verdict**: FAILED SPECIFICITY — CARICATURE PORTFOLIO MIMICRY  
The current interface is a literal copy of a freelance creative design portfolio (Meeko), merely reskinned with software engineering terms. Conecta Nexus is an institutional platform for UFPS engineering students solving real corporate problems for regional PYMEs under faculty supervision. Cartoon beverage cups, vector pen tools, peace signs, and informal greetings undermine institutional credibility and fail both student and business audiences.

## Overall Impression
While the pastel token architecture, typographic scale, and stacked card motif provide a strong foundation, the tone, copy, and decorative elements project a quirky personal blog instead of a credible academic-industry platform.

## What's Working
1. **Pastel & Institutional Token Engine (`main.css`)**: Clean integration of UFPS Red (#bc0017) with soft pastels (#f7f2ee, #f3c5ba, #d7f5e8, #e8effd).
2. **Display Typographic Scale**: Confident, readable headline sizing and clean layout rhythm.
3. **Stacked Card Depth Pattern (`LandingCardStack.vue`)**: Tactile card deck motif that gives physical presence to problem statements.

## Priority Issues

### [P0] Hero Narrative & Clipart Caricature
- **What**: Freelance portfolio greeting ("¡Hola! 👋 Somos Conecta...") with irrelevant clipart (drink with straw, pen tool, sparkles, soundwaves, peace signs).
- **Why it matters**: Destroys enterprise and academic credibility; local PYMEs will not trust their operations to what looks like a design hobby site.
- **Fix**: Remove all cartoon doodles and soundwaves; replace with informative institutional chips (Semestre 2026-1, Supervisión UFPS, Convenio PYMEs); rewrite headline to focus on regional industry meeting UFPS engineering talent.
- **Suggested Command**: `/impeccable polish LandingHero.vue`

### [P1] Missing Role Routing & Authentication in Navbar
- **What**: Social icons (Twitter/X, Globe, Instagram) and dead anchors instead of user authentication.
- **Why it matters**: Conecta Nexus requires strict multi-role onboarding (student @ufps.edu.co vs company NIT). Users currently cannot register or log in.
- **Fix**: Replace social links with actionable portal buttons: "Ingreso Estudiantes" and "Portal Empresas / Publicar Reto".
- **Suggested Command**: `/impeccable clarify LandingNavbar.vue`

### [P2] Absence of Academic Trust & Regulatory Scaffolding
- **What**: Zero visible mention of faculty mentoring, curricular evaluation, or data privacy (Ley 1581 de 2012).
- **Why it matters**: PYMEs will not share real business problematics without confidentiality and faculty oversight guarantees.
- **Fix**: Introduce a compact trust strip below the hero with UFPS backing, faculty mentoring, and Ley 1581 compliance badges.
- **Suggested Command**: `/impeccable harden LandingHero.vue`

### [P3] Non-Contextual Challenge Cards
- **What**: Challenge cards display titles and spots but lack semester level, tech stack, and duration.
- **Why it matters**: Students cannot identify if a challenge matches their semester (6th–10th) or coursework requirements.
- **Fix**: Add metadata pills: Semestre 8+, Stack Tecnológico, Duración (16 Semanas), NIT Verificado.
- **Suggested Command**: `/impeccable distill LandingCardStack.vue`

## Persona Red Flags
- **Mateo (8th-sem Student)**: Cannot find login with @ufps.edu.co, no semester filters, unclear if challenges grant academic course credit.
- **Carlos (PYME Owner)**: Alarmed by cartoon drinks and peace signs; questions whether students will handle corporate data securely under Ley 1581.
- **Prof. Pardo (Faculty Evaluator)**: Cannot see the curricular supervision framework; platform looks like an external freelance agency rather than a university incubator.

## Minor Observations
- Hardcoded dark shadows in cards (rgba(0,0,0,1)) instead of dynamic theme-aware elevation tokens.
- Navbar lacks mobile menu drawer for screens under 1024px.

## Questions to Consider
- What if the hero immediately established trust by showing the 3 pillars: Estudiantes UFPS, Empresas Regionales, and Mentoría Docente?
- How can we retain the fresh pastel colors while replacing freelance clipart with actual technical and institutional indicators?
