# Deployment architecture

Travel Assistant is deployed as three independent services:

| Component | Platform | Role |
| --- | --- | --- |
| Frontend | Cloudflare Pages | Hosts the Vite/React single-page application and proxies same-origin `/api/*` requests. |
| API | Render | Runs the ASP.NET Core API in the backend Docker image. |
| Database | Neon | Provides the managed PostgreSQL database. |

This arrangement is suitable for personal use and trusted testing on free tiers. It is not designed for guaranteed availability or public multi-user access.

## Data and access model

The API applies Entity Framework Core migrations during startup, so a new Neon database is brought to the current schema automatically. Connection details remain in platform environment variables and are never committed to the repository.

The deployed application currently uses shared data: anyone with the app URL can read, create, edit, and delete the same trips. Authentication and per-user ownership are planned future work. The deployment URL should therefore only be shared with trusted testers.

## API service

Render hosts the `backend/` directory using the included `backend/Dockerfile`. The health-check endpoint is:

```text
/health
```

The API requires the following environment variables:

| Name | Description |
| --- | --- |
| `ConnectionStrings__TravelAssistant` | Private Neon PostgreSQL connection string. |
| `Cors__AllowedOrigins__0` | Exact Cloudflare Pages frontend origin allowed to call the API. |
| `InitialTripOwnerEmail` | Optional email address of the first account that should receive the existing pre-account trips. |

Additional preview or custom frontend origins can be configured by adding subsequent array indexes, for example `Cors__AllowedOrigins__1`.

## Frontend service

Cloudflare Pages builds and hosts the `frontend/` directory. Its deployment configuration is:

| Setting | Value |
| --- | --- |
| Build command | `npm ci && npm run build` |
| Build output directory | `dist` |
| Runtime configuration | `API_ORIGIN` |

`API_ORIGIN` is the public Render API URL without a trailing slash, for example `https://travel-assistant-api-ab0p.onrender.com`. It is a server-side Cloudflare Pages variable read by `frontend/functions/api/[[path]].js`; do not prefix it with `VITE_`. The function proxies browser requests from `/api/*` to Render, keeping production API calls same-origin for authentication cookies. The `frontend/public/_redirects` file supports direct navigation to client-side routes, including individual trip workspace URLs.

## Deployment flow

The frontend origin and API CORS policy depend on each other. The API can initially be deployed with a harmless placeholder origin, then updated once Cloudflare Pages assigns the frontend URL. The final CORS value must exactly match the frontend origin, including the protocol.

After the services are configured, normal deployment is source-driven: pushes to the connected GitHub repository trigger Cloudflare Pages and Render builds. Render starts the API and applies any pending migrations before serving traffic.

## Operational notes

- Render free services may sleep after inactivity; the first API request after sleep can take approximately a minute.
- Neon retains the database independently of a sleeping Render service.
- Environment files and database connection strings must remain outside source control.
- Before broader use, add authentication, user-owned trips, and an export or backup capability.
