import Conversation from "../models/coversation.model.js"
import Message from "../models/message.model.js"

export const createConversation = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log("userId", userId)
        const conversation = await Conversation.create({
            userId: userId
        })

        return res.status(200).json(conversation)
    } catch (error) {
        return res.status(500).json({ message: `create conversation error ${error}` })
    }
}

export const getConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"]
        console.log("userId", userId)
        const conversations = await Conversation.find({
            userId: userId
        }).sort({ updatedAt: -1 })

        return res.status(200).json(conversations)
    } catch (error) {
        return res.status(500).json({ message: `get conversation error ${error}` })
    }
}

export const updateConversation = async (req, res) => {
    try {
        const { id, title } = req.body
        const conversation = await Conversation.findByIdAndUpdate(id, {
            title
        })

        return res.status(200).json(conversation)
    } catch (error) {
        return res.status(500).json({ message: `update conversation error ${error}` })
    }
}

export const saveMessage = async (req, res) => {
    try {
        const { conversationId, role, content, images, artifacts } = req.body
        const message = await Message.create({
            conversationId,
            content,
            role,
            images,
            artifacts
        })
        return res.status(200).json(message)
    } catch (error) {
        return res.status(500).json({ message: `save message error ${error}` })
    }
}

export const getMessages = async (req, res) => {
    try {

        const messages = await Message.find({
            conversationId: req.params.conversationId
        })
        return res.status(200).json(messages)
    } catch (error) {
        return res.status(500).json({ message: `get messages error ${error}` })
    }
}

export const deleteLastAssistantMessage = async (req, res) => {
    try {
        const { conversationId } = req.body
        await Message.findOneAndDelete(
            { conversationId, role: "assistant" },
            { sort: { createdAt: -1 } }
        )
        return res.status(200).json({ message: "Deleted" })
    } catch (error) {
        return res.status(500).json({ message: `delete message error ${error}` })
    }
}

export const truncateMessages = async (req, res) => {
    try {
        const { conversationId, keepCount } = req.body;
        const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
        const messagesToDelete = messages.slice(keepCount);
        const idsToDelete = messagesToDelete.map(m => m._id);

        await Message.deleteMany({ _id: { $in: idsToDelete } });
        return res.status(200).json({ message: "Messages truncated" });
    } catch (error) {
        return res.status(500).json({ message: `Truncate messages error ${error}` });
    }
}

export const searchConversations = async (req, res) => {
    try {
        const userId = req.headers["x-user-id"];
        const { q } = req.query;

        if (!q) {
            return res.status(200).json([]);
        }

        const userConvs = await Conversation.find({ userId }).select('_id');
        const userConvIds = userConvs.map(c => c._id);

        const convMatches = await Conversation.find({
            userId,
            title: { $regex: q, $options: 'i' }
        }).select('_id');
        const matchedConvIds = convMatches.map(c => c._id);

        const messageMatches = await Message.find({
            conversationId: { $in: userConvIds },
            content: { $regex: q, $options: 'i' }
        }).select('conversationId');

        const messageConvIds = messageMatches.map(m => m.conversationId);

        const combinedIds = [...new Set([...matchedConvIds.map(id => id.toString()), ...messageConvIds.map(id => id.toString())])];

        const finalConversations = await Conversation.find({
            _id: { $in: combinedIds }
        }).sort({ updatedAt: -1 });

        return res.status(200).json(finalConversations);
    } catch (error) {
        return res.status(500).json({ message: `Search conversation error ${error}` });
    }
}

