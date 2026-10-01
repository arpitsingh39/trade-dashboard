# Trade Dashboard

A full-stack trade dashboard built for a technical assessment involving
a long-running BSE trade-data pull under a 30-second HTTP connection
limit.

The project demonstrates how a trade pull that can take much longer than
the maximum HTTP connection lifetime can be handled asynchronously,
persisted in MongoDB, and pushed to an already-open React dashboard
without page refresh, polling, or a scheduler.

## Problem Statement

The assessment scenario is:

> A full trade-data pull can take up to 15 minutes, while the network
> terminates any HTTP connection that remains open for more than 30
> seconds.

The application therefore needs to:

-   provide a Mock BSE API;
-   start a long-running pull without keeping an HTTP request open for
    the entire duration;
-   persist pulled trades;
-   show already-pulled trades immediately on the dashboard;
-   automatically show newly pulled trades when the pull completes;
-   avoid browser refreshes, polling loops, and cron/scheduler jobs.

## Solution

The implementation separates **starting a pull** from **completing a
pull**.

1.  React requests a new trade pull from the backend.
2.  The backend asks the Mock BSE to start a background pull.
3.  The Mock BSE responds immediately with a job ID.
4.  The HTTP request is therefore completed quickly instead of remaining
    open for the configured pull duration.
5.  The Mock BSE performs its simulated delay in the background.
6.  When the job completes, the Mock BSE generates new trades and sends
    them to the backend through a callback.
7.  The backend stores the trades in MongoDB using `bulkWrite` with
    `upsert`.
8.  The backend emits a Socket.IO event.
9.  The open React dashboard receives the event and fetches the latest
    persisted trades automatically.

## Architecture

``` text
                         ┌──────────────────────┐
                         │   React Dashboard    │
                         │                      │
                         │  Existing trades     │
                         │  Pull New Trades     │
                         └──────────┬───────────┘
                                    │
                         HTTP + Socket.IO
                                    │
                                    ▼
                    ┌─────────────────────────────┐
                    │     Node.js + Express       │
                    │                             │
                    │  /pullTrades                │
                    │  /trades                    │
                    │  /bse-callback              │
                    └───────┬─────────────┬───────┘
                            │             │
                     HTTP start           │
                            │             │ Socket.IO
                            ▼             │
                    ┌─────────────────┐   │
                    │   Mock BSE API  │   │
                    │                 │   │
                    │ /getTrades      │   │
                    │ /startPull      │   │
                    │                 │   │
                    │ Background job  │   │
                    └────────┬────────┘   │
                             │            │
                      callback│            │
                             ▼            │
                    ┌─────────────────┐   │
                    │ Node.js Backend │   │
                    └────────┬────────┘   │
                             │            │
                             ▼            │
                    ┌─────────────────┐   │
                    │    MongoDB      │◄──┘
                    │                 │
                    │ Persisted trades│
                    └─────────────────┘
```

### Why this architecture?

The critical constraint is that an HTTP connection cannot remain open
for the entire duration of a long-running pull.

The application therefore uses an asynchronous job-style flow:

``` text
React
  │
  │ POST /pullTrades
  ▼
Backend
  │
  │ POST /startPull
  ▼
Mock BSE
  │
  ├── responds immediately
  │
  └── background delay
          │
          ▼
      Generate trades
          │
          ▼
      POST /bse-callback
          │
          ▼
       MongoDB
          │
          ▼
      Socket.IO
          │
          ▼
        React
```

The Socket.IO connection is used only for real-time notification. It
does not replace MongoDB or store the trade data itself.

## Tech Stack

### Frontend

-   React
-   Vite
-   JavaScript
-   CSS
-   Socket.IO Client

### Backend

-   Node.js
-   Express
-   Socket.IO
-   Mongoose
-   dotenv
-   CORS

### Database

-   MongoDB

## Project Structure

