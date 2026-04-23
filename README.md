# ⚡ TaskFlow — AI Task Processing Platform

> A production-ready async task processing system built with MERN stack, Python worker, Redis queue, Docker, and Kubernetes.

---

## 🏗️ Architecture

```
┌─────────────┐     HTTP      ┌──────────────────┐     Mongoose    ┌──────────┐
│   React +   │ ──────────▶  │  Node.js Express  │ ──────────────▶ │ MongoDB  │
│    Vite     │              │       API          │                 └──────────┘
└─────────────┘              └──────────────────┘
                                      │
                                 ioredis push
                                      │
                                      ▼
                              ┌──────────────┐
                              │     Redis     │  ◀── Queue (FIFO)
                              └──────────────┘
                                      │
                                 blpop (blocking)
                                      │
                                      ▼
                              ┌──────────────────┐     PyMongo     ┌──────────┐
                              │  Python Worker   │ ──────────────▶ │ MongoDB  │
                              │  (scalable)      │  update status  └──────────┘
                              └──────────────────┘
```

**Pattern:** Producer-Consumer Architecture
- **Producer:** Node.js API pushes jobs to Redis queue
- **Consumer:** Python worker pulls and processes jobs independently

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- Docker Desktop installed
- Git

### Steps

```bash
# 1. Clone the repository
git clone https://github.com/YOUR_USERNAME/mern-task-platform.git
cd mern-task-platform

# 2. Start all services
docker-compose up --build

# 3. Open browser
http://localhost:3000
```

That's it. All 5 services start automatically.

---

## 🛠️ Local Development (Without Docker)

### Backend

```bash
cd backend
npm install
cp ../.env.example .env   # Fill in your values
npm run dev               # Starts on port 5000
```

### Worker

```bash
cd worker
pip install -r requirements.txt
# Set environment variables (MONGO_URI, REDIS_URL)
python worker.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev               # Starts on port 3000
```

> **Note:** You need MongoDB and Redis running locally. Easiest: run only `mongodb` and `redis` via docker-compose, then run backend/worker/frontend locally.

```bash
docker-compose up mongodb redis
```

---

## 📡 API Endpoints

### Auth

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | ❌ |
| POST | `/api/auth/login` | Login user | ❌ |
| GET | `/api/auth/me` | Get current user | ✅ |

**Register body:**
```json
{
  "username": "john",
  "email": "john@example.com",
  "password": "password123"
}
```

**Login body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

### Tasks

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/tasks` | Create task | ✅ |
| GET | `/api/tasks` | List all tasks | ✅ |
| GET | `/api/tasks/:id` | Get single task | ✅ |
| DELETE | `/api/tasks/:id` | Delete task | ✅ |

**Create task body:**
```json
{
  "title": "My Task",
  "inputText": "hello world",
  "operation": "uppercase"
}
```

**Operations:** `uppercase` | `lowercase` | `reverse` | `word_count`

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

---

## ⚙️ Task Status Flow

```
pending ──▶ running ──▶ success
                  └───▶ failed
```

- **pending** — Task created, waiting in Redis queue
- **running** — Worker picked up and is processing
- **success** — Completed with result
- **failed** — Error occurred, error message saved

---

## 🐳 Docker Services

| Service | Image | Port |
|---------|-------|------|
| frontend | Custom (nginx) | 3000 |
| backend | Custom (node:18-alpine) | 5000 |
| worker | Custom (python:3.11-slim) | — |
| mongodb | mongo:7.0 | 27017 |
| redis | redis:7.2-alpine | 6379 |

**Scale workers:**
```bash
docker-compose up --scale worker=3
```

---

## ☸️ Kubernetes Deployment

```bash
# Apply all manifests
kubectl apply -f infra/k8s/namespace.yaml
kubectl apply -f infra/k8s/configmap-secret.yaml
kubectl apply -f infra/k8s/backend-deployment.yaml
kubectl apply -f infra/k8s/worker-deployment.yaml
kubectl apply -f infra/k8s/frontend-deployment.yaml

# Check status
kubectl get pods -n taskflow
```

---

## 🔐 Security

- Passwords hashed with **bcrypt** (12 rounds)
- **JWT** authentication on all protected routes
- **Helmet.js** security headers
- **Rate limiting** (100 req/15min per IP)
- No hardcoded secrets (uses `.env` / K8s Secrets)
- Non-root users in Docker containers

---

## 📈 Scalability Design

> *"Due to the 24-hour constraint, I focused on building a scalable async architecture with a working queue and containerization, while structuring Kubernetes and CI/CD for real-world deployment."*

**How this handles 100k tasks/day:**
- Redis queue handles burst traffic without API bottleneck
- Multiple worker replicas consume queue in parallel
- MongoDB indexed on `userId` + `status` for fast queries
- Worker is stateless — horizontal scaling is trivial

**Redis failure strategy:**
- Worker has retry logic with exponential backoff
- In production: Redis Sentinel or Redis Cluster for HA
- Dead-letter queue pattern can be added for failed jobs

---

## 📁 Project Structure

```
mern-task-platform/
├── backend/
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── middleware/      # Auth middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routes
│   │   ├── services/        # Redis service
│   │   └── app.js           # App entry point
│   ├── Dockerfile
│   └── package.json
├── worker/
│   ├── worker.py            # Python worker
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── api/             # Axios instance
│   │   ├── components/      # React components
│   │   ├── hooks/           # Auth context
│   │   ├── pages/           # Page components
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── infra/
│   └── k8s/                 # Kubernetes manifests
├── .github/
│   └── workflows/           # CI/CD pipeline
├── docker-compose.yml
├── .env.example
└── README.md
```
