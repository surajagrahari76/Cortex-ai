import { createSlice } from "@reduxjs/toolkit";

const messageSlice=createSlice({
    name:"message",
    initialState:{
      messages:[],
      artifacts:[],
      isLoading:false
      
    },
    reducers:{
       setMessages:(state,action)=>{
        state.messages=action.payload
       },
        addMessage:(state,action)=>{
        state.messages.push(action.payload)
       },
       setArtifacts:(state,action)=>{
        state.artifacts=action.payload
       },
       setIsLoading:(state,action)=>{
        state.isLoading=action.payload
       },
       removeMessageAtIndex:(state,action)=>{
        state.messages.splice(action.payload, 1)
       },
       sliceMessages:(state,action)=>{
        state.messages = state.messages.slice(0, action.payload)
       },
       appendMessageChunk:(state,action)=>{
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
            lastMessage.content += action.payload;
        }
       },
       updateLastMessage:(state,action)=>{
        const lastMessage = state.messages[state.messages.length - 1];
        if (lastMessage && lastMessage.role === "assistant") {
            Object.assign(lastMessage, action.payload);
        }
       }

    }
   
})

export const {setMessages,addMessage,setArtifacts,setIsLoading,removeMessageAtIndex,sliceMessages,appendMessageChunk,updateLastMessage}=messageSlice.actions 
export default messageSlice.reducer

