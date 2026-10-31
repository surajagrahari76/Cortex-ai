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
