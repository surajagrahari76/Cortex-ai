import redis from "../../shared/redis/redis.js"

const protect=async (req,res,next) => {
    try {
        const sessionId=req.cookies?.session
        console.log("[AUTH_MIDDLEWARE] sessionId from cookie:", sessionId);

        if(!sessionId){
            console.log("[AUTH_MIDDLEWARE] Failed: No sessionId cookie");
            return res.status(400).json({message:"unauthorized"})
        }
        const session=await redis.get(`session-${sessionId}`)
        console.log("[AUTH_MIDDLEWARE] Redis session result:", session);

        if(!session){
            console.log("[AUTH_MIDDLEWARE] Failed: Session expired or not found in Redis");
            return res.status(400).json({message:"session expired"})
        }
        req.user=JSON.parse(session)
        next()
       
    } catch (error) {
        console.log("[AUTH_MIDDLEWARE] Error:", error);
        return res.status(500).json({message:`protect error ${error}`})
    }
}

export default protect