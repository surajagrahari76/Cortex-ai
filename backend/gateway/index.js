import express from "express"
import dotenv from "dotenv"
import proxy from "express-http-proxy"
dotenv.config()
import cors from "cors"
import cookieParser from "cookie-parser"
import { getCurrentUser } from "./controllers/user.controller.js"
import protect from "./middleware/auth.middleware.js"
import { proxyWithHeader } from "./utils/proxyWithHeader.js"
import morgan from "morgan"
const port =process.env.PORT

const app=express()
app.set("trust proxy", 1)

const allowedOrigins = (process.env.FRONTEND_URL || "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

app.use(cors({
    origin: allowedOrigins.length > 0 ? allowedOrigins : true,
    credentials: true
}))
app.use(morgan("dev"))
app.use(cookieParser())

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" })
})

let lastWakeResult = null;
let lastWakeTime = 0;
let inFlightWakePromise = null;
const WAKE_COOLDOWN_MS = 20000;

app.get("/api/wake", async (req, res) => {
    try {
        const now = Date.now();
        if (lastWakeResult && (now - lastWakeTime < WAKE_COOLDOWN_MS)) {
            return res.status(200).json(lastWakeResult);
        }

        if (inFlightWakePromise) {
            const cachedResult = await inFlightWakePromise;
            return res.status(200).json(cachedResult);
        }

        inFlightWakePromise = (async () => {
            const targets = [
                { name: "auth", url: process.env.AUTH_SERVICE },
                { name: "chat", url: process.env.CHAT_SERVICE },
                { name: "agent", url: process.env.AGENT_SERVICE },
                { name: "billing", url: process.env.BILLING_SERVICE }
            ];

            const results = await Promise.allSettled(
                targets.map(async (t) => {
                    if (!t.url) {
                        return { name: t.name, status: "down" };
                    }
                    try {
                        await fetch(t.url, {
                            method: "GET",
                            signal: AbortSignal.timeout(65000)
                        });
                        return { name: t.name, status: "up" };
                    } catch {
                        return { name: t.name, status: "down" };
                    }
                })
            );

            const services = {
                auth: "down",
                chat: "down",
                agent: "down",
                billing: "down"
            };

            for (const r of results) {
                if (r.status === "fulfilled" && r.value) {
                    services[r.value.name] = r.value.status;
                }
            }

            const ready =
                services.auth === "up" &&
                services.chat === "up" &&
                services.agent === "up" &&
                services.billing === "up";

            const data = {
                ready,
                services
            };

            lastWakeResult = data;
            lastWakeTime = Date.now();
            return data;
        })();

        const responseData = await inFlightWakePromise;
        inFlightWakePromise = null;
        return res.status(200).json(responseData);
    } catch {
        inFlightWakePromise = null;
        return res.status(500).json({ ready: false, error: "Wake ping failed" });
    }
});

app.use("/api/auth", (req, res, next) => {
    const cleanPath = req.path.replace(/\/+$/, "")
    if (cleanPath === "/update-plan" || cleanPath === "/deduct-credits") {
        return res.status(404).json({ message: "Not found" })
    }
    if (cleanPath === "/login" || cleanPath === "/logout") {
        return next()
    }
    return res.status(404).json({ message: "Not found" })
}, proxy(process.env.AUTH_SERVICE))

app.use("/api/chat",protect,proxyWithHeader(process.env.CHAT_SERVICE))
app.use("/api/agent",protect,proxyWithHeader(process.env.AGENT_SERVICE))
app.use("/api/billing",protect,proxyWithHeader(process.env.BILLING_SERVICE))
app.get("/api/me",protect,getCurrentUser)
app.get("/",(req,res)=>{
    res.json({message:"hello from gateway v5"})
})

app.listen(port,()=>{
    const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();
    console.log("INTERNAL_API_KEY length:", INTERNAL_KEY.length)
    console.log(`gateway started at ${port}`)
})
