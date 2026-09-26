# LMS Backend

Backend service for the Learning Management System (LMS), built with NestJS, PostgreSQL, TypeORM, and Docker.

## Tech Stack

- Node.js
- NestJS
- TypeScript
- PostgreSQL 16
- TypeORM
- Docker & Docker Compose
- Swagger / OpenAPI

## Prerequisites

Make sure the following are installed:

- Node.js
- npm
- Docker Desktop

## Installation

Install the project dependencies:

```bash
npm install
```

## Environment Variables

Create a `.env` file from `.env.example` and update the values if needed.

> Do not commit the `.env` file to Git.

## Run PostgreSQL

Start the PostgreSQL container:

```bash
docker compose up -d
```

Verify that the container is running and healthy:

```bash
docker compose ps
```

## Run the Application

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

## Stop PostgreSQL

Stop the Docker containers:

```bash
docker compose down
```

To start them again:

```bash
docker compose up -d
```