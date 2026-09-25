# Dhaka Tesla Pool

Share a seat. Split the fare. Survive Dhaka traffic.

A ride-pooling MVP built around three actors — **Passenger**, **Driver/Tesla**, and **Ride/Pool** — where multiple compatible ride requests can share one vehicle, each passenger gets their own fare, and the driver manages the trip from request to completion.

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [The Cast](#the-cast)
- [Features Implemented](#features-implemented)
- [Architecture](#architecture)
- [Database Design (ERD)](#database-design-erd)
- [Tech Stack & Justification](#tech-stack--justification)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Running Tests](#running-tests)
- [Demo Credentials](#demo-credentials)
- [API Overview](#api-overview)
- [The Matching Rule](#the-matching-rule)
- [Fare Model](#fare-model)
- [Concurrency Handling](#concurrency-handling)
- [Key Decisions & Trade-offs](#key-decisions--trade-offs)
- [Known Limitations & Next Improvements](#known-limitations--next-improvements)
- [Git Workflow](#git-workflow)
- [AI Usage](#ai-usage)
- [Deployment](#deployment)
- [Demo Video](#demo-video)

---

## Problem Statement

Nusrat wants to get from Banani to Mohakhali. Rafiq wants to get from Banani to Gulshan 1. Jashim's Bullet has three seats. Passengers should be able to request a ride and, when it makes sense, share a Tesla with someone else. The driver needs to see who's assigned to the ride and what stage it's at. Each passenger needs to see their own fare and their own status, not anyone else's. And once a ride wraps up, the system holds onto enough history to explain exactly what happened.

This project does **not** attempt real-world routing or map integration — the challenge is about engineering judgment (data modeling, concurrency, state management, API design), not rebuilding Google Maps.

## The Cast

Seed data, tests, and manual demo walkthroughs consistently use the same cast throughout:

- **Jashim** — driver, owns **Bullet** (3-seat vehicle)
- **Nusrat** — passenger, Banani → Mohakhali
- **Rafiq** — passenger, Banani → Gulshan 1
- **Shirin** — passenger, used to demonstrate capacity limits

## Features Implemented

**Passenger**
- Register / log in (role-based: PASSENGER or DRIVER)
- Request a ride (pickup, destination, seats)
- See estimated fare before and after matching
- Track ride status: `REQUESTED → MATCHED → DRIVER_ARRIVED → STARTED → COMPLETED` (or `CANCELLED`)
- View ride history
- Cancel a ride while it's still cancellable

**Driver**
- Register a vehicle with fixed capacity
- Toggle vehicle online/offline
- View the currently active pool (passengers, seats, fares)
- Progress the ride through its lifecycle: mark driver arrived → start trip → complete trip

**Pooling**
- Multiple ride requests can share one vehicle when they match a documented zone-based rule
- Vehicle capacity is enforced — occupied seats can never exceed the vehicle's capacity
- Each passenger gets an individually calculated fare
- Full pool/ride lifecycle history is retained in the database

**Engineering**
- JWT authentication with role-based authorization middleware
- Request validation (Zod) on every mutating endpoint
- Database transactions with row-level locking (`SELECT ... FOR UPDATE`) to prevent overbooking under concurrent requests
- State-transition guard rejecting invalid lifecycle jumps (e.g. `COMPLETED → STARTED`)
- Automated tests covering capacity enforcement, invalid transitions, and cross-user access control
- Fully containerized via Docker Compose (API + Postgres, one command to run)

## Architecture

<img width="117" height="150" alt="Image" src="https://github.com/user-attachments/assets/7b9f52b5-545b-4554-86dc-b9d9868de5d9" />

## Database Design (ERD)
<img width="214" height="150" alt="Image" src="https://github.com/user-attachments/assets/073fb7b1-dea1-4ca1-86ec-ffebed444a30" />

**Table summary:**

| Table | Purpose |
|---|---|
| `User` | Passengers and drivers, distinguished by `role` |
| `Vehicle` | One vehicle per driver, with fixed `capacity` and `ONLINE`/`OFFLINE` status |
| `RideRequest` | A passenger's request: pickup, destination, seats, status, fare |
| `Pool` | A shared ride instance tied to one vehicle, with its own lifecycle status |
| `PoolMember` | Join table linking a `RideRequest` to a `Pool`, storing that passenger's individual fare |

Constraints worth noting:
- `Vehicle.driver_id` is unique — one vehicle per driver in this MVP
- `PoolMember.ride_request_id` is unique — a ride request can only belong to one pool
- All foreign keys are enforced at the database level via Prisma-generated constraints

## Tech Stack & Justification

| Area | Choice | Alternatives considered | Why this fits | What would make us switch |
|---|---|---|---|---|
| Backend framework | Express (Node.js + TypeScript) | Fastify, NestJS | Minimal boilerplate for an MVP this size; team familiarity; large ecosystem | If the project grew to need built-in DI, decorators, and a larger team convention — NestJS |
| Database | PostgreSQL | MySQL, SQLite | Strong relational integrity for the pooling/capacity domain; native support for row-level locking (`SELECT ... FOR UPDATE`), which the concurrency requirement directly depends on | If we needed serverless-first, ultra-low-latency reads at global scale — a distributed SQL option |
| ORM | Prisma 6.x | Prisma 7.x, Knex, raw SQL | Prisma 7 (released just before this project) requires a driver-adapter pattern with materially different, less-documented setup; Prisma 6 is the stable, well-documented line and lets us move faster under deadline | Once Prisma 7's driver-adapter pattern has wider community adoption and tooling support |
| Auth | JWT + bcrypt | Session-based auth, OAuth | Stateless, simple to test via Postman, sufficient for an MVP with no third-party login requirement | If the app needed server-side session revocation or SSO integration |
| Validation | Zod | Joi, express-validator | TypeScript-first schema inference — validation and types come from the same source, reducing drift | No strong reason to switch at this scale |
| Frontend framework | Next.js (App Router) | Plain React + Vite | Built-in routing, easy free-tier deployment on Vercel, matches PRD's recommendation | If the app needed more custom SSR/streaming control |
| Styling | Tailwind CSS | CSS Modules, styled-components | Fast to iterate under time pressure; utility classes avoid context-switching between files | If a design system with themeable tokens were required |
| Backend hosting | Render (free tier, Docker) | Railway, Fly.io | Direct Dockerfile-based deploys with no code changes needed; genuinely free tier | If cold-start latency (free tier spins down after 15 min idle) became unacceptable |
| Database hosting | Neon (free tier) | Render's own Postgres, Supabase | Render's free Postgres expires after 30 days; Neon's free tier has no such expiry, which matters for a project that may be reviewed weeks after submission | If the project needed built-in auth/storage bundled with the DB — Supabase |
| Frontend hosting | Vercel | Netlify | Zero-config Next.js deploys, generous free tier, fastest iteration | No strong reason to switch at this scale |
| Testing | Jest | Vitest, Mocha | Widely documented, works cleanly with `ts-jest` and Prisma | If migrating fully to ESM-native tooling, Vitest is worth revisiting |

## Project Structure

```
pool_backend/
├── src/
│   ├── controllers/       # Request/response handling
│   ├── services/          # Business logic (auth, rides, pooling, fares, transitions)
│   ├── middlewares/       # JWT auth + role-based guards
│   ├── routes/            # Express route definitions
│   ├── config/            # Zone/matching-rule configuration
│   ├── db/                # Prisma client instance
│   └── index.ts           # App entry point
├── prisma/
│   ├── schema.prisma       # Data model
│   └── migrations/         # Versioned migration history
├── tests/                  # Jest test suites
├── Dockerfile
├── docker-compose.yml
├── .env.example
└── README.md

pool_frontend/
├── src/
│   ├── app/
│   │   ├── login/
│   │   ├── register/
│   │   ├── passenger/       # Passenger dashboard
│   │   └── driver/          # Driver dashboard
│   └── lib/
│       ├── api.ts            # Authenticated fetch wrapper
│       └── auth.ts           # Token/role storage helpers
└── README.md
```

## Prerequisites

- Docker Desktop (backend)
- Node.js 20+ and npm (frontend local dev)
- Git

## Environment Variables

**Backend** (`pool_backend/.env`, based on `.env.example`):
```
PORT=4000
DATABASE_URL=postgresql://pool_user:pool_pass@db:5432/pool_db
JWT_SECRET=<a long random string>
```

**Frontend** (`pool_frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:4000
```

## Local Setup

**Backend:**
```bash
git clone <backend-repo-url>
cd pool_backend
cp .env.example .env
docker compose up --build
```
This starts both the API (port 4000) and PostgreSQL (port 5432). On first run, apply migrations and generate the Prisma client (already baked into the image, but re-run if the schema changes):
```bash
docker compose exec backend npx prisma migrate dev
```

**Frontend:**
```bash
git clone <frontend-repo-url>
cd pool_frontend
npm install
cp .env.example .env.local   # set NEXT_PUBLIC_API_URL to your backend URL
npm run dev
```
Visit `http://localhost:3000`.

## Running Tests

```bash
docker compose exec backend npm test
```

Covers:
- Pool capacity is never exceeded, even when a request would overflow the vehicle
- Invalid ride-lifecycle transitions are rejected (e.g. `COMPLETED → STARTED`)
- A user cannot cancel another user's ride (cross-user access control)
- Cancellation rules are enforced (e.g. a `STARTED` ride cannot be cancelled)

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Driver | jashim@example.com | password123 |
| Passenger | nusrat@example.com | password123 |
| Passenger | rafiq@example.com | password123 |



## API Overview

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | — | Register as PASSENGER or DRIVER |
| POST | `/api/auth/login` | — | Log in, returns JWT |
| POST | `/api/vehicles` | Driver | Create a vehicle |
| PATCH | `/api/vehicles/status` | Driver | Toggle ONLINE/OFFLINE |
| GET | `/api/vehicles/me` | Driver | Get own vehicle |
| POST | `/api/rides` | Passenger | Request a ride (auto-attempts pool matching) |
| GET | `/api/rides/history` | Passenger | View own ride history |
| PATCH | `/api/rides/:id/cancel` | Passenger | Cancel own ride (while eligible) |
| GET | `/api/pools/active` | Driver | Get driver's current active pool |
| GET | `/api/pools/:id` | Driver | Get pool details |
| PATCH | `/api/pools/:id/arrived` | Driver | Mark driver arrived |
| PATCH | `/api/pools/:id/start` | Driver | Start trip |
| PATCH | `/api/pools/:id/complete` | Driver | Complete trip |

## The Matching Rule

This is an assumption we made and documented, not a rule explicitly specified in the PRD:

> Two ride requests can share a vehicle if they have the **same pickup zone** and the second request's destination is in a **predefined compatible-destinations list** for that zone.

Example: `Banani → Mohakhali` and `Banani → Gulshan 1` are compatible because both are reachable from Banani per our documented zone list (`src/config/zones.ts`). This avoids real routing/map integration entirely while still producing a testable, explainable rule.

## Fare Model

```
passengerFare = baseFare + distanceCharge - poolDiscount
```
- Base fare: ৳40 (4000 paisa)
- Distance charge: ৳60 (6000 paisa)
- Pool discount: ৳20 (2000 paisa), applied only when the ride is pooled

**Why paisa (integers), not decimal taka:** storing money as integers avoids floating-point rounding errors entirely — a well-known pitfall when doing repeated arithmetic on currency. ৳80 is stored as `8000`.

**Known trade-off:** fare is calculated and locked in at the moment a ride is assigned to a pool. It is not retroactively recalculated for earlier pool members when a new passenger joins the same pool later. This was a deliberate simplification to keep the fare model easy to reason about and test under deadline; a production version might recalculate all members' fares whenever pool composition changes.

## Concurrency Handling

**The problem:** if two passengers request the last available seat on a vehicle at nearly the same instant, both requests could read "1 seat available" before either commits — leading to overbooking.

**My approach:** every pool-assignment attempt runs inside a Postgres transaction (`prisma.$transaction`). Before reading the pool's current occupancy, we acquire a row lock on the vehicle (`SELECT id FROM "Vehicle" WHERE id = $1 FOR UPDATE`). This forces a second concurrent transaction to wait until the first commits, then re-read the *fresh* occupancy count — not a stale one captured before the wait. This was verified by firing two genuinely simultaneous requests via a small Node script (`Promise.all`) against the last remaining seat; only one request was matched, the other correctly fell back to `REQUESTED`.


## Key Decisions & Trade-offs


- **Two separate repositories** (backend/frontend) rather than a monorepo: simpler to manage independently mid-build; each has its own README, the backend's being the canonical source for full project documentation.
- **Driver dashboard requires manual refresh** to see new ride requests — no polling or websocket implemented, given time constraints.

## Known Limitations & Next Improvements
- Driver dashboard does not auto-refresh; requires manual reload to see new requests
- Real-time updates (websockets), real map/routing integration, and a real payment gateway were explicitly out of scope per the PRD and were not built

## Git Workflow

This repository follows the required branch structure:
- `master` — stable, integrated code
- `pre-release` — integration fixes, docs, deployment checks
- `release/v1.0.0` — the version shown in the demo video

Feature branches used during development: `feature/passenger-auth`, `feature/driver-flow`, `feature/tesla-pooling`, `feature/ride-lifecycle`, `feature/testing`, `feature/driver-active-pool`. Each was merged into `master` once its functionality was verified working, both manually (Postman) and, where applicable, via automated tests.

## AI Usage

AI assistance (Claude) was used throughout this project for: scaffolding boilerplate (Express/TypeScript setup, Prisma schema drafts), debugging Docker/Prisma/Next.js configuration issues encountered during setup, and reviewing logic for the pooling and concurrency-handling services.

- **One accepted suggestion:** using a database transaction with `SELECT ... FOR UPDATE` row locking to solve the last-seat concurrency race, rather than an application-level mutex or optimistic locking — this fit Postgres's native capabilities and was straightforward to test with a parallel-request script.
- **One rejected/changed suggestion:** an early version of the pool-assignment logic acquired the row lock *after* reading the pool's occupied-seat count rather than before. This was caught by an automated test that revealed both concurrent requests being matched into the same pool, overbooking the vehicle. The fix (locking first, then re-reading fresh data) was implemented after understanding *why* the original ordering was unsafe — not just applying a suggested fix blindly.


- **Backend (Render, Docker):** https://dhaka-ridepool.onrender.com
- **Database (Neon, PostgreSQL):** free-tier, no expiry
- **Frontend (Vercel):** https://dhaka-ridepool.vercel.app/login
## Demo Video

*(Add your 6-minute video link here once recorded)*
