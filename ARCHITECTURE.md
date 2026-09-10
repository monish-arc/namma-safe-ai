# NammaSafe AI — Architecture Assessment and Target Design

**Reviewed:** 9 September 2026  
**Scope:** React frontend at the repository root and FastAPI backend in `nammasafe-ai/backend`.

## Executive summary

NammaSafe AI is a well-structured **decision-support prototype** for multi-hazard
relocation planning in Chamoli. It has a capable React GIS interface, a FastAPI
risk engine, seed data, an initial PostGIS schema, and container definitions.

The most important architectural fact is that the currently executed system is
not yet the persistent PostGIS platform described in the original technical
documentation. The backend serves an in-memory seed-data dictionary and the
frontend silently falls back to a separate browser-side mock implementation.
This can make the same user action produce different results in different
environments. The target architecture below makes the API and database the
single source of truth while retaining an explicit demo mode for presentations.

## Current implementation

```text
Browser
  │
  ├── React 19 / TypeScript / Tailwind / Leaflet / Recharts
  │     ├── App.tsx owns data loading, navigation, modal state and mutations
  │     ├── pages/ renders dashboard, GIS, priority, simulator and reports
  │     └── services/api.ts calls /api/* or silently uses mockData.ts
  │
  └── /api/*
        │
        ├── Nginx proxy in the production frontend image
        │
        └── FastAPI (nammasafe-ai/backend/app/main.py)
              ├── authentication and RBAC helpers
              ├── risk_engine.py decision formulas
              └── DATA = get_processed_seed_data()  ← process-local state

PostgreSQL/PostGIS
  ├── Docker Compose service and database/init.sql
  └── SQLAlchemy models + Alembic migration exist, but API routes do not use them
```

### Frontend responsibilities

| Area | Current location | Notes |
| --- | --- | --- |
| Application shell and orchestration | `src/App.tsx` | Owns eight data collections, loading, mutation callbacks and navigation. |
| Presentation modules | `src/pages/`, `src/components/` | Clear feature-oriented UI split. |
| Domain contracts | `src/types/index.ts` | Useful shared client contract, but it has drifted from several API responses. |
| API and demo implementation | `src/services/api.ts` | Mixes HTTP transport, authentication state, fallback data, and decision calculations. |
| Demonstration data | `src/data/mockData.ts` | Complete browser demo dataset. |

### Backend responsibilities

| Area | Current location | Notes |
| --- | --- | --- |
| HTTP routes | `nammasafe-ai/backend/app/main.py` | All endpoints are in one module. |
| Decision rules | `nammasafe-ai/backend/app/risk_engine.py` | The right location for authoritative calculations. |
| Authentication | `nammasafe-ai/backend/app/auth.py` | JWT creation and role checks are implemented. |
| Persistence definition | `models.py`, `database.py`, `alembic/`, `database/init.sql` | Defined but not part of the request path. |
| Seed data | `seed_data.py` | Currently acts as the application's database. |

## Findings

### 1. Two sources of truth

The frontend keeps mutable copies of habitations, sites, reports and
recommendations while the backend keeps another mutable copy. A browser update
can succeed locally even when the API is unavailable or rejects it. This is
especially significant for field reports and priority recalculation.

**Decision:** production mode must use the API exclusively. A demo mode may use
mock data, but it must be selected explicitly with `VITE_DATA_MODE=demo` and
visibly identified in the UI.

### 2. Risk-engine drift

The frontend and backend implement the same hazard and priority formulas, but
their vulnerability normalisation differs. The frontend caps population density
at 5,000 people and uses an unscaled dependants ratio; the backend uses a
150-person normalisation and scales the dependants ratio. This can change a
habitation's relocation classification.

**Decision:** `risk_engine.py` is authoritative. The frontend displays returned
scores and must not calculate production scores. If a client-side demo engine is
retained, it should use the exact same tested formula specification.

### 3. Contract and mutation gaps

- The API simulator returns `target_site_id`, `families_relocated`,
  `remaining_capacity_after`, and `explanation`; the frontend expects different
  names such as `relocation_site_id`, `families_requested`,
  `remaining_capacity_after_relocation`, and `decision_rationale`.
- The frontend includes report verification and reset actions, but the backend
  currently has no matching endpoints.
- Priority recalculation returns a calculation result while the React app
  assumes a complete updated `Habitation`.
- Protected backend routes require a JWT, but the current persona switcher only
  changes browser state and does not establish an API session.

**Decision:** define one versioned JSON contract, generate or share types from
the OpenAPI schema, and provide a small API client that normalises no business
data. Add the missing report-verification and demo-reset operations before
moving mutations to the backend.

### 4. Persistence is not active

