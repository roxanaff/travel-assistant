# Deploying the Travel Assistant for free

This guide deploys the React frontend to Cloudflare Pages, the ASP.NET Core API to Render, and the PostgreSQL database to Neon. It is suitable for personal testing, not a production service with guaranteed availability.

## Before you start

Create free accounts with GitHub, Cloudflare, Render, and Neon. Push this repository to a private GitHub repository before connecting the hosting services. Do not commit `.env` files or database connection strings.

The hosted app intentionally has shared data until authentication is added. Anyone with the app link can currently read, create, edit, and delete all test trips. Only share it with trusted testers.

## 1. Create the database in Neon

1. Create a Neon project with PostgreSQL.
2. On the project's **Connect** page, copy the full connection string.
3. Keep it private. It will become the Render environment variable `ConnectionStrings__TravelAssistant`.

The API applies its Entity Framework migrations when it starts, so the new database does not need any manual schema commands.

## 2. Deploy the API on Render

1. In Render, choose **New > Web Service**, connect the GitHub repository, and select the repository.
2. Set the service **Root Directory** to `backend`.
3. Choose the **Docker** runtime and the Free instance type. Render detects `backend/Dockerfile`.
4. Set the health-check path to `/health`.
5. Add these environment variables:

   | Name | Value |
   | --- | --- |
   | `ConnectionStrings__TravelAssistant` | The private connection string copied from Neon |
   | `Cors__AllowedOrigins__0` | Temporarily set this to `https://placeholder.invalid` |

6. Deploy, then copy the generated public Render URL, for example `https://travel-assistant-api.onrender.com`.

The placeholder is intentional: Cloudflare assigns the frontend URL in the next step. Replace it afterwards with the actual Cloudflare URL and redeploy the API.

## 3. Deploy the frontend on Cloudflare Pages

1. In Cloudflare, open **Workers & Pages > Create > Pages > Connect to Git**.
2. Select the same GitHub repository.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Root directory | `frontend` |
   | Build command | `npm ci && npm run build` |
   | Build output directory | `dist` |

4. Add the environment variable `VITE_API_BASE_URL` with the Render API URL from step 2. Do not include a trailing slash.
5. Deploy and copy the assigned `https://<project>.pages.dev` URL.

The included `frontend/public/_redirects` file makes direct links to a trip page work instead of showing a 404.

## 4. Connect the frontend and API

In Render, replace `Cors__AllowedOrigins__0` with the Cloudflare Pages URL exactly, for example `https://travel-assistant.pages.dev`, and redeploy the API. Then load the Cloudflare URL and create a test trip.

For a Cloudflare preview URL or a custom domain, add each additional origin with the next array index, for example `Cors__AllowedOrigins__1`.

## Everyday workflow

Push changes to GitHub. Cloudflare Pages rebuilds the frontend and Render rebuilds the API. The API migration step runs on each API start, allowing future Entity Framework migrations to be applied automatically.

On Render's free tier the API stops after inactivity, so the first request afterwards can take roughly a minute. Data remains in Neon during that time.

## Next improvements

1. Add proper user accounts and make trips belong to an account. This is the route for private data, multi-user testing, and a portfolio-quality full product.
2. Before that larger step, a shared app password can limit casual access, but it does not separate users or their data.
3. Add an export/backup feature so you retain a copy of test data independent of a free-tier provider.
