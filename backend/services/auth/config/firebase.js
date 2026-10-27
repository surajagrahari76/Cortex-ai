import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { cert, initializeApp, getApps } from "firebase-admin/app";
import dotenv from "dotenv";

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
        serviceAccount = typeof process.env.FIREBASE_SERVICE_ACCOUNT === "string"
            ? JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)
            : process.env.FIREBASE_SERVICE_ACCOUNT;
    } catch (err) {
        console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT JSON:", err);
    }
}

if (!serviceAccount) {
    const keyPath = path.resolve(__dirname, "../serviceAccountKey.json");
    if (fs.existsSync(keyPath)) {
        try {
            serviceAccount = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
        } catch (err) {
            console.error("Failed to parse serviceAccountKey.json:", err);
        }
    }
}

export const app = getApps().length > 0
    ? getApps()[0]
    : initializeApp(serviceAccount ? { credential: cert(serviceAccount) } : {});