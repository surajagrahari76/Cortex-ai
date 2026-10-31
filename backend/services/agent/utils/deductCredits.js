import axios from "axios"

export const deductCredits = async (userId, agent) => {
    try {
        const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();
        const { data } = await axios.post(
            `${process.env.AUTH_SERVICE}/deduct-credits`,
            { userId, agent },
            {
                headers: {
                    "x-internal-key": INTERNAL_KEY
                }
            }
        )
        return data
    } catch (error) {
        if (error.response?.data?.message === "Not enough credits." || error.response?.status === 400) {
            const err = new Error(error.response?.data?.message || "Not enough credits.")
            err.status = 400
            err.data = error.response?.data || { message: "Not enough credits." }
            throw err
        }
        console.error("deductCredits error:", error?.response?.data || error.message)
        throw error
    }
}