# Project Requirements

This document lists the software, services, and libraries required to run, develop, and test Travel Assistant locally.

## Required software

| Requirement                  | Version                         | Purpose                                                            |
| ---------------------------- | ------------------------------- | ------------------------------------------------------------------ |
| .NET SDK                     | 10.0                            | Builds and runs the ASP.NET Core API and its tests.                |
| Node.js and npm              | Current Node.js LTS recommended | Installs, builds, and tests the React frontend.                    |
| Docker Desktop or PostgreSQL | PostgreSQL 17                   | Runs the local database. Docker Compose uses `postgres:17-alpine`. |

Install the frontend dependencies with `npm ci` from `frontend/`. This uses the committed `package-lock.json` for
reproducible versions.

## Backend NuGet packages

The API and test projects restore these packages automatically when running `dotnet restore`, `dotnet run`, or
`dotnet test`.

| Package                                                 | Version | Purpose                                                 |
| ------------------------------------------------------- | ------- | ------------------------------------------------------- |
| Microsoft.AspNetCore.OpenApi                            | 10.0.8  | OpenAPI support for the API.                            |
| Microsoft.AspNetCore.Identity.EntityFrameworkCore       | 10.0.11 | User accounts and cookie-based authentication.          |
| Microsoft.AspNetCore.DataProtection.EntityFrameworkCore | 10.0.11 | Persists data-protection keys through Entity Framework. |
| Microsoft.OpenApi                                       | 2.7.5   | OpenAPI document types and tooling.                     |
| Microsoft.EntityFrameworkCore.Design                    | 10.0.11 | Entity Framework design-time and migration support.     |
| Microsoft.EntityFrameworkCore.Sqlite                    | 10.0.11 | SQLite provider used by tests.                          |
| Microsoft.EntityFrameworkCore.InMemory                  | 10.0.11 | In-memory database support.                             |
| Npgsql.EntityFrameworkCore.PostgreSQL                   | 10.0.3  | PostgreSQL database provider.                           |
| Microsoft.AspNetCore.Mvc.Testing                        | 10.0.11 | In-process API integration testing.                     |
| Microsoft.NET.Test.Sdk                                  | 18.0.1  | .NET test runner integration.                           |
| xunit                                                   | 2.9.3   | Backend test framework.                                 |
| xunit.runner.visualstudio                               | 3.1.4   | Visual Studio and `dotnet test` xUnit runner.           |

## Frontend npm packages

### Application dependencies

| Package          | Version | Purpose                 |
| ---------------- | ------- | ----------------------- |
| react            | ^19.2.8 | UI framework.           |
| react-dom        | ^19.2.8 | React browser renderer. |
| react-router-dom | ^7.18.2 | Client-side routing.    |
| lucide-react     | ^1.31.0 | Interface icons.        |

### Development and test dependencies

| Package                                     | Version                     | Purpose                                       |
| ------------------------------------------- | --------------------------- | --------------------------------------------- |
| vite                                        | ^8.2.0                      | Development server and production build tool. |
| typescript                                  | ~6.0.2                      | Type checking and compilation.                |
| @vitejs/plugin-react                        | ^6.0.4                      | Vite React integration.                       |
| eslint and related plugins                  | See `frontend/package.json` | Linting configuration.                        |
| vitest                                      | ^4.1.11                     | Unit-test runner.                             |
| jsdom                                       | ^30.0.1                     | Browser-like environment for unit tests.      |
| @testing-library/react                      | ^16.3.2                     | React component testing utilities.            |
| @testing-library/user-event                 | ^14.6.5                     | Simulated user interactions in tests.         |
| @playwright/test                            | ^1.62.1                     | End-to-end browser testing.                   |
| @types/node, @types/react, @types/react-dom | See `frontend/package.json` | TypeScript type definitions.                  |

## Local configuration

1. Copy `.env.example` to `.env` in the repository root and set a secure `POSTGRES_PASSWORD`.
2. Start PostgreSQL with `docker compose up -d`.
3. Set the backend `ConnectionStrings__TravelAssistant` secret or environment variable to the local PostgreSQL
   connection string.
4. Copy `frontend/.env.example` to `frontend/.env`. The default API URL is `http://localhost:5263`.

For complete start, test, and deployment commands, see
[`documentation/development-guide.md`](documentation/development-guide.md).
