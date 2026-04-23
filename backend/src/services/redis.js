const Redis = require("ioredis");

let client = null;

const getRedisClient = () => {
  if (!client) {
    client = new Redis(process.env.REDIS_URL || "redis://localhost:6379", {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error("❌ Redis connection failed after 3 retries");
          return null;
        }
        return Math.min(times * 200, 2000);
      },
    });

    client.on("connect", () => console.log("✅ Connected to Redis"));
    client.on("error", (err) => console.error("Redis error:", err.message));
  }
  return client;
};

const pushToQueue = async (queueName, data) => {
  const redis = getRedisClient();
  await redis.rpush(queueName, JSON.stringify(data));
};

module.exports = { getRedisClient, pushToQueue };
