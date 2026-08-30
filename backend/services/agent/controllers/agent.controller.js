import axios from "axios"
import { graph } from "../graph/graph.js"
import { addMessage, popLastAssistantMessage } from "../config/memory.js"
import redis from "../../../shared/redis/redis.js"


export const agent=async (req,res,next) => {
    try {
        const {prompt,conversationId,agent,isRegenerate,isEdit,keepCount,model}=req.body
        const file=req.file
        console.log("file",file)
        const userId=req.headers["x-user-id"]
        
        if (isEdit) {
            await axios.post(`${process.env.CHAT_SERVICE}/truncate-messages`, { conversationId, keepCount })
            const chatRes = await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`)
            const recent = chatRes.data.slice(-20).map(m => ({ role: m.role, content: m.content }))
            await redis.set(`messages-${conversationId}`, JSON.stringify(recent))
            
            await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
                conversationId,role:"user",content:prompt
            })
        } else if (isRegenerate) {
            await popLastAssistantMessage(conversationId)
            await axios.post(`${process.env.CHAT_SERVICE}/delete-last-assistant-message`, { conversationId })
        } else {
            await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
                conversationId,role:"user",content:prompt
            })
        }

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        console.log("agent.controller starting graph.streamEvents with selectedModel:", model);
        
        const stream = await graph.streamEvents({
            prompt,conversationId,agent,userId,file,selectedModel: model
        }, { version: "v2" });

        let fullResponse = "";
        let images = [];
        let artifacts = [];

        for await (const event of stream) {
            if (event.event === "on_chat_model_stream") {
                const chunk = event.data?.chunk?.content;
                if (chunk && typeof chunk === "string") {
                    fullResponse += chunk;
                    res.write(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`);
                }
            } else if (event.event === "on_chain_end" && event.name === "LangGraph") {
                const output = event.data.output;
                if (output) {
                    if (output.aiResponse && !fullResponse) {
                        fullResponse = output.aiResponse;
                        res.write(`data: ${JSON.stringify({ type: "chunk", content: fullResponse })}\n\n`);
                    }
                    images = output.images || [];
                    artifacts = output.artifacts || [];
                }
            }
        }

        console.log("agent.controller graph.streamEvents finished.");
        
        if (!isRegenerate) {
           await addMessage(conversationId,"user",prompt)
        }
        await addMessage(conversationId,"assistant",fullResponse)
        await axios.post(`${process.env.CHAT_SERVICE}/save-message`,{
            conversationId,role:"assistant",content:fullResponse,images:images,artifacts:artifacts
        })
        console.log("agent.controller saved message. Returning final data to frontend.");
        
        res.write(`data: ${JSON.stringify({ type: "final", data: { answer: fullResponse, images, artifacts } })}\n\n`);
        res.write("data: [DONE]\n\n");
        res.end();
       
    } catch (error) {
       console.log("agent.controller caught error:", error);
       next(error)
    }
}