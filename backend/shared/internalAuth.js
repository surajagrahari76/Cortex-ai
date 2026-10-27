export const verifyInternalKey = (req, res, next) => {
    const internalKey = req.headers["x-internal-key"];
    const expectedKey = process.env.INTERNAL_API_KEY;

    if (!expectedKey || !internalKey || internalKey !== expectedKey) {
        return res.status(401).json({ message: "Unauthorized: Invalid or missing internal API key" });
    }
    next();
};

export default verifyInternalKey;
