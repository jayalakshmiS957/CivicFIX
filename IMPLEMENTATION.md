# CivicResolve Implementation & Architecture

This document describes the engineering design, components, AI pipeline, data repositories, and architectural decisions behind CivicResolve.

---

## 1. System Architecture

CivicResolve is built as an end-to-end civic intelligence platform with a decoupled full-stack architecture:

- **Frontend:** Single-page React 18 application bundled with Vite and styled with Tailwind CSS. Includes React Router for protected routing, Leaflet for geospatial mapping, Lucide icons, and custom lightweight SVG visualization charts.
- **Backend API:** Node.js Express server handling authentication, rate limiting, validation, image uploads via Multer, and routing to repositories and AI services.
- **Data Persistence:** File-backed JSON repository layer with automatic memory sync and ephemeral directory support (`os.tmpdir()` for tests and Vercel deployments).

```
[ Citizen Client / Admin Dashboard ]
                 |
                 v  (HTTP / JSON / Cookies)
       [ Express API Server ]
                 |
       +---------+---------+
       |                   |
       v                   v
[ Gemini 2.5 API ]    [ Repository Layer ]
  (Keyword Fallback)    - issuesRepo
                        - usersRepo
                        - supportsRepo
                        - notificationsRepo
```

---

## 2. Data Flow Lifecycle

1. **Submission:** A citizen enters complaint text, selects a location, and optionally attaches a photograph or uses the bilingual Voice Assistant.
2. **Pre-processing:** Server validates boundary constraints (title length 5-100, description length 20-1000, valid coordinates), sanitizes HTML tags, and checks for duplicate reports within 200m using the Haversine formula.
3. **AI Evaluation:** The multimodal prompt is dispatched to Google Gemini (`gemini-2.5-flash`). If unconfigured or timed out, the system automatically runs the deterministic keyword classifier fallback.
4. **Scoring & Triage:**
   - Severity Score (0-100) and Safety Impact Score (0-100) from AI.
   - Community Impact Score derived via logarithmic scaling of citizen supports.
   - Days Unresolved aging score computed from timeline timestamps.
   - Combined Planning Score formula applied: `S = 0.35*A + 0.25*C + 0.25*P + 0.15*T`.
5. **Municipal Routing:** The issue is routed to the corresponding municipal department directory with initial SLA deadlines.
6. **Timeline & Resolution:** Field workers update status through `/admin`, optional before/after repair photos are verified by AI, and citizens can confirm or reopen unresolved issues within 48 hours.

---

## 3. Gemini Prompt Engineering & Fallback

### System Prompt & Injection Defense
The prompt instructs the model to act as a municipal civil engineering analyst. User text is encapsulated within defensive XML tags `<USER_CIVIC_REPORT_DATA>` to instruct the model to treat input as passive descriptive data and prevent prompt injection bypasses.

### Output Schema
Gemini outputs strict structured JSON adhering to the `GEMINI_RESPONSE_SCHEMA`:
- `category`: Must match one of 6 allowed civic categories.
- `priority`: Critical, High, Medium, or Low.
- `department`: Routed municipal division.
- `severity_score` & `safety_impact_score`: Integer values clamped between 0 and 100.
- `follow_up_questions`: Up to 2 clarifying questions for the reporter.

### Offline Fallback Engine
When `GEMINI_API_KEY` is not present, exceeds quota, or fails to respond within 10 seconds, `classifyWithKeywords` executes without service degradation. It scans input against category phrase dictionaries, checks high/critical triggers (e.g., exposed wires, open manholes), and assigns standard SLA and routing attributes.

---

## 4. Repository Layer

Data interactions are abstracted behind dedicated repository classes:
- **`usersRepo`:** Manages citizen and administrator accounts, bcrypt password verification, and canonical demo profiles.
- **`issuesRepo`:** Manages complaint lifecycles, timeline events, duplicate candidate queries, and dynamic score enrichment.
- **`supportsRepo`:** Enforces single-support-per-citizen idempotency and tracks verified shares.
- **`notificationsRepo`:** Provides in-app notification tracking for status changes and follow-ups.

---

## 5. Key Design Decisions

1. **Dual Priority System:** Separates immediate physical safety hazards from community popularity upvotes. A high community score elevates scheduling urgency, but Critical safety overrides guarantee top-of-queue priority regardless of support count.
2. **Logarithmic Community Scaling:** Community Impact Score uses a natural log scaling formula (`ln(1 + N) / ln(51) * 100`) to prevent mob dominance from monopolizing municipal resources.
3. **Strict Privacy by Default:** Reporter email addresses are stripped from all public endpoints, and mobile numbers are masked (`98XXXXX210`).
4. **Portal Separation:** Administrators access triage tools via dedicated `/admin/login` with 2-step verification, keeping the citizen login uncluttered.

---

## 6. Assumptions & Limitations

- **File-Backed Storage:** The current implementation uses JSON flat files suitable for local evaluation, CI testing, and hackathon judging. In production, this can be swapped with PostgreSQL or Firestore through the repository interface.
- **Geocoding Dependency:** Reverse geocoding queries the public OpenStreetMap Nominatim endpoint with fallback to manual Coimbatore coordinates.
- **SMS Integration:** OTP verification operates in demo mode (`123456`) with a hook prepared for production SMS gateways (Twilio, MSG91).