Docker Compose starts PostGIS and mounts the SQL initialisation script, but
FastAPI does not call SQLAlchemy sessions or repositories. Restarting the API
loses all report and priority changes. The backend Docker build also references
`nammasafe-ai/backend/Dockerfile`, which is currently absent.

**Decision:** treat the existing PostGIS schema as a migration target, not as a
current capability. Add a backend Dockerfile and introduce repositories before
claiming durable data storage.

### 5. Deployment topology needs one canonical entry point

There are duplicate Docker Compose and frontend Dockerfiles at the root and
under `nammasafe-ai/`. They use different relative build contexts and can drift.
The Vite development server has no `/api` proxy, whereas the production Nginx
image does have one.

**Decision:** make the repository-root `docker-compose.yml` the only supported
container entry point; configure Vite's development proxy for `localhost:8000`;
and document all environment variables in the root `.env.example`.

## Target architecture

```text
                         ┌──────────────────────────┐
                         │ React application         │
                         │ pages + feature hooks     │
                         └────────────┬─────────────┘
                                      │ HTTPS / JSON
                         ┌────────────▼─────────────┐
                         │ API client               │
                         │ auth, errors, contracts  │
                         └────────────┬─────────────┘
                                      │
                  ┌───────────────────▼───────────────────┐
                  │ FastAPI                                │
                  │ routers → services → repositories      │
                  ├────────────────────────────────────────┤
                  │ auth │ risk engine │ reporting │ GIS    │
                  └───────────────────┬───────────────────┘
                                      │ SQLAlchemy
                  ┌───────────────────▼───────────────────┐
                  │ PostgreSQL + PostGIS                   │
                  │ operational data and spatial layers    │
                  └────────────────────────────────────────┘
```

### Backend module boundaries

```text
backend/app/
  api/                 # FastAPI routers grouped by resource
    auth.py
    dashboard.py
    habitations.py
    relocation.py
    field_reports.py
    admin.py
  services/            # use cases; transaction boundaries live here
    dashboard_service.py
    habitation_service.py
    relocation_service.py
    report_service.py
  repositories/        # SQLAlchemy/PostGIS queries only
    habitation_repository.py
    relocation_repository.py
    report_repository.py
  domain/
    risk_engine.py     # pure, fully-tested decision calculations
  models/              # SQLAlchemy persistence models
  schemas/             # Pydantic request/response DTOs
  core/                # config, security, logging and database session
```

The first migration can retain the current `main.py` route behaviour while
extracting services and repositories one resource at a time. Do not split it
into network microservices: this product is currently a single bounded domain
and should remain a modular monolith.

### Frontend module boundaries

```text
src/
  app/                 # application shell, providers and route state
  features/
    dashboard/
    gis/
    habitations/
    relocation/
    field-reports/
    admin/
  shared/
    api/               # typed HTTP client and endpoint adapters
    components/
    types/
  demo/                # optional, isolated mock data adapter
```

`App.tsx` should become a composition layer. Each feature owns its query state,
loading/error state and mutations, while shared navigation and modals remain in
the application shell. A single `GET /api/bootstrap` endpoint can provide the
initial dashboard/map snapshot, avoiding the current eight independent startup
requests.

## API contract

Use `/api/v1` for all new or changed endpoints. Keep old paths temporarily
only if a deployed client requires them.

| Resource | Read operations | Write operations |
| --- | --- | --- |
| Bootstrap | `GET /api/v1/bootstrap` | — |
| Habitations | `GET /api/v1/habitations`, `GET /api/v1/habitations/{id}` | `POST /api/v1/habitations/{id}/priority-calculation` |
| Relocation | `GET /api/v1/relocation-sites`, `POST /api/v1/relocation-simulations` | Simulation remains non-persistent unless explicitly saved. |
| Field reports | `GET /api/v1/field-reports` | `POST /api/v1/field-reports`, `POST /api/v1/field-reports/{id}/verify` |
| Administration | — | `POST /api/v1/admin/hazard-imports`; demo reset only in demo environments. |

All write operations require a bearer token. Return a complete resource after a
mutation, or return a clear result DTO that the frontend explicitly consumes.
The simulator contract should use one naming convention consistently:
`relocation_site_id`, `families_requested`,
`remaining_capacity_after_relocation`, and `decision_rationale`.

## Data and geospatial design

- Store habitation and relocation-site coordinates as PostGIS `geometry(Point,
  4326)`; store red zones as `geometry(MultiPolygon, 4326)`.
- Use GIST spatial indexes and perform proximity/intersection calculations in
  repositories, not in React.
- Keep raw hazard feeds in an ingestion/audit table with source, timestamp,
  geometry validation result, checksum, and operator identity.
- Record risk-calculation inputs, formula version and output in an immutable
  calculation history table. A relocation recommendation must be traceable to
  the exact source data and formula version used.
