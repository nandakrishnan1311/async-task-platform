# TaskFlow — Architecture Document

**Project:** AI Task Processing Platform
**Stack:** MERN + Python Worker + Redis + Docker + Kubernetes
**Author:** Nandakrishnan

---

## 1. System Overview

TaskFlow is an asynchronous task processing platform that decouples task submission from task execution using a Producer-Consumer architecture. Users submit text processing tasks through a React frontend, which are queued in Redis and processed by an independent Python worker — allowing the API to remain responsive even under heavy load.

---

## 2. Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                             │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │         React + Vite (Port 3000)                     │     │
│   │   Login │ Register │ Dashboard │ Task List │ Logs    │     │
│   └────────────────────────┬─────────────────────────────┘     │
└────────────────────────────│────────────────────────────────────┘
                             │ HTTP REST (JWT)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                         API LAYER                               │
│                                                                 │
│   ┌──────────────────────────────────────────────────────┐     │
│   │       Node.js + Express (Port 5000)                  │     │
│   │                                                      │     │
│   │  /auth/register  /auth/login  /auth/me               │     │
│   │  POST /tasks     GET /tasks   GET /tasks/:id         │     │
│   │                                                      │     │
│   │  Middleware: Helmet │ JWT Auth │ Rate Limiter         │     │
│   └────────┬─────────────────────────┬────────────────── ┘     │
└────────────│─────────────────────────│────────────────────────┘
             │                         │
        Mongoose                  ioredis RPUSH
             │                         │
             ▼                         ▼
┌────────────────────┐    ┌────────────────────────┐
│   MongoDB (27017)  │    │    Redis Queue (6379)   │
│                    │    │                         │
│   users collection │    │   task_queue (FIFO)     │
│   tasks collection │    │   BLPOP (blocking read) │
│                    │    └──────────┬──────────────┘
│   Indexes:         │               │
│   userId + status  │          BLPOP pull
│   userId + date    │               │
└────────────────────┘               ▼
             ▲            ┌────────────────────────┐
             │            │   Python Worker         │
             │            │   (Scalable Replicas)   │
        PyMongo           │                         │
        update status     │   uppercase / lowercase │
             └────────────┤   reverse / word_count  │
                          │                         │
                          │   Status: pending        │
                          │         → running        │
                          │         → success/failed │
                          └────────────────────────┘
```

---

## 3. Component Breakdown

### 3.1 Frontend (React + Vite)

- Single Page Application with React Router for navigation
- JWT token stored in localStorage, attached to every API request via Axios interceptor
- **Polling mechanism:** Every 2 seconds, active tasks are re-fetched until reaching terminal state (success/failed)
- Status-based UI animations: spinner for pending/running, fade-in for results
- Tailwind CSS for responsive, dark-mode design

### 3.2 Backend API (Node.js + Express)

Responsibilities:
- User authentication (register/login with bcrypt + JWT)
- Task creation: validates input, saves to MongoDB with `status: pending`, pushes job to Redis
- Task retrieval: supports filtering by status, pagination
- Security: Helmet headers, rate limiting (100 req/15min), input validation

Key design decision: The API **never processes tasks itself**. It only queues them. This keeps the API fast and stateless.

### 3.3 Redis Queue

Redis acts as the message broker using a simple List data structure:
- API uses `RPUSH task_queue <job_json>` to enqueue
- Worker uses `BLPOP task_queue 30` (blocking pop, 30s timeout) to dequeue

This is a FIFO queue. The blocking pop means the worker sleeps efficiently when the queue is empty — no CPU waste from polling.

### 3.4 Python Worker

The worker is the heart of the async system:

```
1. BLPOP from Redis (blocking — waits for jobs)
2. Parse job: { taskId, operation, inputText }
3. Update MongoDB: status = "running"
4. Process operation (uppercase/lowercase/reverse/word_count)
5a. Success: Update MongoDB: status = "success", result = output
5b. Failure: Update MongoDB: status = "failed", errorMessage = error
```

The worker is **stateless** — it holds no in-memory state between jobs. This means multiple worker replicas can run simultaneously, all consuming from the same Redis queue independently.

### 3.5 MongoDB

Two collections:

**users**
```json
{ "_id", "username", "email", "password (hashed)", "createdAt" }
```

**tasks**
```json
{
  "_id", "userId", "title", "inputText", "operation",
  "status", "result", "logs", "errorMessage",
  "createdAt", "updatedAt"
}
```

**Indexes for performance:**
- `{ userId: 1, status: 1 }` — filter tasks by user and status
- `{ userId: 1, createdAt: -1 }` — sort tasks by newest first

---

## 4. Task State Machine

```
                 ┌─────────┐
    Task Created │ PENDING │
                 └────┬────┘
                      │ Worker picks up
                 ┌────▼────┐
                 │ RUNNING │
                 └────┬────┘
              ┌───────┴───────┐
              │               │
         ┌────▼────┐    ┌─────▼──────┐
         │ SUCCESS │    │   FAILED   │
         └─────────┘    └────────────┘
