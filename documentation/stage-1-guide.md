# Stage 1 Guide — Personal Trip Planner

## Stage overview

Stage 1 is the current product: a private, account-based workspace for manually planning a trip, tracking its costs, and managing a packing checklist. Its core feature set is implemented. Remaining work in this stage is limited to the UX improvements and verification recorded in the Stage 1 requirements.

Future product directions are documented separately in [future/](future/). They are not yet defined as delivery stages.

## Current product behavior

- Accounts support registration, sign-in, password change, sign-out, and permanent account deletion.
- Each account sees and manages only its own trips and related data.
- Trips include a destination, dates, trip type, currency, target budget, and notes. Required fields use `*`; other fields have no routine optional marker, and incomplete or invalid date ranges are prevented in the browser.
- The dashboard organises trips by lifecycle status in a stable responsive grid and opens a workspace for each trip. Editing replaces the selected card in place.
- The workspace opens on Details and provides separate Details, Itinerary, Budget & expenses, and Packing sections.
- The manual itinerary supports scheduled and unscheduled activities, priorities, opening-hours warnings, deletion recovery, and a compact activity-entry form.
- Planned costs and actual expenses are tracked separately against an optional target budget. Expense lists support ungrouped, category, and date views; a copied planned cost can be undone at any time.
- Packing checklists support default or empty setup, categories, quantities, grouping, grip-based reordering within each packed-state section, packed state, and deletion recovery.

## Architecture

| Area | Technology | Responsibility |
| --- | --- | --- |
| `frontend/` | React, TypeScript, Vite | Browser UI, routing, forms, and API calls. |
| `backend/` | ASP.NET Core Minimal API, ASP.NET Core Identity, EF Core | HTTP endpoints, authentication, ownership checks, validation, and business rules. |
| PostgreSQL | Neon in deployment; Docker locally | Persistent account, trip, itinerary, budget, and packing data. |

Pending Entity Framework migrations are applied when the API starts. During local development, the frontend reads `VITE_API_BASE_URL` to find the API. In production, a Cloudflare Pages Function proxies same-origin `/api/*` requests to Render.

## Local development

Prerequisites: .NET 10 SDK, Node.js/npm, and Docker Desktop (or another PostgreSQL instance).

1. Copy `.env.example` to `.env` and choose a local PostgreSQL password.
2. Start the local database:

   ```powershell
   docker compose up -d
   ```

3. Configure the backend connection string using user secrets or a local environment variable named `ConnectionStrings__TravelAssistant`.
4. In `frontend/`, copy `.env.example` to `.env`; its default API URL is `http://localhost:5263`.
5. Start the API from `backend/`:

   ```powershell
   dotnet run
   ```

6. Start the frontend from `frontend/`:

   ```powershell
   npm install
   npm run dev
   ```

## Testing and verification

Backend validation tests are run from the repository root:

```powershell
dotnet test backend/TravelAssistant.Tests/TravelAssistant.Tests.csproj --configuration Release
```

Frontend tests and the production build are run from `frontend/`:

```powershell
npm run test
npm run test:e2e
npm run build
```

Frontend tests live in `frontend/tests/`, mirroring the feature structure under `frontend/src/`. This keeps production source files separate from their tests.

Current automated coverage includes backend validation rules plus isolated API coverage for registration, authenticated trip creation, and account ownership. Frontend coverage includes formatting and numeric input helpers; itinerary, packing, expense, planned-budget, dashboard, trip-form, and Trip Details component flows. The Chromium smoke test registers an account, creates a trip, and adds an itinerary item, expense, and packing item using an isolated in-memory API host. Remaining work is limited to deeper UI edge-case coverage and manual responsive and keyboard checks.

## Deployment

### Architecture

| Component | Platform | Role |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Hosts the Vite/React single-page application and proxies same-origin `/api/*` requests. |
| API | Render | Runs the ASP.NET Core API in the backend Docker image. |
| Database | Neon | Provides the managed PostgreSQL database. |

This arrangement is suitable for personal use and small-scale testing on free tiers. It is not designed for guaranteed availability.

### Data and access

The API applies migrations during startup, allowing a new Neon database to reach the current schema automatically. Connection details are held in platform environment variables and are not committed to the repository.

Authentication uses secure, HTTP-only cookies. Every trip and its related data is owned by one account; requests for another account's trip are treated as not found.

### Configuration

Render hosts `backend/` using `backend/Dockerfile` and checks `/health`.

| API environment variable | Description |
| --- | --- |
| `ConnectionStrings__TravelAssistant` | Private Neon PostgreSQL connection string. |
| `Cors__AllowedOrigins__0` | Exact Cloudflare Pages frontend origin allowed to call the API. |

Additional preview or custom frontend origins use subsequent array indexes, such as `Cors__AllowedOrigins__1`.

Cloudflare Pages builds `frontend/` with `npm ci && npm run build`, publishes `dist`, and requires the server-side `API_ORIGIN` variable. `API_ORIGIN` is the public Render API URL without a trailing slash. It is read by `frontend/functions/api/[[path]].js` and must not use a `VITE_` prefix.

The frontend origin and API CORS policy must match exactly, including protocol. After configuration, pushes to the connected GitHub repository trigger Cloudflare Pages and Render builds; pending database migrations are applied during API startup.

### Operational notes

- Render free services can sleep after inactivity; the first API request can take about a minute.
- Neon retains the database independently of a sleeping Render service.
- Environment files and database connection strings remain outside source control.
- An export or backup capability should be considered before broader use.