``` text
trade-dashboard/
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   ├── models/
│   │   │   └── TradeTemp.js
│   │   ├── routes/
│   │   │   ├── bseRoutes.js
│   │   │   ├── callbackRoutes.js
│   │   │   └── tradeRoutes.js
│   │   ├── services/
│   │   │   └── pullService.js
│   │   ├── sockets/
│   │   │   └── socket.js
│   │   └── server.js
│   ├── .env
│   ├── .gitignore
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── assets/
│   │   ├── App.css
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   └── vite.config.js
│
└── README.md
```

## Data Model

Each trade contains:

  Field         Type     Description
  ------------- -------- -------------------------
  `tradeId`     Number   Unique trade identifier
  `client`      String   Client name
  `symbol`      String   Stock symbol
  `quantity`    Number   Trade quantity
  `price`       Number   Trade price
  `timestamp`   Date     Trade timestamp

`tradeId` is unique in MongoDB.

## API Endpoints

### Mock BSE API

#### `GET /getTrades`

Returns seeded trade data from the Mock BSE.

Supported query parameters:

-   `offset` --- starting position
-   `limit` --- number of records to return
-   `delay` --- simulated delay in seconds

Example:

``` text
GET http://localhost:5000/getTrades?offset=0&limit=500&delay=2
```

Example response:

``` json
{
  "trades": [],
  "total": 3000,
  "offset": 0,
  "limit": 500
}
```

#### `POST /startPull`

Starts an asynchronous mock BSE pull.

Example:

``` text
POST http://localhost:5000/startPull?delay=10
```

The endpoint responds immediately with a job ID. The simulated pull
continues in the background.

### Backend

#### `POST /pullTrades`

Starts a trade pull from the dashboard.

Example:

``` text
POST http://localhost:5000/pullTrades
```

The backend starts the Mock BSE pull and returns without waiting for the
simulated long-running operation to complete.

#### `GET /trades`

Returns trades persisted in MongoDB.

Example:

``` text
GET http://localhost:5000/trades
```

#### `POST /bse-callback`

Internal callback endpoint used by the Mock BSE to send completed trade
data back to the backend.

After successful persistence, the backend emits:

``` text
tradesUpdated
```

through Socket.IO.

## Environment Variables

Create `backend/.env`:

``` env
BSE_PULL_DELAY=10
MONGO_URI=mongodb://127.0.0.1:27017/trade_dashboard
```

### `BSE_PULL_DELAY`

Controls the simulated Mock BSE pull duration in seconds.

For example:

``` env
BSE_PULL_DELAY=10
```

For testing the assessment's connection constraint, this can be changed
to:

``` env
BSE_PULL_DELAY=40
```

The `.env` file is intentionally excluded from Git.

## Prerequisites

Install:

-   Node.js
-   npm
-   MongoDB

Make sure MongoDB is running locally before starting the backend.

## Installation

### 1. Clone the repository

``` bash
git clone <your-repository-url>
cd trade-dashboard
```

### 2. Install backend dependencies

``` bash
cd backend
npm install
```

### 3. Configure backend environment variables

Create:

``` text
backend/.env
```

with:

``` env
BSE_PULL_DELAY=10
MONGO_URI=mongodb://127.0.0.1:27017/trade_dashboard
```

### 4. Install frontend dependencies

Open another terminal:

``` bash
cd trade-dashboard/frontend
npm install
```

## Running the Application

### Start the backend

From the `backend` directory:

``` bash
npm run dev
```

The backend runs at:

``` text
http://localhost:5000
```

### Start the frontend

From the `frontend` directory:

``` bash
npm run dev
```

Vite will display the local frontend URL in the terminal, normally:

``` text
http://localhost:5173
```

Open that URL in the browser.

## Testing the Application

### Normal pull

1.  Start MongoDB.
2.  Start the backend.
3.  Start the frontend.
4.  Open the dashboard.
5.  Click **Pull New Trades**.
6.  The existing trades remain visible while the pull is running.
7.  After the configured delay, 100 new trades are generated.
8.  The backend saves them to MongoDB.
9.  Socket.IO notifies the dashboard.
10. The dashboard automatically displays the new trades without a
    browser refresh.