- Keep synthetic seed data separate from production migrations and load it only
  through an explicit demo/seed command.

## Security and reliability baseline

- Replace the default JWT secret with a required environment variable outside
  demo development. Rotate credentials rather than placing them in Compose.
- Restrict CORS to configured frontend origins; `allow_credentials=true` cannot
  safely be paired with a wildcard origin in a production browser deployment.
- Add structured request logging, a health endpoint, readiness checks for the
  database, and an error response envelope.
- Enforce role checks in backend services, not only by hiding frontend buttons.
- Add database transactions for report verification, priority recalculation and
  any saved relocation decision.

## Access-control architecture

### Governing rules

Access is both **role-based** and **geographically scoped**. A role grants a
set of actions; the officer's assignment grants the geographic boundary in
which those actions are allowed. Higher operational roles inherit the read and
operational permissions of the levels below them, but never receive access to
data outside their assigned jurisdiction.

Before authentication, every non-admin user must select **State, District,
Sub-district, and Area/Division**. All four selections are mandatory. The
portal uses the chosen area to find eligible user assignments and, after login,
must confirm that the selected scope is contained in the authenticated user's
assigned scope. Administrators do not choose an operational geography before
login because their work is platform-wide.

```text
Pre-login (all non-admin users)
  State → District → Sub-district → Area/Division → Sign in
                                                   │
                                                   ▼
                  Assignment + hierarchy validation at API boundary
                                                   │
                                                   ▼
                  Role permissions ∩ assigned geographic scope
```

The selected geography is a filter and a login context, never proof of
permission by itself. The API must independently enforce the assignment on
every request.

### Role matrix

| Role | Geographic scope | Permitted capabilities |
| --- | --- | --- |
| Normal citizen | Selected public area | View public GIS layers, safe accommodation information and active risk alerts only. |
| Field officer | Assigned area/division | All citizen views; create and update risk-alert reports for assigned regions. Cannot publish outside the workflow or manage accommodation or staff. |
| Local office | Assigned area/division | All field-officer capabilities; maintain approved safe-accommodation locations, size, capacity and availability in the assigned division. Published accommodation data is visible to citizens and field officers. |
| Sub-district officer | Assigned sub-district and its divisions | All local-office capabilities; assign, move or remove local-office and field-officer assignments within the sub-district. |
| District officer | Assigned district and its sub-districts | All sub-district capabilities; assign, move or remove lower-level operational officers within the district. |
| State officer | Assigned state and its districts | All district capabilities; assign, move or remove lower-level operational officers within the state. |
| GIS analysis officer | Assigned analytical jurisdiction | View all approved map, alert, accommodation and historical-hazard data in scope; analyse current and historical events (including 20+ years), compare rainfall and hazard trends, and access analytical charts. Cannot raise alerts, edit accommodation, or manage staff. |
| Administrator | Platform-wide technical scope | Manage technical configuration, repair operational data under a controlled workflow, manage approved lower-level access roles, review server health and audit user login/session records. The administrator does not replace a jurisdictional officer for ordinary disaster decisions. |

### Permission model

Use explicit permissions rather than hard-coding role names in UI components or
route handlers. Recommended permission keys are:

```text
map.read_public                 alert.read                 alert.raise
accommodation.read             accommodation.manage
assignment.read                assignment.manage
hazard-history.read            analytics.read
audit-log.read                 session-log.read           system-health.read
technical-data.repair          role.manage
```

Role inheritance is implemented in a central policy table. The backend resolves
the effective permission set at login and still validates scope for each write.
For example, a district officer can manage a field officer only when both the
target assignment and the requested division belong to that district. A state
officer cannot silently manage a user assigned to another state.

### Alert workflow

1. A field officer creates a draft risk alert with location, hazard type,
   severity, observed time, evidence and affected geography.
2. The API validates that the geometry and affected area are inside the
   officer's assigned division.
3. The alert is visible as a pending operational alert to supervising local,
   sub-district, district and state officers.
4. An authorised supervisory workflow publishes, updates, expires or closes
   the alert. Citizens see only published alerts.
5. Every transition records actor, timestamp, selected geography, previous
   status, new status and reason.

This keeps field observations fast while preventing unverified reports from
appearing as public emergency warnings.

### Accommodation workflow

Local offices maintain accommodation records only inside their assigned
division. Each record includes location/geometry, facility type, usable area or
size, total family capacity, current occupancy, available capacity, status,
last verification time and source. The API derives availability as
`total_capacity - current_occupancy`; it must not accept a contradictory
availability value from the client.

Accommodation edits are immediately available to field officers and citizens
only when the record is marked published and operational. Historical changes
must be retained for audit and capacity planning.

### GIS analysis workspace

The GIS analysis officer receives a read-only analysis workspace rather than
operational mutation controls. It includes:

