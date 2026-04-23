# 🚀 IMPLEMENTATION GUIDE — Step by Step

## ⏱️ Time Estimate: 3-4 hours to get everything running

---

## STEP 1: Extract & Setup (10 min)

1. Extract the ZIP file
2. Open terminal (PowerShell or CMD) in the `mern-task-platform` folder
3. Verify Docker Desktop is running

---

## STEP 2: Create .env file for backend (5 min)

```bash
cd backend
copy ..\.env.example .env
```

The default values in `.env.example` already work with docker-compose. No changes needed.

---

## STEP 3: Run with Docker (10-15 min first time)

```bash
# From root folder (mern-task-platform/)
docker-compose up --build
```

Wait for all 5 services to start. You'll see:
- ✅ Connected to MongoDB
- ✅ Connected to Redis
- 🚀 Backend running on port 5000
- Worker starts listening

Then open: **http://localhost:3000**

---

## STEP 4: Test the full flow

1. Register a new account
2. Create a task: input "hello world", select "uppercase"
3. Watch status change: pending → running → success
4. See result: "HELLO WORLD"
5. Click "Show logs" to see task logs

---

## STEP 5: Push to GitHub

```bash
git init
git add .
git commit -m "feat: AI Task Processing Platform - MERN + Python Worker + Docker + K8s"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/mern-task-platform.git
git push -u origin main
```

Make the repo **PUBLIC** then submit the URL.

---

## STEP 6: Local Development (Optional - if you want to modify code)

Run MongoDB + Redis only via Docker:
```bash
docker-compose up mongodb redis
```

Backend:
```bash
cd backend
npm install
npm run dev
```

Worker:
```bash
cd worker
pip install -r requirements.txt
# Create .env in worker/ with MONGO_URI and REDIS_URL
python worker.py
```

Frontend:
```bash
cd frontend
npm install
npm run dev
```

---

## ⚠️ Common Issues & Fixes

### Issue: Port already in use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID_NUMBER> /F
```

### Issue: Docker build fails
```bash
docker-compose down --volumes
docker-compose up --build
```

### Issue: Worker not processing tasks
- Check worker logs: `docker logs taskflow-worker`
- Make sure Redis is healthy: `docker logs taskflow-redis`

### Issue: Frontend shows API error
- Make sure backend is running on port 5000
- Check: http://localhost:5000/health

---

## 📋 Pre-submission Checklist

- [ ] docker-compose up works without errors
- [ ] Can register a new user
- [ ] Can login
- [ ] Can create a task
- [ ] Task goes through: pending → running → success
- [ ] Result is shown correctly
- [ ] Logs show task history
- [ ] GitHub repo is PUBLIC
- [ ] README.md is present
- [ ] ARCHITECTURE.md is present

---

## 🎯 What to say if asked about Kubernetes/Argo CD

> "I've prepared the complete Kubernetes manifests (namespace, deployments, services, ingress, configmaps, secrets with resource limits and health probes) in the infra/k8s/ directory. The CI/CD pipeline is set up with GitHub Actions for lint, build, and Docker Hub push. For Argo CD, the GitOps flow is configured to auto-sync on repository changes. Due to the 24-hour constraint, I focused on ensuring the core async architecture works perfectly with Docker, while structuring K8s for real-world deployment."

---

Good luck! 🔥
