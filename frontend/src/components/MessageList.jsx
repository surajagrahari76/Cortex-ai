import React, { useEffect, useRef } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import MessageBubble from './MessageBubble'
import LoadingAnimation from './LoadingAnimation'
import { motion } from 'motion/react'
import sendMessage from '../features/sendMessage'
import { removeMessageAtIndex, sliceMessages, setIsLoading, setArtifacts, addMessage, appendMessageChunk, updateLastMessage } from '../redux/messageSlice'

function MessageList() {
    const {selectedConversation}=useSelector(state=>state.conversation)
    const {messages,isLoading}=useSelector(state=>state.message)
    const bottemRef=useRef(null)
    const dispatch = useDispatch()
   
   useEffect(()=>{
       requestAnimationFrame(()=>{
        bottemRef?.current?.scrollIntoView({
          behavior:"smooth",
          block:"end"
        })
       })
   },[messages?.length,isLoading])

   const handleRegenerate = async (index) => {
     if (isLoading) return;
     const userMsg = messages[index - 1];
     if (!userMsg || userMsg.role !== "user") return;

     dispatch(removeMessageAtIndex(index));
     dispatch(setIsLoading(true));

     const formData = new FormData();
     formData.append("prompt", userMsg.content);
     formData.append("conversationId", selectedConversation?._id);
     formData.append("agent", "auto"); 
     formData.append("isRegenerate", "true");

     dispatch(addMessage({ role: "assistant", content: "", images: [] }));
     const data = await sendMessage(formData, (chunk) => {
       dispatch(appendMessageChunk(chunk));
     });
     dispatch(setIsLoading(false));
     if (data) {
       dispatch(setArtifacts(data.artifacts || []));
       dispatch(updateLastMessage({ images: data.images }));
     }
   }

   const handleEdit = async (index, newContent) => {
     if (isLoading) return;
     dispatch(sliceMessages(index));
     dispatch(setIsLoading(true));

     const formData = new FormData();
     formData.append("prompt", newContent);
     formData.append("conversationId", selectedConversation?._id);
     formData.append("agent", "auto"); 
     formData.append("isEdit", "true");
     formData.append("keepCount", String(index));

     dispatch(addMessage({ role: "user", content: newContent }));
     dispatch(addMessage({ role: "assistant", content: "", images: [] }));
     const data = await sendMessage(formData, (chunk) => {
       dispatch(appendMessageChunk(chunk));
     });
     dispatch(setIsLoading(false));
     if (data) {
       dispatch(setArtifacts(data.artifacts || []));
       dispatch(updateLastMessage({ images: data.images }));
     }
   }

  return (
    <div className='flex-1 overflow-y-auto px-6 py-6 space-y-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
      
      {messages.length==0 || !selectedConversation ?(
        <motion.div 
          initial={{opacity: 0, y: 20}} 
          animate={{opacity: 1, y: 0}} 
          transition={{duration: 0.5}} 
          className="h-full flex flex-col items-center justify-center gap-6 text-center"
        >
           <div className='flex flex-col gap-2'>
               <div className='w-16 h-16 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center mx-auto mb-2 shadow-[0_0_30px_rgba(99,102,241,0.3)]'>
                 <span className='text-2xl font-bold text-white'>C</span>
               </div>
               <h1 className='text-[24px] font-semibold text-slate-100 tracking-tight'>CortexAI</h1>
               <p className='text-[16px] font-medium text-slate-400 tracking-tight'>How can I help you today?</p>
               <p className='text-[14px] text-slate-500 max-w-[280px] leading-relaxed mx-auto'>Ask me anything — code, ideas, explanations, or just a quick question.</p>
           </div>
           <div className='flex flex-wrap justify-center gap-3 mt-4 max-w-[500px]'>
            {["Write a Netflix clone", "Explain Redis", "Build a dashboard"].map((s, i)=>(
              <motion.button 
                key={i}
                initial={{opacity: 0, scale: 0.9}}
                animate={{opacity: 1, scale: 1}}
                transition={{duration: 0.3, delay: i * 0.1 + 0.2}}
                whileHover={{scale: 1.05, backgroundColor: "rgba(255,255,255,0.1)"}}
                whileTap={{scale: 0.95}}
                className='text-[13px] font-medium text-slate-300 bg-white/[0.03] border border-white/[0.08] px-4 py-2 rounded-xl hover:text-white hover:border-white/20 transition-all duration-200 cursor-pointer shadow-sm'
              >
                {s}
              </motion.button>
            ))}
           </div>
        </motion.div>
      ):
      <div className='space-y-5'>

        {messages?.map((msg,i)=>(
            <div key={i}>
               <MessageBubble 
                 role={msg?.role} 
                 content={msg?.content} 
                 images={msg.images || []} 
                 onRegenerate={msg?.role === 'assistant' ? () => handleRegenerate(i) : undefined}
                 onEditSubmit={msg?.role === 'user' ? (newContent) => handleEdit(i, newContent) : undefined}
               /> 
            </div>
        ))}

        {isLoading && <LoadingAnimation/>}

        
      </div>
      }
      <div ref={bottemRef}/>
    </div>
  )
}

export default MessageList
