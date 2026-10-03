# LMS Backend

Backend service for the Learning Management System (LMS), built with NestJS, PostgreSQL, and TypeORM.

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL 16
- TypeORM
- JWT Authentication
- Argon2
- Swagger / OpenAPI
- Vitest
- ESLint
- Prettier
- Husky
- Docker & Docker Compose (optional)

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- PostgreSQL 16
- pgAdmin 4 (recommended for database management)

Docker Desktop is optional and can be used if you prefer to run PostgreSQL in a container.

## Installation

Install the project dependencies:

```bash
npm install
```

## Database Setup

The recommended development setup is PostgreSQL 16 running locally.

Create a PostgreSQL user:

```sql
CREATE ROLE lms_user
WITH
    LOGIN
    PASSWORD 'your_local_password';
```

Create the application database and assign ownership to the application user:

```sql
CREATE DATABASE lms_db
    OWNER lms_user;
```

> Use a secure local password and keep it only in your `.env` file. Do not commit database credentials to Git.

## Environment Variables

Create a `.env` file from `.env.example`:

```bash
cp .env.example .env
```

On Windows, you can create the file manually by copying `.env.example` and renaming the copy to `.env`.

Configure the environment variables:

```env
PORT=3000

DB_HOST=localhost
DB_PORT=5432

POSTGRES_DB=lms_db
POSTGRES_USER=lms_user
POSTGRES_PASSWORD=your_local_password

AUTH_TOKEN_SECRET=your_secure_auth_token_secret

JWT_SECRET=your_secure_jwt_secret
JWT_EXPIRES_IN=15m
```

> Never commit real secrets or the `.env` file to Git. Use strong, unique secret values in your local `.env` file.

## Database Migrations

The project uses TypeORM migrations to manage database schema changes.

Run all pending migrations:

```bash
npm run migration:run
```

Generate a new migration after changing database entities:

```bash
npm run migration:generate -- src/database/migrations/MigrationName
```

Revert the latest migration:

```bash
npm run migration:revert
```

Current authentication-related migrations include tables for:

- Users
- Authentication tokens
- Refresh tokens

## Run the Application

Make sure PostgreSQL 16 is running and the required migrations have been applied.

Start the NestJS application in development mode:

```bash
npm run start:dev
```

The API will be available at:

```text
http://localhost:3000
```

## Health Check

Use the health endpoint to verify that the API is running:

```text
GET /health
```

Open:

```text
http://localhost:3000/health
```

A successful response should look similar to:

```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "status": "ok"
  },
  "timestamp": "2026-09-26T01:49:17.758Z"
}
```

## API Documentation

Swagger documentation is available at:

```text
http://localhost:3000/api/docs
```

Swagger can also be used to test the authentication endpoints and protected routes.

## Authentication

The backend supports the following authentication flow:

```text
Register
   ↓
Email Verification
   ↓
Login
   ↓
Access Token + Refresh Token
   ↓
Protected Routes
   ↓
Refresh Token Rotation
   ↓
Logout / Token Revocation
```

### Authentication Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Register a new user |
| POST | `/auth/verify-email` | Verify a user's email using an OTP |
| POST | `/auth/resend-verification` | Request a new verification OTP |
| POST | `/auth/login` | Login and receive access and refresh tokens |
| POST | `/auth/refresh` | Rotate refresh token and receive new tokens |
| POST | `/auth/logout` | Revoke a refresh token |
| GET | `/auth/me` | Get the authenticated user's profile |
| POST | `/auth/change-password` | Change password for an authenticated user |
| POST | `/auth/forgot-password` | Request a password reset OTP |
| POST | `/auth/reset-password` | Reset password using the OTP |
| GET | `/auth/admin-test` | Example role-protected admin endpoint |

## Authentication Security

The authentication implementation includes:

- Password hashing with Argon2
- Email verification using OTP codes
- HMAC-hashed authentication tokens
- Short-lived JWT access tokens
- Refresh tokens stored as hashes
- Refresh token rotation
- Refresh token revocation on logout
- Session invalidation after password reset
- Session invalidation after password change
- JWT-protected routes
- Role-based authorization
- Generic forgot-password responses to reduce account enumeration

## Code Quality

Run ESLint:

```bash
npm run lint
```

Run Prettier:

```bash
npm run format
```

Run the test suite:

```bash
npm test
```

Run tests with coverage:

```bash
npm run test:cov
```

Build and type-check the project:

```bash
npm run build
```

The current backend test suite uses Vitest and includes authentication service tests.

## Git Hooks

The project uses Husky for pre-commit quality checks.

Before a commit is created, the pre-commit hook runs:

```bash
npm run lint
npm test
npm run build
```

A commit is blocked if one of these checks fails.

After running `npm install`, the project's `prepare` script initializes Husky automatically.

## Optional: Run PostgreSQL with Docker

The project also includes a Docker Compose configuration for developers who prefer to run PostgreSQL in a container.

Before using Docker PostgreSQL, stop the local PostgreSQL service or configure a different port to avoid a conflict on port `5432`.

Start PostgreSQL with Docker:

```bash
docker compose up -d
```

Verify the container status:

```bash
docker compose ps
```

Stop the Docker containers:

```bash
docker compose down
```

> Do not run both the local PostgreSQL instance and the Docker PostgreSQL container on the same host port (`5432`) at the same time.