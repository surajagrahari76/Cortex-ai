import axios from "axios"

export const getMessages = async (conversationId, userId) => {
    try {
        const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();
        const headers = {
            "x-internal-key": INTERNAL_KEY
        }
        if (userId) {
            headers["x-user-id"] = userId
        }
        const { data } = await axios.get(`${process.env.CHAT_SERVICE}/get-messages/${conversationId}`, {
            headers
        })
        return data
    } catch (error) {
        console.error("getMessages error:", error?.response?.data || error.message)
        return null
    }
}