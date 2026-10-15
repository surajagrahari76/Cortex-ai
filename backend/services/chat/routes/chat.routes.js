import express from "express"
import { createConversation, getConversations, getMessages, saveMessage, updateConversation, deleteLastAssistantMessage, truncateMessages, searchConversations } from "../controllers/chat.controller.js"

const router = express.Router()

router.get("/create-conversation", createConversation)
router.get("/get-conversations", getConversations)
router.get("/search-conversations", searchConversations)
router.post("/update-conversation", updateConversation)
router.post("/save-message", saveMessage)
router.post("/delete-last-assistant-message", deleteLastAssistantMessage)
router.post("/truncate-messages", truncateMessages)
router.get("/get-messages/:conversationId", getMessages)
export default router