import Redis from "ioredis"

const redis=new Redis(process.env.REDIS_URL)

redis.on("ready", async () => {
    console.log("redis ready");

    try {
        await redis.set("test-key", "hello", "EX", 60);
        console.log("redis test successful");
    } catch (error) {
        console.error("redis test error:", error);
    }
});

export default redis