- Current-event analysis for flood, storm, landslide, cloudburst and other
  configured hazard types.
- Historical event layers and time-series data for at least the previous
  twenty years when source coverage exists.
- Rainfall comparison charts across selected years, areas and event types.
- Event counts, affected population, intensity, damage and seasonal trend
  comparisons.
- Exportable, clearly labelled analytical views that distinguish source data,
  modelled values and synthetic demo data.

Raw measurements should be held in a `hazard_observations`/`rainfall_measurements`
time-series dataset, while validated incidents live in `hazard_events`. GIS
analysis access is read-only and must honour the analyst's assigned geographic
scope.

### Required persistence model

Add the following entities to the PostGIS migration plan:

| Entity | Purpose |
| --- | --- |
| `administrative_areas` | State, district, sub-district and area/division hierarchy with geometry and parent relationship. |
| `user_assignments` | User, role, assigned administrative area, active period, assigning officer and assignment status. A user may have more than one historical assignment but only approved active assignments are effective. |
| `risk_alerts` | Alert geometry, affected area, hazard, severity, evidence, lifecycle status, reporter and publisher. |
| `risk_alert_transitions` | Immutable alert status history and approval rationale. |
| `accommodations` | Safe-location geometry, capacity inputs, occupancy, operational status and publishing status. |
| `accommodation_revisions` | Immutable history of accommodation edits and capacity changes. |
| `hazard_observations` | Dated rainfall and hazard measurements used for charts and long-term analysis. |
| `user_sessions` | Login time, logout/expiry time, selected geography, effective assignment, device/IP metadata where policy permits, and result. |
| `audit_events` | Immutable record for assignment, role, technical-repair and administrative actions. |

### API design additions

The versioned API should add the following resource groups:

```text
GET  /api/v1/geography/states
GET  /api/v1/geography/districts?state_id={id}
GET  /api/v1/geography/sub-districts?district_id={id}
GET  /api/v1/geography/areas?sub_district_id={id}
POST /api/v1/auth/login                    # includes selected geography

GET  /api/v1/alerts
POST /api/v1/alerts                         # field officer and above, scoped
POST /api/v1/alerts/{id}/publish             # supervising workflow
POST /api/v1/alerts/{id}/close

GET  /api/v1/accommodations
POST /api/v1/accommodations                  # local office and above, scoped
PATCH /api/v1/accommodations/{id}

GET  /api/v1/assignments
POST /api/v1/assignments                     # jurisdictional officer, scoped
PATCH /api/v1/assignments/{id}
DELETE /api/v1/assignments/{id}              # soft revoke; never hard delete

GET  /api/v1/analytics/hazards
GET  /api/v1/analytics/rainfall-comparison
GET  /api/v1/admin/sessions
GET  /api/v1/admin/system-health
```

Public read endpoints must return only published alerts and published
accommodation records. Every protected endpoint accepts or derives an
administrative-area filter and rejects out-of-scope IDs, coordinates and
geometries.

## Delivery roadmap

### Phase 1 — Stabilise the prototype

1. Add the missing backend Dockerfile and make root Compose canonical.
2. Add Vite `/api` proxy and documented `VITE_API_BASE_URL` / `VITE_DATA_MODE`.
3. Separate the HTTP client from the demo adapter; stop silent fallback in API
   mode.
4. Align simulator and priority response DTOs and add backend verification and
   reset endpoints.
5. Make `risk_engine.py` the only production scoring implementation.

### Phase 2 — Activate persistence

1. Introduce repositories for habitations, sites and reports using the existing
   Alembic/PostGIS schema.
2. Move each endpoint from the `DATA` dictionary to service/repository calls.
3. Seed demo data through a repeatable command instead of module import state.
4. Add integration tests against PostgreSQL/PostGIS in containers.

### Phase 3 — Operational readiness

1. Add authenticated UI login and token refresh/logout handling.
2. Add calculation audit history, source provenance and approval workflow.
3. Add observability, backup/restore, rate limits and production CORS/secrets.
4. Version the API and publish its OpenAPI contract to the frontend build.

## Acceptance criteria for the target state

- A fresh browser session displays data only from the selected source: API or
  explicitly labelled demo adapter.
- A report submission, verification or priority recalculation survives an API
  restart and appears consistently in every browser session.
- The browser never determines the official priority or relocation score.
- `docker compose up --build` from the repository root starts database, API and
  frontend successfully.
- API contract tests and frontend contract/type checks run in CI.
- The system can explain which source data and formula version produced each
  relocation decision.

## Immediate implementation priority

Build Phase 1 before adding features. It removes the current ambiguity about
which data is authoritative, makes the environment reproducible, and protects
the decision-support calculations from client/server drift. Phase 2 should be
the first production-readiness milestone because persistent, auditable data is
required for a disaster-management workflow.
