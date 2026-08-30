import redis from "../../../shared/redis/redis.js"
import { getMessages } from "../utils/getMessages.js"
export const getMemory=async (conversationId)=>{
    const key=`messages-${conversationId}`
    const cached=await redis.get(key)
    if(cached){
        return JSON.parse(cached)
    }
    
    const messages=await getMessages(conversationId)
    await redis.set(key,JSON.stringify(messages),"EX",24*60*60)
    
    return messages
}

export const addMessage=async (conversationId,role,content)=>{
     const key=`messages-${conversationId}`
     const rawMessages=await redis.get(key)
     const messages=rawMessages?JSON.parse(rawMessages):[]
     messages.push({
        role,content
     })

     if(messages.length>20){
        messages.shift()
     }

     await redis.set(key,JSON.stringify(messages))
}

export const popLastAssistantMessage=async (conversationId)=>{
     const key=`messages-${conversationId}`
     const rawMessages=await redis.get(key)
     if(rawMessages){
        const messages=JSON.parse(rawMessages)
        if(messages.length > 0 && messages[messages.length - 1].role === "assistant"){
           messages.pop()
           await redis.set(key,JSON.stringify(messages))
        }
     }
}


