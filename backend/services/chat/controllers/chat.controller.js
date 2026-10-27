import Conversation from "../models/coversation.model.js"
import Message from "../models/message.model.js"

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Missing user id" })
        }
        const conversation = await Conversation.create({
            userId: userId
        })

        return res.status(200).json(conversation)
    } catch (error) {
        console.error("create conversation error:", error)
        return res.status(500).json({ message: `create conversation error ${error}` })
    }
}

export const getConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        if (!userId) {
            return res.status(401).json({ message: "Unauthorized: Missing user id" })
        }
        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 })

        return res.status(200).json(conversations)
    } catch (error) {
        console.error("get conversation error:", error)
        return res.status(500).json({ message: `get conversation error ${error}` })
    }
}

export const updateConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { id, title } = req.body
        const conversation = await Conversation.findById(id)
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }
        if (conversation.userId !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        conversation.title = title
        await conversation.save()

        return res.status(200).json(conversation)
    } catch (error) {
        console.error("update conversation error:", error)
        return res.status(500).json({ message: `update conversation error ${error}` })
    }
}

export const saveMessage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { conversationId, role, content, images, artifacts } = req.body
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }
        if (conversation.userId !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        const message = await Message.create({
            conversationId,
            content,
            role,
            images,
            artifacts
        })
        return res.status(200).json(message)
    } catch (error) {
        console.error("save message error:", error)
        return res.status(500).json({ message: `save message error ${error}` })
    }
}

export const getMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const conversation = await Conversation.findById(req.params.conversationId)
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }
        if (conversation.userId !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        const messages = await Message.find({
            conversationId: req.params.conversationId
        })
        return res.status(200).json(messages)
    } catch (error) {
        console.error("get messages error:", error)
        return res.status(500).json({ message: `get messages error ${error}` })
    }
}

export const deleteLastAssistantMessage = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { conversationId } = req.body
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }
        if (conversation.userId !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        await Message.findOneAndDelete(
            { conversationId, role: "assistant" },
            { sort: { createdAt: -1 } }
        )
        return res.status(200).json({ message: "Deleted" })
    } catch (error) {
        console.error("delete message error:", error)
        return res.status(500).json({ message: `delete message error ${error}` })
    }
}

export const truncateMessages = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        const { conversationId, keepCount } = req.body
        const conversation = await Conversation.findById(conversationId)
        if (!conversation) {
            return res.status(404).json({ message: "Conversation not found" })
        }
        if (conversation.userId !== userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 })
        const messagesToDelete = messages.slice(keepCount)
        const idsToDelete = messagesToDelete.map(m => m._id)

        await Message.deleteMany({ _id: { $in: idsToDelete } })
        return res.status(200).json({ message: "Messages truncated" })
    } catch (error) {
        console.error("truncate messages error:", error)
        return res.status(500).json({ message: `Truncate messages error ${error}` })
    }
}

export const searchConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        if (!userId) {
            return res.status(403).json({ message: "Forbidden" })
        }

        let { q } = req.query

        if (!q || typeof q !== "string") {
            return res.status(200).json([])
        }

        const query = q.slice(0, 100).trim()
        if (!query) {
            return res.status(200).json([])
        }

        const escapedQ = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

        const userConvs = await Conversation.find({ userId }).select('_id')
        const userConvIds = userConvs.map(c => c._id)

        const convMatches = await Conversation.find({
            userId,
            title: { $regex: escapedQ, $options: 'i' }
        }).select('_id')
        const matchedConvIds = convMatches.map(c => c._id)

        const messageMatches = await Message.find({
            conversationId: { $in: userConvIds },
            content: { $regex: escapedQ, $options: 'i' }
        }).select('conversationId')

        const messageConvIds = messageMatches.map(m => m.conversationId)

        const combinedIds = [...new Set([...matchedConvIds.map(id => id.toString()), ...messageConvIds.map(id => id.toString())])]

        const finalConversations = await Conversation.find({
            _id: { $in: combinedIds },
            userId
        }).sort({ updatedAt: -1 })

        return res.status(200).json(finalConversations)
    } catch (error) {
        console.error("search conversation error:", error)
        return res.status(500).json({ message: `Search conversation error ${error}` })
    }
}