```

Every transition is logged in the task's `logs` array, providing a full audit trail.

---

## 5. Scalability Strategy

### Handling 100k Tasks/Day

100,000 tasks/day = ~1.16 tasks/second average, with burst periods potentially hitting 10-50x.

**Why this architecture handles it:**

1. **API stays fast** — API only writes to MongoDB and pushes to Redis. Both are O(1) operations. API can handle thousands of requests/second.

2. **Redis absorbs burst traffic** — Queue acts as a buffer. If 10,000 tasks arrive in one minute, they queue up in Redis. Workers consume at their own pace. No data is lost.

3. **Horizontal worker scaling** — Since workers are stateless, simply adding more replicas increases throughput linearly.

```bash
# Scale to 10 workers:
docker-compose up --scale worker=10

# Or in Kubernetes:
kubectl scale deployment taskflow-worker --replicas=10 -n taskflow
```

4. **MongoDB indexing** — Compound indexes ensure task queries remain fast even with millions of records.

### Throughput Estimation

| Workers | Tasks/Hour | Tasks/Day |
|---------|-----------|-----------|
| 1 | ~3,600 | ~86,400 |
| 2 | ~7,200 | ~172,800 |
| 5 | ~18,000 | ~432,000 |
| 10 | ~36,000 | ~864,000 |

(Assuming ~1 second processing time per task including DB writes)

---

## 6. Redis Failure Handling

**Current implementation:**
- Worker has exponential backoff retry on Redis disconnection
- Reconnects automatically without crashing

**Production strategy:**
- **Redis Sentinel** for automatic failover (leader election)
- **Redis Cluster** for horizontal scaling and data partitioning
- **Dead-letter queue:** Failed jobs (after N retries) are pushed to a `task_queue_failed` list for manual inspection or reprocessing

```python
# Dead letter queue pattern (production addition):
MAX_RETRIES = 3
if job.get('retries', 0) >= MAX_RETRIES:
    redis.rpush('task_queue_failed', json.dumps(job))
else:
    job['retries'] = job.get('retries', 0) + 1
    redis.rpush('task_queue', json.dumps(job))  # re-queue
```

---

## 7. Security Architecture

| Layer | Implementation |
|-------|---------------|
| Passwords | bcrypt with 12 salt rounds |
| Authentication | JWT (7-day expiry) |
| HTTP Security | Helmet.js (15+ security headers) |
| Rate Limiting | 100 requests / 15 minutes per IP |
| Container Security | Non-root users in all Docker images |
| Secrets Management | Environment variables / K8s Secrets (no hardcoded secrets) |

---

## 8. Docker Architecture

Each service has its own **multi-stage Dockerfile** to minimize image size:

| Service | Base Image | Final Size (approx) |
|---------|-----------|---------------------|
| backend | node:18-alpine | ~120MB |
| worker | python:3.11-slim | ~150MB |
| frontend | nginx:alpine | ~25MB |

All containers run as **non-root users** for security compliance.

---

## 9. Kubernetes Architecture

```
Namespace: taskflow
│
├── Deployments
│   ├── taskflow-backend (2 replicas)
│   ├── taskflow-worker  (2 replicas — scalable)
│   └── taskflow-frontend (1 replica)
│
├── Services (ClusterIP)
│   ├── taskflow-backend-service  :5000
│   └── taskflow-frontend-service :80
│
├── Ingress
│   └── taskflow-ingress (nginx)
│       ├── /     → frontend
│       └── /api  → backend
│
├── ConfigMap: taskflow-config (non-sensitive env vars)
└── Secret: taskflow-secrets (MONGO_URI, JWT_SECRET)
```

**Liveness & Readiness Probes:**
- Backend: HTTP GET `/health` — ensures traffic only goes to healthy pods
- Worker: exec ping to Redis — ensures worker can reach queue

---

## 10. CI/CD Pipeline (GitHub Actions)

```
Push to main
     │
     ▼
[Lint] → ESLint (backend) + Python deps check
     │
     ▼
[Build & Push] → Docker images built and pushed to Docker Hub
     │           Tags: latest + git SHA (8 chars)
     ▼
[GitOps] → Argo CD auto-sync detects new image tags
     │      Applies updated manifests to Kubernetes cluster
     ▼
[Live] → Zero-downtime rolling deployment
```

---

## 11. Design Decisions

**Why Redis (not a database queue)?**
Redis is in-memory, making queue operations microsecond-fast. Database queues (polling MongoDB) would add unnecessary DB load. Redis BLPOP provides efficient blocking reads with no CPU waste.

**Why Python for the worker (not Node.js)?**
Python's ecosystem is more suitable for future AI/ML task integration (PyTorch, transformers, scikit-learn). The current string operations are trivial, but the architecture is ready for real ML workloads.

**Why polling (not WebSockets)?**
Polling every 2 seconds is simple, reliable, and sufficient for this use case. WebSockets would add complexity (socket.io, connection management) with minimal benefit for task durations of 1-5 seconds.

---

*Built for Green Dream Earth MERN Stack Developer Intern Assignment*
