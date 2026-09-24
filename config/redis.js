const { createClient } = require("redis");

const redisUrl = process.env.REDIS_URL || "redis://localhost:6379";

// Publisher
const pubClient = createClient({
  url: redisUrl,
});

// Subscriber
const subClient = pubClient.duplicate();

pubClient.on("error", (error) => {
  console.error("Redis Publisher Error:", error);
});

subClient.on("error", (error) => {
  console.error("Redis Subscriber Error:", error);
});

async function connectRedis() {
  await pubClient.connect();
  await subClient.connect();

  console.log("Redis Publisher connected");
  console.log("Redis Subscriber connected");
}

module.exports = {
  pubClient,
  subClient,
  connectRedis,
};