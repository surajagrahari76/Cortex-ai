import fs from "fs"
import officeParserPkg from "officeparser"
const { parseOfficeAsync } = officeParserPkg || officeParserPkg.default || {}

import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"
import { vectorStore } from "../config/vectorDb.js"
import { getModel } from "../config/llmModels.js"
import { HumanMessage, SystemMessage, AIMessage } from "@langchain/core/messages"
import { deductCredits } from "../utils/deductCredits.js"
import { checkAgentLimit } from "../config/agentLimit.js"
import redis from "../../../shared/redis/redis.js"
import { QdrantVectorStore } from "@langchain/qdrant"
import { embeddings } from "../config/embeddings.js"
import { getMemory } from "../config/memory.js"

const MAX_CONTEXT_TOKENS = 6000;
const estimateTokens = (text) => text ? Math.ceil(text.length / 4) : 0;

export const pptRag=async (state)=>{
   try {
    await checkAgentLimit(state.userId,"ppt")
    
    let store;
    let docs = [];

    if (state.file) {
      const parseFunc = officeParserPkg.parseOffice;
      if (!parseFunc) {
          throw new Error("Unable to parse office document. Missing parseOffice.");
      }
      
      let text = "";
      const result = await officeParserPkg.parseOffice(state.file.path);
      if (result) {
          if (typeof result.toText === 'function') {
              text = result.toText();
          } else {
              text = String(result);
          }
      }

      if (!text || text.trim() === "") {
          text = "No text extracted from the PPT document."
      }

      console.log(`Processing file: ${state.file.path}, Text length: ${text?.length || 0}`);
      if (!text || text.length < 50) {
          return {
              ...state,
              aiResponse: "Could not extract readable content from this file, please re-upload."
          };
      }

      const spilliter=new RecursiveCharacterTextSplitter({
        chunkSize:1000,
        chunkOverlap:200
      })

      docs=await spilliter.createDocuments([text])
      console.log(`Chunks created: ${docs.length}`);
      
      const collectionName=`ppt-${Date.now()}`;
      store=await vectorStore(docs,collectionName)

      await redis.set(`pptRag_collection_${state.conversationId}`, collectionName, 'EX', 86400);
    } else {
      const collectionName = await redis.get(`pptRag_collection_${state.conversationId}`);
      if (!collectionName) {
          return {
              ...state,
              aiResponse: "I don't have the document content for this conversation anymore, please re-upload the file."
          };
      }
      store = await QdrantVectorStore.fromExistingCollection(embeddings, {
          url: process.env.QDRANT_URL,
          collectionName
      });
    }

    let context = "";
    const isBroad = /top|important|all|summarize|list/i.test(state.prompt);
    const sourceDocs = (isBroad && docs.length > 0) ? docs : await store.similaritySearch(state.prompt, 10);
    
    let currentTokens = 0;
    const contextParts = [];
    for (const d of sourceDocs) {
        const chunkTokens = estimateTokens(d.pageContent);
        if (currentTokens + chunkTokens > MAX_CONTEXT_TOKENS) {
            break;
        }
        contextParts.push(d.pageContent);
        currentTokens += chunkTokens;
    }
    context = contextParts.join("\n\n");
      
    const llm=await getModel("ppt-rag", state.selectedModel)

    const memory = await getMemory(state.conversationId);
    const historyMessages = memory.map(m => m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content));

    const messages=[
      new SystemMessage(`You are CortexAI PPT Assistant.

Answer strictly and only using the provided context. Never use outside/pre-trained knowledge. Never generate placeholder text like [Concept] or [Topic]. If the context is insufficient, say so explicitly instead of inventing generic content.

CLARIFICATION RULE:
If the user's question is ambiguous (e.g. "give me its answer", "explain the second one") without specifying exactly what they are referring to, you MUST ask them to clarify (e.g., "Which question would you like a detailed answer for?") instead of guessing or generating a generic template.

LENGTH ADAPTATION RULES:
1. If requested "in short" or "briefly" (or similar), provide a very concise, few-lines answer.
2. If requested "in detail", "in long", or "elaborate", provide a thorough, multi-paragraph answer with all relevant sub-points from the context.
3. If marks are specified (e.g., "10 marks", "4 marks"):
   - 2-4 marks: Brief, key-points only.
   - 5-7 marks: Moderately detailed with brief explanations.
   - 8-10+ marks: Comprehensive, well-structured, in-depth explanation mirroring a long essay-style exam answer, using only the provided context.
`),
      ...historyMessages,
      new HumanMessage(`
    Context:${context}
     Question:${state.prompt}
    `)
    ]

    const response=await llm.invoke(messages)
    await deductCredits(state.userId,"ppt")
    console.log(response)
    return {
      ...state,
      aiResponse:response.content
    }

   } catch (error) {
    console.log(error)
         return {
            ...state,
            aiResponse:error?.data?.message || error?.message || "failed to analyze ppt"
        }
   }finally{
       if (state.file && state.file.path) {
         try {
             fs.unlinkSync(state.file.path)
         } catch (e) {
             console.error("Could not unlink file", e)
         }
       }
   }
}
