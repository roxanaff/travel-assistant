# Backend map

This folder contains the ASP.NET Core API used by the React frontend. Each browser action follows the same path: the frontend sends a request to an **Endpoints** route, the route validates its **Contracts** request, changes **Models** through the **Data** context, then returns a response.

| Location | Responsibility |
| --- | --- |
| `Program.cs` | Application entry point: registers services, configures HTTP middleware, migrates the database, and maps feature routes. |
| `Data/` | The Entity Framework database context and the table, relationship, and database-constraint rules. |
| `Models/` | Persistent domain entities and their enums. These describe the data stored in PostgreSQL. |
| `Contracts/` | Request and response shapes at the HTTP boundary. These prevent frontend payloads being coupled directly to database entities. |
| `Validation/` | Reusable business-rule checks. Each validator returns a readable error string or `null` when valid. |
| `Endpoints/` | Minimal API route handlers, grouped by feature. They coordinate validation, database work, and HTTP responses. |
| `Migrations/` | Generated Entity Framework schema history. Do not edit generated migration code by hand; create a new migration when a model/schema changes. |
| `Properties/launchSettings.json` | Local-development launch profiles and ports; it is not used by Render in deployment. |
| `appsettings.json` | Non-secret application configuration. Connection strings remain in local secrets or hosting environment variables. |
| `Dockerfile` | Render's build-and-run recipe for the deployed API. |

## Data relationships

`Trip` is the parent record. Deleting it cascades to its planned costs, actual expenses, itinerary items, and packing items. A `PlannedCost` can have at most one linked `BudgetItem` (an actual expense); removing the plan keeps that recorded expense, but removes its link.
