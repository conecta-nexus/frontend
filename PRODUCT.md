# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **UFPS Systems Engineering Students (Semesters 6 to 10)**: Advanced undergraduate students fulfilling practical coursework, degree projects, and pre-professional engineering practices. They seek vetted, real problem statements from genuine organizations rather than simulated toy assignments.
- **Local Businesses & PYMEs (Small & Medium Enterprises)**: Regional organizations in Cúcuta and Norte de Santander needing digital transformation, software engineering solutions, process automation, or technical problem-solving, often operating with limited budgets.
- **Faculty Mentors & Academic Evaluators**: University professors overseeing specialized software engineering courses and evaluating student deliverables against institutional curricula.

## Product Purpose

Conecta Nexus bridges academic curriculum with regional industry needs. It creates a structured, trustworthy channel where local businesses submit real digital challenges, and upper-semester systems engineering students solve them as part of their academic coursework under faculty supervision. Success means students graduate with verified portfolio experience while local businesses successfully adopt modern software solutions.

## Positioning

Unlike commercial freelance marketplaces (Upwork, Fiverr) or generic job boards, Conecta Nexus is an **applied academic bridge embedded directly in the university curriculum**. Challenges are scoped to semester courses, backed by institutional mentorship, and protected by Colombian data privacy compliance (Ley Estatutaria 1581 de 2012).

## Operating Context

- **Academic Setting**: Universidad Francisco de Paula Santander (UFPS Cúcuta) — Systems Engineering Program.
- **Ecosystem Architecture**: Nuxt 4 + Vue 3 frontend communicating through an API Gateway to decoupled microservices (FastAPI and Django DRF) with PostgreSQL 16 database-per-service.
- **Delivery Cycles**: Structured sprint cycles aligned with university academic evaluation periods.
- **Regulatory Framework**: Colombian personal data protection law (Ley 1581 de 2012) requiring explicit, blocking, auditable informed consent.

## Capabilities and Constraints

- **Multi-Role Authentication**: Dedicated self-registration and credential management for Students (`@ufps.edu.co` required) and Companies, forbidding public creation of administrative accounts.
- **Academic Profile Integrity**: Strict validation of student semester (6th–10th) with immutable student code and academic program (RB-08/RF10).
- **Corporate Profiles**: Verified corporate data with mandatory Colombian tax identification (NIT) validation and restricted public views (RF08).
- **Challenge Directory & Applications**: Publishing, categorizing, and applying to technical challenges with status workflows.
- **Internationalization & Language Policy**: The end-user application interface and copy are entirely in Spanish (serving Colombian students, professors, and regional businesses), while all internal engineering code, branches, PRs, and commit messages remain strictly in English per institutional repository guidelines.

## Brand Commitments

- **Institutional Anchor**: Official UFPS Crimson Red (`#bc0017`), denoting university identity and academic backing.
- **Visual Aesthetic**: Meeko-inspired layout featuring bold high-impact typography, a floating capsule navbar, and playful pastel highlights that break away from sterile, bureaucratic educational portals.
- **Light Palette**: `#f7f2ee` (cream canvas), `#ffffff` (surface), `#f3c5ba` (pastel coral), `#595d62` (neutral slate WCAG AA), `#bc0017` (institutional red).
- **Dark Palette**: `#0f1218` (dark canvas), `#e8effd` (pastel ice blue), `#d7f5e8` (pastel mint), `#fde4cf` (pastel peach), `#bc0017` (institutional red).
- **Typography System (Self-Hosted)**:
  - **Primary Interface Font**: `Uncut Sans` (Kasper Pyndt) — modern geometric neo-brutalist sans-serif for headlines, navigation, buttons, numbers, and body text.

## Evidence on Hand

- `CONTRIBUTING.md`: Engineering and Git workflow guidelines.
- Technical Specifications (`.pdf/`):
  - Sprint 1 Technical Specification (Auth & Profile microservices).
  - Microservices division and architectural justifications.
  - GitHub Projects workflow and evaluation guides.
- Visual Reference: `meeko-reference-landing-without-scrolling-too-much.png` (Meeko template landing layout).

## Product Principles

1. **Dual-Sided Value**: Every challenge posted must simultaneously advance student academic competencies and provide practical digital transformation to the participating business.
2. **Institutional Rigor & Compliance**: Student verification, academic honesty, and statutory personal data protection (Ley 1581) are non-negotiable pillars.
3. **Approachable Modern Craft**: Educational software must not feel obsolete or administrative. It should feel fresh, responsive, and delightful to both university students and business owners.

## Accessibility & Inclusion

- Adherence to WCAG 2.1 Level AA color contrast across both Light and Dark themes.
- Responsive design tailored for mobile phones, tablets, and high-resolution desktop displays.
- Semantic HTML5 structure with complete keyboard navigability.
