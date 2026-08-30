import dotenv from "dotenv"
dotenv.config()
import { ChatGroq } from "@langchain/groq"
import { ChatGoogleGenerativeAI } from "@langchain/google-genai"
import { ChatOpenRouter } from "@langchain/openrouter";
const groq=new ChatGroq({
    model:"openai/gpt-oss-120b"
})

const gemini=new ChatGoogleGenerativeAI({
    model:"gemini-3.6-flash"
})

const openrouter=new ChatOpenRouter({
    model:"deepseek/deepseek-chat",
    temperature:0,
    maxTokens:2500
})


export const getModel=async (agent, selectedModel)=>{
    if (selectedModel) {
        if (selectedModel === "GPT") return groq;
        if (selectedModel === "Gemini") return gemini;
        if (selectedModel === "Deepseek") return openrouter;
    }

    switch (agent) {
        case "chat":
            return groq;
        case "search" :    
           return groq;
        case "coding": 
           return openrouter; 
        case "imageAnalyzer": 
           return gemini;   
        case "pdf-rag":
           return openrouter;
        case "ppt-rag":
           return openrouter;
    
        default:
            return groq;
    }
}