### Testing the 30-second connection constraint

To simulate a pull that exceeds the network's 30-second HTTP connection
limit, set:

``` env
BSE_PULL_DELAY=40
```

Restart the backend and click **Pull New Trades** once.

The expected behavior is:

``` text
Browser
   │
   │ POST /pullTrades
   ▼
Backend
   │
   │ POST /startPull?delay=40
   ▼
Mock BSE
   │
   ├── responds immediately
   │
   └── continues background work for 40 seconds
```

The dashboard remains open and existing trades remain visible during the
40-second delay.

After the delay:

``` text
Mock BSE
   │
   │ POST /bse-callback
   ▼
Backend
   │
   ├── MongoDB
   │
   └── Socket.IO
          │
          ▼
       Dashboard
```

No browser refresh or polling loop is required.

## Handling Restarts

New trade IDs are generated using the highest trade ID already persisted
in MongoDB.

For example:

``` text
MongoDB before restart:
1 ... 4300

Backend restarts

Mock BSE recreates its seeded in-memory data:
1 ... 3000

New pull checks MongoDB:
highest ID = 4300

New trades:
4301 ... 4400
```

This prevents a backend restart from causing new pulls to reuse
previously persisted trade IDs.

The implementation also serializes trade generation so simultaneous pull
jobs do not independently select the same starting ID.

## Real-Time Updates

The application uses Socket.IO for dashboard notifications.

The backend does not send the trade data through Socket.IO as the source
of truth.

Instead:

``` text
BSE callback
     ↓
MongoDB
     ↓
Socket.IO: "tradesUpdated"
     ↓
React
     ↓
GET /trades
     ↓
Updated dashboard
```

MongoDB remains the persisted source of truth, while Socket.IO provides
the real-time notification mechanism.

## Key Design Decisions

### Asynchronous pull

The application does not keep the initial HTTP request open for the
entire pull duration.

This avoids the 30-second network connection constraint.

### MongoDB persistence

Pulled trades are stored in MongoDB so that the dashboard can display
previously pulled data after the backend restarts.

### `bulkWrite` + `upsert`

The callback uses MongoDB bulk operations with `upsert` to avoid
duplicate-key failures if a trade is received more than once.

### Socket.IO

Socket.IO eliminates the need for:

-   browser refreshes;
-   polling loops;
-   cron jobs;
-   scheduler-based dashboard refreshes.

### Mock BSE

The BSE exchange is represented by a local mock API for the assessment.
The asynchronous job and callback behavior are part of this mock
implementation and should not be interpreted as a claim about the real
BSE API.

## Production Considerations

This assessment implementation intentionally keeps the architecture
lightweight.

For a production system, the in-memory background job could be replaced
with a durable job queue or worker system such as Redis-backed queues or
a cloud-managed queue.

Other production improvements could include:

-   authentication and authorization;
-   structured logging;
-   request validation;
-   retry and dead-letter handling for callbacks;
-   idempotency keys;
-   distributed job locking;
-   monitoring and alerting;
-   rate limiting;
-   deployment-specific configuration;
-   persistent job status tracking.

## Assessment Requirement Mapping

  -----------------------------------------------------------------------
  Assessment Requirement              Implementation
  ----------------------------------- -----------------------------------
  Mock BSE `GET /getTrades`           Implemented

  Seeded trade data                   3000 initial records

  Configurable pull delay             `BSE_PULL_DELAY` / `delay` query
                                      parameter

  Long-running pull without long HTTP Background `startPull` job
  connection                          

  Dashboard opens with existing data  MongoDB-backed `/trades`

  New trades appear automatically     Socket.IO `tradesUpdated` event

  No browser refresh                  Implemented

  No polling loop                     Implemented

  No cron/scheduler                   Implemented

  README/setup instructions           This document

  Architecture explanation            Included above
  -----------------------------------------------------------------------

## Notes

This repository contains a local Mock BSE implementation created
specifically for the assessment. It does not connect to or claim to
reproduce the behavior of the real BSE Exchange API.
