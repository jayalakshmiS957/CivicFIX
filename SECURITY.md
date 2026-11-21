# Security Policy & Architecture

This document outlines the security architecture, authentication protocols, defense-in-depth mechanisms, and vulnerability reporting procedures implemented in **CivicResolve**.

---

## 1. Key & Secret Handling

- **Environment Variable Isolation:** Sensitive credentials (`GEMINI_API_KEY`, `JWT_SECRET`) are loaded strictly on the server from environment variables. They are never bundled into client-side assets or exposed in browser network responses.
- **Git Hygiene:** Local configuration files (`.env`, `.env.local`) are excluded in `.gitignore`. A documented template (`.env.example`) is provided for local and CI deployment.
- **Fail-Safe Fallback:** If `GEMINI_API_KEY` is not configured or exceeds quota, the server automatically transitions to an offline deterministic keyword classifier without service disruption or secret leakage.

---

## 2. Authentication & Authorization Model

- **Session Security:** Authentication is stateless via signed JSON Web Tokens (`JWT`) transmitted in HTTP-only, `sameSite: 'lax'` secure cookies (with `secure: true` in production and on Vercel). This mitigates Cross-Site Scripting (XSS) token extraction.
- **Password Protection:** Citizen and administrator passwords are encrypted using `bcryptjs` with salt rounds = 10. Raw passwords are never persisted or logged.
- **Role-Based Guards (RBAC):** Every API endpoint is guarded by explicit middleware:
  - `requireAuth`: Enforces valid JWT token presence.
  - `requireRole('admin')`: Restricts administrative triage, status overrides, and work assignment exclusively to municipal personnel. Citizens receive `403 Forbidden`.
  - Non-reporting citizens cannot submit follow-up details or reopen complaints belonging to other residents.
- **Portal Separation & OTP Verification:**
  - Citizen portal (`/login`): Displays citizen demo accounts with instant 1-step login. Rejects administrator accounts with a direct redirection link to the admin portal.
  - Administrator portal (`/admin/login`): Dedicated login screen with 2-step authentication requiring password and OTP verification code `123456`. Rejects citizen accounts with `403 Forbidden`.
  - Registration & regular citizen logins require 6-digit OTP verification with 5-minute expiry, 30s resend timer cooldown, and a 3-attempt limit.

---

## 3. Privacy & Data Minimization

- **Public Endpoint Scrubbing:** The `formatReporterForUser` formatter automatically removes reporter email addresses on public issue endpoints.
- **Mobile Number Masking:** Mobile numbers are normalized and masked across the UI (`98XXXXX210`) to safeguard personal citizen contact details from scrapers and unauthorized users.

---

## 4. Rate Limiting & Abuse Prevention

Using `express-rate-limit`, distinct rate limiting tiers protect sensitive endpoints from denial of service and automated credential stuffing:
- **Auth Limiter:** Protects `/api/auth/login`, `/api/auth/register`, `/api/auth/send-otp`, `/api/auth/verify-otp`, and `/api/auth/admin-login` against brute force.
- **AI Limiter:** Throttles `/api/issues` submission and `/api/voice/parse` to prevent API token exhaustion.
- **CivicVoice Support Limiter:** Limits rapid toggling of the support/upvote endpoint.
- **General API Limiter:** Applied globally across all `/api/*` endpoints.

---

## 5. Input Validation & Prompt Injection Defense

- **Client & Server Schema Validation:** Form and API inputs (`title`, `description`, `coordinates`, `category`) are validated on boundaries with length, numerical range, and enum constraints.
- **XSS Sanitization:** Dangerous HTML/XML brackets are stripped from title and description inputs before processing.
- **AI Prompt-Injection Shield:** All user text is wrapped in defensive boundary tags `<USER_CIVIC_REPORT_DATA>` accompanied by strict system instructions directing the model to treat input strictly as passive descriptive data and ignore system-override instructions.

---

## 6. How to Report a Vulnerability

If you identify a security vulnerability in CivicResolve:
1. **Do not disclose publicly:** Please do not open public GitHub issues or discussions for unresolved vulnerabilities.
2. **Contact Email:** Send an email with reproduction steps and impact details to `security@civicresolve.gov` (or the project repository maintainer).
3. **Response Timeline:** Maintainers will review and acknowledge security reports within 48 hours and coordinate a patch before public disclosure.
