# Development Guide

This guide covers the architecture, local setup, testing, and deployment of Travel Assistant. It applies to all current
and future features.

## Architecture

| Area        | Technology                                               | Responsibility                                                                    |
| ----------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| `frontend/` | React, TypeScript, Vite                                  | Browser UI, routing, forms, and API calls.                                        |
| `backend/`  | ASP.NET Core Minimal API, ASP.NET Core Identity, EF Core | HTTP endpoints, authentication, ownership checks, validation, and business rules. |
| PostgreSQL  | Neon in deployment; Docker locally                       | Persistent account, trip, itinerary, budget, and packing data.                    |

Pending Entity Framework migrations are applied when the API starts. During local development, the frontend reads
`VITE_API_BASE_URL` to find the API. In production, a Cloudflare Pages Function proxies same-origin `/api/*` requests to
Render.

For codebase maps and data-flow details, see the [backend README](../backend/README.md) and
[frontend README](../frontend/README.md).

## Local development

Prerequisites: .NET 10 SDK, Node.js/npm, and Docker Desktop, or another PostgreSQL instance.

1. Copy `.env.example` to `.env` and choose a local PostgreSQL password.
2. Start the local database:

   ```powershell
   docker compose up -d
   ```

3. Configure the backend connection string using user secrets or a local environment variable named
   `ConnectionStrings__TravelAssistant`.
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

### Physical phone testing

Connect the phone and development computer to the same private Wi-Fi network. Find the computer's Wi-Fi IPv4 address
with `ipconfig`, then replace `YOUR-LAN-IP` below with that address.

Start the API from `backend/`, allowing the local frontend origin:

```powershell
$env:Cors__AllowedOrigins__0 = "http://YOUR-LAN-IP:5173"
dotnet run --urls http://0.0.0.0:5263
```

In a separate terminal, start the frontend from `frontend/` with the API's local-network address:

```powershell
$env:VITE_API_BASE_URL = "http://YOUR-LAN-IP:5263"
npm run dev -- --host 0.0.0.0
```

Open `http://YOUR-LAN-IP:5173` on the phone. If Windows asks about firewall access, allow it only on private networks.
These commands apply only to the current terminals; they do not commit, push, or deploy code.

## Testing and verification

Run backend tests from the repository root:

```powershell
dotnet test backend/TravelAssistant.Tests/TravelAssistant.Tests.csproj --configuration Release
```

Run frontend tests and the production build from `frontend/`:

```powershell
npm run test
npm run test:e2e
npm run build
```

Frontend tests live in `frontend/tests/`, mirroring the feature structure under `frontend/src/`. The Chromium smoke test
uses a test-only API host with an in-memory database; it never uses local or deployed trip data.

## Deployment

| Component | Platform         | Role                                                                                    |
| --------- | ---------------- | --------------------------------------------------------------------------------------- |
| Frontend  | Cloudflare Pages | Hosts the Vite/React single-page application and proxies same-origin `/api/*` requests. |
| API       | Render           | Runs the ASP.NET Core API in the backend Docker image.                                  |
| Database  | Neon             | Provides the managed PostgreSQL database.                                               |

This arrangement is suitable for personal use and small-scale testing on free tiers. It is not designed for guaranteed
availability.

### Data and access

The API applies migrations during startup, allowing a new Neon database to reach the current schema automatically.
Connection details are held in platform environment variables and are not committed to the repository.

Authentication uses secure, HTTP-only cookies. Every trip and its related data is owned by one account; requests for
another account's trip are treated as not found.

### Configuration

Render hosts `backend/` using `backend/Dockerfile` and checks `/health`.

| API environment variable             | Description                                                     |
| ------------------------------------ | --------------------------------------------------------------- |
| `ConnectionStrings__TravelAssistant` | Private Neon PostgreSQL connection string.                      |
| `Cors__AllowedOrigins__0`            | Exact Cloudflare Pages frontend origin allowed to call the API. |

Additional preview or custom frontend origins use subsequent array indexes, such as `Cors__AllowedOrigins__1`.

Cloudflare Pages builds `frontend/` with `npm ci && npm run build`, publishes `dist`, and requires the server-side
`API_ORIGIN` variable. `API_ORIGIN` is the public Render API URL without a trailing slash. It is read by
`frontend/functions/api/[[path]].js` and must not use a `VITE_` prefix.

The frontend origin and API CORS policy must match exactly, including protocol. After configuration, pushes to the
connected GitHub repository trigger Cloudflare Pages and Render builds; pending database migrations are applied during
API startup.

### Operational notes

- Render free services can sleep after inactivity; the first API request can take about a minute.
- Neon retains the database independently of a sleeping Render service.
- Environment files and database connection strings remain outside source control.
- Consider an export or backup capability before broader use.
