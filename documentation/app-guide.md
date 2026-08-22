# Travel Assistant app guide

## What it does

Travel Assistant helps a user keep a trip in one place:

- Create and edit trips with destination, dates, budget, currency, and notes.
- Build a dated itinerary or keep activity ideas unscheduled.
- Plan expected costs and record actual expenses against a target budget.
- Start a default or empty packing checklist, then customise, order, and tick items off.

The currently deployed app has shared data. Authentication and per-user trips are planned future work, so only share the app with trusted testers.

## Architecture

| Area | Technology | Responsibility |
| --- | --- | --- |
| `frontend/` | React, TypeScript, Vite | Browser UI, routing, forms, and API calls. |
| `backend/` | ASP.NET Core Minimal API, EF Core | HTTP endpoints, validation, and business rules. |
| PostgreSQL | Neon in deployment; Docker locally | Persistent trip, itinerary, budget, and packing data. |

The API starts by applying pending Entity Framework migrations. During local development, the frontend reads `VITE_API_BASE_URL` to find the API. In production, a Cloudflare Pages Function proxies same-origin `/api/*` requests to Render.

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

Run the backend validation tests from the repository root:

```powershell
dotnet test backend/TravelAssistant.Tests/TravelAssistant.Tests.csproj --configuration Release
```

Run frontend tests and build from `frontend/`:

```powershell
npm run test
npm run build
```

The current automated coverage includes backend validation rules and frontend formatting, itinerary helper, packing, expense, and itinerary component flows. API/database integration and deployed end-to-end smoke tests are the next planned layer.

## Deployment

The deployment approach uses Cloudflare Pages for the frontend, Render for the API, and Neon for PostgreSQL. See [deployment.md](deployment.md) for the complete guide.
