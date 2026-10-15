import fs from "fs"
import { PDFParse } from "pdf-parse"
import { parseOffice } from "officeparser"
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

export const pdfRag = async (state) => {
  try {
    await checkAgentLimit(state.userId, "pdf")

    let store;
    let docs = [];

    if (state.file) {
      let text = "";
      if (state.file.mimetype === "application/pdf") {
        const buffer = fs.readFileSync(state.file.path);
        const pdf = new PDFParse({ data: buffer });
        const result = await pdf.getText();
        text = result.text;
      } else {
        text = await parseOffice(state.file.path);
      }

      if (text) {
        text = text.replace(/\0/g, '').trim();
      }

      console.log(`Processing file: ${state.file.path}, Text length: ${text?.length || 0}`);
      if (!text || text.length < 50) {
        return {
          ...state,
          aiResponse: "Could not extract readable content from this file, please re-upload."
        };
      }

      const spilliter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 200
      })

      docs = await spilliter.createDocuments([text])
      docs = docs.filter(doc => doc.pageContent && doc.pageContent.trim().length > 0)
      console.log(`Chunks created: ${docs.length}`);

      const collectionName = `pdf-${Date.now()}`;
      store = await vectorStore(docs, collectionName)

      await redis.set(`pdfRag_collection_${state.conversationId}`, collectionName, 'EX', 86400);
    } else {
      const collectionName = await redis.get(`pdfRag_collection_${state.conversationId}`);
      if (!collectionName) {
        return {
          ...state,
          aiResponse: "I don't have the document content for this conversation anymore, please re-upload the file."
        };
      }
      store = await QdrantVectorStore.fromExistingCollection(embeddings, {
        url: process.env.QDRANT_URL,
        apiKey: process.env.QDRANT_API_KEY,
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

    const llm = await getModel("pdf-rag", state.selectedModel)

    const memory = await getMemory(state.conversationId);
    const historyMessages = memory.map(m => m.role === 'user' ? new HumanMessage(m.content) : new AIMessage(m.content));

    const messages = [
      new SystemMessage(`You are CortexAI PDF Assistant.

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

    const response = await llm.invoke(messages)
    await deductCredits(state.userId, "pdf")
    console.log(response)
    return {
      ...state,
      aiResponse: response.content
    }

  } catch (error) {
    console.error("PDF/PPT analysis failed:", error)
    return {
      ...state,
      aiResponse: error?.data?.message || error?.message || "failed to analyze pdf"
    }
  } finally {
    if (state.file && state.file.path) {
      try {
        fs.unlinkSync(state.file.path)
      } catch (e) {
        console.error("Could not unlink file", e)
      }
    }
  }
}