import os
import json
import time
import logging
from datetime import datetime
import redis
from pymongo import MongoClient
from bson import ObjectId
from dotenv import load_dotenv

load_dotenv()

# Logging setup
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

QUEUE_NAME = "task_queue"
RETRY_DELAY = 5  # seconds between retries on connection failure


def connect_redis():
    """Connect to Redis with retry logic."""
    while True:
        try:
            client = redis.Redis.from_url(
                os.getenv("REDIS_URL", "redis://localhost:6379"),
                decode_responses=True,
                socket_connect_timeout=5,
            )
            client.ping()
            logger.info("✅ Connected to Redis")
            return client
        except Exception as e:
            logger.error(f"❌ Redis connection failed: {e}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)


def connect_mongo():
    """Connect to MongoDB with retry logic."""
    while True:
        try:
            client = MongoClient(
                os.getenv("MONGO_URI", "mongodb://localhost:27017/taskdb"),
                serverSelectionTimeoutMS=5000,
            )
            client.server_info()
            logger.info("✅ Connected to MongoDB")
            return client
        except Exception as e:
            logger.error(f"❌ MongoDB connection failed: {e}. Retrying in {RETRY_DELAY}s...")
            time.sleep(RETRY_DELAY)


def process_operation(operation: str, input_text: str) -> str:
    """Core task processing logic."""
    if operation == "uppercase":
        return input_text.upper()
    elif operation == "lowercase":
        return input_text.lower()
    elif operation == "reverse":
        return input_text[::-1]
    elif operation == "word_count":
        count = len(input_text.split())
        return str(count)
    else:
        raise ValueError(f"Unknown operation: {operation}")


def update_task(db, task_id: str, update_data: dict):
    """Update task in MongoDB."""
    update_data["updatedAt"] = datetime.utcnow()
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {"$set": update_data, "$push": {"logs": {"$each": update_data.pop("new_logs", [])}}},
    )


def process_job(db, job: dict):
    """Process a single job from the queue."""
    task_id = job.get("taskId")
    operation = job.get("operation")
    input_text = job.get("inputText")

    logger.info(f"Processing task {task_id} | operation: {operation}")

    # Update status to running
    db.tasks.update_one(
        {"_id": ObjectId(task_id)},
        {
            "$set": {"status": "running", "updatedAt": datetime.utcnow()},
            "$push": {"logs": f"Worker picked up task at {datetime.utcnow().isoformat()}"},
        },
    )

    try:
        # Simulate slight processing delay (realistic behavior)
        time.sleep(1)

        result = process_operation(operation, input_text)

        # Update status to success
        db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "success",
                    "result": result,
                    "updatedAt": datetime.utcnow(),
                },
                "$push": {
                    "logs": f"Task completed successfully at {datetime.utcnow().isoformat()}"
                },
            },
        )
        logger.info(f"✅ Task {task_id} completed | result: {result}")

    except Exception as e:
        error_msg = str(e)
        logger.error(f"❌ Task {task_id} failed: {error_msg}")

        # Update status to failed
        db.tasks.update_one(
            {"_id": ObjectId(task_id)},
            {
                "$set": {
                    "status": "failed",
                    "errorMessage": error_msg,
                    "updatedAt": datetime.utcnow(),
                },
                "$push": {
                    "logs": f"Task failed at {datetime.utcnow().isoformat()}: {error_msg}"
                },
            },
        )


def main():
    logger.info("🚀 Worker starting...")

    redis_client = connect_redis()
    mongo_client = connect_mongo()

    db_name = os.getenv("MONGO_URI", "mongodb://localhost:27017/taskdb").split("/")[-1].split("?")[0]
    db = mongo_client[db_name]

    logger.info(f"👂 Listening on queue: {QUEUE_NAME}")

    while True:
        try:
            # Blocking pop — waits for jobs (timeout=0 means wait forever)
            result = redis_client.blpop(QUEUE_NAME, timeout=30)

            if result is None:
                # Timeout — just continue loop (heartbeat)
                logger.debug("No jobs in queue, waiting...")
                continue

            _, raw_job = result
            job = json.loads(raw_job)
            process_job(db, job)

        except redis.exceptions.ConnectionError:
            logger.error("Redis disconnected. Reconnecting...")
            redis_client = connect_redis()

        except Exception as e:
            logger.error(f"Unexpected error in worker loop: {e}")
            time.sleep(2)


if __name__ == "__main__":
    main()
