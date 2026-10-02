# LMS Backend

Backend service for the Learning Management System (LMS), built with NestJS, PostgreSQL, and TypeORM.

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL 16
- TypeORM
- Swagger / OpenAPI
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
```

> Do not commit the `.env` file to Git.

## Run the Application

Make sure the local PostgreSQL 16 service is running.

Then start the NestJS application in development mode:

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

## Code Quality

Run ESLint:

```bash
npm run lint
```

Run Prettier:

```bash
npm run format
```

Build the project:

```bash
npm run build
```

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