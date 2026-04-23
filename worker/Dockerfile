# Python worker - multi-stage build
FROM python:3.11-slim AS builder
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Production stage
FROM python:3.11-slim AS production
WORKDIR /app

# Non-root user for security
RUN addgroup --gid 1001 workergroup && \
    adduser --uid 1001 --gid 1001 --no-create-home workeruser

COPY --from=builder /root/.local /home/workeruser/.local
COPY worker.py .

RUN chown -R workeruser:workergroup /app
USER workeruser

ENV PATH=/home/workeruser/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1

CMD ["python", "-u", "worker.py"]
