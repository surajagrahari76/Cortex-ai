export const verifyInternalKey = (req, res, next) => {
    const internalKey = req.headers["x-internal-key"];
    const INTERNAL_KEY = (process.env.INTERNAL_API_KEY || "").replace(/[^\x21-\x7E]/g, "").trim();

    if (!INTERNAL_KEY || !internalKey || internalKey !== INTERNAL_KEY) {
        return res.status(401).json({ message: "Unauthorized: Invalid or missing internal API key" });
    }
    next();
};

export default verifyInternalKey;
