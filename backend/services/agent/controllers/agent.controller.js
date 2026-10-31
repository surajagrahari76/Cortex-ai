import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage, popLastAssistantMessage } from "../config/memory.js"
import redis from "../../../shared/redis/redis.js"

export const agent = async (req, res, next) => {
    try {
        const { prompt, conversationId, agent: agentType, isRegenerate, isEdit, keepCount, model } = req.body
        const file = req.file
        const userId = req.headers["x-user-id"]

        if (!userId) {
            return res.status(401).json({ message: "Unauthorized" })
        }

        const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();
        const chatHeaders = {
            "x-user-id": userId,
            "x-internal-key": INTERNAL_KEY
        }

        // Verify conversation belongs to x-user-id before reading, updating, deleting or saving messages
        if (conversationId) {
            try {
                await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`, {
                    headers: chatHeaders
                })
            } catch (chatError) {
                if (chatError.response && (chatError.response.status === 403 || chatError.response.status === 404)) {
                    return res.status(chatError.response.status).json(chatError.response.data)
                }
                throw chatError
            }
        }

        // Check user credits BEFORE running graph
        const COST = {
            chat: 1,
            search: 5,
            coding: 10,
            pdf: 10,
            ppt: 10,
            vision: 10
        }
        const requiredCredits = COST[agentType] || 1

        let userCredits = null
        const sessionId = await redis.get(`user-session-${userId}`)
        if (sessionId) {
            const sessionData = await redis.get(`session-${sessionId}`)
            if (sessionData) {
                try {
                    const parsed = JSON.parse(sessionData)
                    if (parsed.credits !== undefined) {
                        userCredits = parsed.credits
                    }
                } catch (e) {}
            }
        }
        if (userCredits === null && req.headers["x-user-credits"] !== undefined) {
            userCredits = Number(req.headers["x-user-credits"])
        }

        if (userCredits !== null && userCredits < requiredCredits) {
            return res.status(400).json({ message: "Not enough credits." })
        }

        if (isEdit) {
            await axios.post(`${process.env.CHAT_SERVICE}/truncate-messages`, { conversationId, keepCount }, { headers: chatHeaders })
            const chatRes = await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`, { headers: chatHeaders })
            const recent = chatRes.data.slice(-20).map(m => ({ role: m.role, content: m.content }))
            await redis.set(`messages-${conversationId}`, JSON.stringify(recent))

            await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
                conversationId, role: "user", content: prompt
            }, { headers: chatHeaders })
        } else if (isRegenerate) {
            await popLastAssistantMessage(conversationId)
            await axios.post(`${process.env.CHAT_SERVICE}/delete-last-assistant-message`, { conversationId }, { headers: chatHeaders })
        } else {
            await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
                conversationId, role: "user", content: prompt
            }, { headers: chatHeaders })
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        const stream = await graph.streamEvents({
            prompt, conversationId, agent: agentType, userId, file, selectedModel: model
        }, { version: "v2" });

        let fullResponse = "";
        let images = [];
        let artifacts = [];

        for await (const event of stream) {
            if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk?.content;
                if (chunk && typeof chunk === "string" && agentType !== "pdf" && agentType !== "ppt") {
                    fullResponse += chunk;
                    res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
                }
            } else if (event.event === "on_chain_end") {
                const output = event.data.output;
                if (output) {
                    if (output.aiResponse && !fullResponse) {
                        fullResponse = output.aiResponse;
                        res.write(`data: ${JSON.stringify({ type: "chunk", content: fullResponse })}\n\n`);
                    }
                    if (output.images) images = output.images;
                    if (output.artifacts) artifacts = output.artifacts;
                }
            }
        }

        if (!isRegenerate) {
            await addMessage(conversationId, "user", prompt)
        }
        await addMessage(conversationId, "assistant", fullResponse)
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`, {
            conversationId, role: "assistant", content: fullResponse, images: images, artifacts: artifacts
        }, { headers: chatHeaders })

        res.write(`data: ${JSON.stringify({ type: "final", data: { answer: fullResponse, images, artifacts } })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();

    } catch (error) {
        console.error("agent.controller caught error:", error);
        if (res.headersSent) {
            res.write(`data: ${JSON.stringify({ type: "error", message: error.message || "Request failed" })}\n\n`);
            return res.end();
        }
        if (error.message === "Not enough credits." || error.status === 400) {
            return res.status(400).json({ message: "Not enough credits." });
        }
        next(error)
    }
}