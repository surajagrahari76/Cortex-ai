import { checkAgentLimit } from "../config/agentLimit.js"
import { getModel } from "../config/llmModels.js"
import { deductCredits } from "../utils/deductCredits.js"

export const codingAgent=async (state) => {
console.log("codingAgent started, selectedModel:", state.selectedModel);
try {
   await checkAgentLimit(state.userId,"coding")
   console.log("checkAgentLimit passed");
   const intentLlm=await getModel("intent", state.selectedModel)
   const llm=await getModel("coding", state.selectedModel)
   console.log("models fetched. intentLlm:", !!intentLlm, "llm:", !!llm);
   const intentRes=await intentLlm.invoke(`
    You are an intent classifier.

Return ONLY one of these values.

CODE_GENERATION
CODE_REVIEW
CODE_EXPLANATION
DEBUGGING
OPTIMIZATION
CONVERSION
DOCUMENTATION

User Request:
${state.prompt}
    `)
    const intent=intentRes.content.trim()
    console.log("intentRes received. Intent:", intent);
    if(intent=="CODE_GENERATION"){
        console.log("Entering CODE_GENERATION block");
        const prompt=`
        You are CortexAI Coding Agent.

Determine if the user is asking for a simple code snippet or a full web project.

1. SIMPLE CODE (Algorithms, scripts, functions, e.g. "factorial in cpp", "binary search in python"):
- Return ONLY one relevant file (e.g. "factorial.cpp", "solution.py").
- DO NOT build an HTML/CSS/JS project.

2. FULL WEBPAGE PROJECT (e.g. "website", "landing page", "todo app UI"):
- Build a full project.
- Default stack: HTML, CSS, JavaScript.
- Use React/Next.js/Vue ONLY if explicitly requested.
- Include Responsive design, Modern UI, CSS Variables, Flexbox/Grid, and Smooth Scroll.
- Always use real Unsplash images. Never use placeholders.

3. AMBIGUOUS REQUESTS:
- Default to returning a simple code snippet (one file).

Return ONLY valid JSON using this flexible Schema:

{
  "files":[
    {
      "name":"<appropriate_filename_with_extension>",
      "content":"<code_content>"
    }
  ]
}

Examples:
- "give me code of factorial in cpp" -> [{"name": "factorial.cpp", "content": "..."}]
- "give me code of binary search in python" -> [{"name": "binary_search.py", "content": "..."}]
- "build a landing page for a bakery" -> [{"name": "index.html", "content": "..."}, {"name": "style.css", "content": "..."}, {"name": "script.js", "content": "..."}]
- "create a todo app UI" -> [{"name": "index.html", "content": "..."}, {"name": "style.css", "content": "..."}, {"name": "script.js", "content": "..."}]

Rules:

- You MUST respond EXCLUSIVELY with a single, valid JSON object.
- Output must start with {
- Output must end with }
- No markdown formatting (do NOT use \`\`\`json)
- No conversational text, apologies, or explanation
- No extra text
- Never mention intent

User Request:
${state.prompt}
        ` 
        const res=await llm.invoke(prompt)
        console.log(res)
        
        let data = null
        let rawText = res.content
        
        try {
            data = JSON.parse(rawText)
        } catch (e) {
            const jsonMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
            if (jsonMatch) {
                try {
                    data = JSON.parse(jsonMatch[1]);
                } catch (e2) {}
            }
        }
        
        console.log("deducting credits for CODE_GENERATION...");
        await deductCredits(state.userId,"coding")
        console.log("credits deducted.");
        
        if (data && data.files) {
            return {
                ...state,
                aiResponse:"Code Generated Successfully.",
                artifacts:[
                    {
                        id:Date.now(),
                        type:"Project",
                        files:data.files || [],
                        title:state.prompt
                    }
                ]
            }
        } else {
            return {
                ...state,
                aiResponse: rawText,
                artifacts: []
            }
        }
    }

    console.log("Entering fallback (not CODE_GENERATION), intent was:", intent);
    const res=await llm.invoke(`
        The user's request is:

${intent}

Return Markdown only.

Never generate project files.

Use headings like:

# Overview

## Explanation

## Problems

## Improvements

## Best Practices

## Optimized Code (if needed)

User Request:

${state.prompt}
        `)

   const data=res.content   
   console.log("fallback res received.");
   await deductCredits(state.userId,"coding")
   console.log("fallback credits deducted. Returning result.");
   
   return {
    ...state,
    aiResponse:data,
    artifacts:[]
   }  
} catch (error) {
   console.log("codingAgent caught error:", error)
         return {
            ...state,
            aiResponse:error?.message || error?.data?.message || "failed to generate code",
            artifacts:[]
        }
}
  
}