import api from "../../utils/axios"

export const searchConversations = async (q) => {
    try {
        const { data } = await api.get(`/api/chat/search-conversations?q=${encodeURIComponent(q)}`)
        return data
    } catch (error) {
        console.log(error)
        return []
    }
}
