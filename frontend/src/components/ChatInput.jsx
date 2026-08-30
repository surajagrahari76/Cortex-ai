import { Code2, FileText, Globe, ImageIcon, MessageSquare, Mic, MicOff, Paperclip, Presentation, Send, X, Zap } from 'lucide-react'
import React, { useEffect, useState } from 'react'
import sendMessage from '../features/sendMessage'
import { useDispatch, useSelector } from 'react-redux'
import { addMessage, setArtifacts, setIsLoading, setMessages, appendMessageChunk, updateLastMessage } from '../redux/messageSlice'
import { createConversation } from '../features/createConversation'
import { addConversation, setConvTitle, setSelectedConversation } from '../redux/conversationSlice'
import { updateConversation } from '../features/updateConversation'
import { useRef } from 'react'
import { motion, AnimatePresence } from 'motion/react'

function ChatInput() {
  const [value, setValue] = useState("")
  const [selectedAgent, setSelectedAgent] = useState("Auto")
  const [selectedModel, setSelectedModel] = useState("GPT")
  const { selectedConversation } = useSelector(state => state.conversation)
  const { messages, isLoading } = useSelector(state => state.message)
  const [selectedFile, setSelectedFile] = useState(null)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef(null)
  const fileRef = useRef(null)
  const textareaRef = useRef(null)
  const dispatch = useDispatch()

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 250)}px`
    }
  }, [value])


  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition()
    recognition.lang = "en-US"
    recognition.interimResults = true;
    recognition.continuous = true;

    recognition.onresult = (event) => {
      let transcript = ""

      for (let index = event.resultIndex; index < event.results.length; index++) {

        transcript += event.results[index][0].transcript
      }
      setValue(transcript)
    }

    recognition.onend = () => {
      setListening(false)
    }

    recognitionRef.current = recognition
  }, [])

  const toggleMic = () => {
    if (!recognitionRef.current) {
      alert("speech recognition not supported")
    }
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      recognitionRef.current.start()
      setListening(true)
    }

  }








  const handleSendMessage = async () => {
    dispatch(setIsLoading(true))
    let conversation = selectedConversation
    if (!conversation) {
      dispatch(setMessages([]))
      const conv = await createConversation()
      if (!conv) {
        dispatch(setIsLoading(false))
        return
      }
      dispatch(setSelectedConversation(conv))

      dispatch(addConversation(conv))
      conversation = conv
    }

    if (conversation.title == "New Chat") {
      await updateConversation({ id: conversation?._id, title: value.trim() })
      dispatch(setConvTitle({ conversationId: conversation?._id, title: value.slice(0, 40) }))
    }


    console.log(selectedFile)
    const formData = new FormData()
    formData.append("prompt", value.trim())
    formData.append("conversationId", conversation?._id)
    formData.append("agent", selectedAgent.toLowerCase())
    formData.append("model", selectedModel)
    if (selectedFile) {
      formData.append("file", selectedFile)
    }



    dispatch(addMessage({ role: "user", content: value.trim() }))
    setValue("")
    
    // Dispatch an empty assistant message to be filled by the stream
    dispatch(addMessage({ role: "assistant", content: "", images: [] }))

    const data = await sendMessage(formData, (chunk) => {
      dispatch(appendMessageChunk(chunk))
    })
    
    dispatch(setIsLoading(false))
    setSelectedFile(null)
    if (data) {
      dispatch(setArtifacts(data.artifacts || []))
      dispatch(updateLastMessage({ images: data.images }))
    }
    console.log(data)
  }

  const agents = [
    {
      id: "auto",
      icon: Zap,
      label: "Auto"
    },

    {
      id: "chat",
      icon: MessageSquare,
      label: "Chat"
    },

    {
      id: "coding",
      icon: Code2,
      label: "Coding"
    },

    {
      id: "pdf",
      icon: FileText,
      label: "PDF"
    },

    {
      id: "ppt",
      icon: Presentation,
      label: "PPT"
    },

    {
      id: "vision",
      icon: ImageIcon,
      label: "Vision"
    },

    {
      id: "search",
      icon: Globe,
      label: "Search"
    }

  ]

  return (
    <div className='w-full overflow-hidden px-4 md:px-8 py-6 border-t border-white/[0.04] bg-transparent backdrop-blur-sm relative z-10'>
      <div className='flex flex-col gap-3 glass-panel rounded-3xl px-5 pt-3 pb-2 shadow-[0_8px_30px_rgba(0,0,0,0.4)] border-white/[0.08] focus-within:border-indigo-500/40 focus-within:shadow-[0_0_25px_rgba(99,102,241,0.15)] transition-all duration-300'>

        <div className='flex w-[80%] gap-2 pr-2 flex-wrap'>
          {agents.map((agent) => {
            const isActive = selectedAgent === agent.label
            const Icon = agent.icon
            return (
              <motion.div
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                key={agent.id}
                onClick={() => setSelectedAgent(agent.label)}
                className={`
            flex-shrink-0
            cursor-pointer
            inline-flex
            items-center
            gap-1.5
            px-3
            py-1.5
            rounded-full
            text-[11px]
            font-medium
            border
            transition-all

            ${isActive
                    ? "bg-gradient-to-r from-indigo-500 to-violet-600 text-white border-transparent shadow-[0_1px_8px_rgba(99,102,241,.35)]"
                    : "bg-white/[0.03] text-slate-400 border-white/[0.06] hover:bg-white/[0.07]"
                  }
          `}>

                <Icon size={14}
                  className={
                    isActive
                      ? "text-white"
                      : "text-slate-500"
                  } />

                {agent.label}

              </motion.div>
            )

          })}
        </div>

        <div className="flex w-[80%] gap-2 pr-2">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-white/[0.03] text-slate-400 border border-white/[0.06] hover:bg-white/[0.07] rounded-full px-3 py-1.5 text-[11px] font-medium outline-none transition-all focus:border-indigo-500/50 cursor-pointer appearance-none"
            >
              <option value="GPT" className="bg-[#0d0f14] text-slate-200">GPT</option>
              <option value="Gemini" className="bg-[#0d0f14] text-slate-200">Gemini</option>
              <option value="Deepseek" className="bg-[#0d0f14] text-slate-200">Deepseek</option>
            </select>
        </div>

        {
          selectedFile && <div className='my-3'>

            <div className='inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2'>
              {
                selectedFile?.type === "application/pdf" ? <FileText size={16}

                  className="text-red-400"
                /> : selectedFile.type.startsWith("image/") && <img src={URL.createObjectURL(selectedFile)} className="h-10 w-10 rounded-xl object-cover mt-3"
                />
              }

              <div>
                <p className='text-xs text-white'>
                  {selectedFile?.name}
                </p>
                <p className='text-[10px] text-slate-500'>
                  {Math.ceil(selectedFile.size)}KB
                </p>

              </div>
              <button className='ml-2' onClick={() => { setSelectedFile(null); fileRef.current.value = "" }}><X size={14} className='text-slate-500 hover:text-white' /></button>
            </div>


          </div>
        }


        <textarea
          ref={textareaRef}
          placeholder='Ask Anything...'
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              if (value.trim() && !isLoading) {
                handleSendMessage();
              }
            }
          }}
          value={value}
          className="w-full bg-transparent outline-none resize-none text-[14px] text-slate-200 placeholder:text-slate-600 leading-relaxed max-h-[250px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden disabled:opacity-50"
          rows={1}
        />
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-1'>

            <input type="file" accept='.pdf,.ppt,.pptx,image/*' hidden ref={fileRef} onChange={(e) => {
              const file = e.target.files[0]
              if (file) {
                setSelectedFile(file)
              }
            }} />

            <button className='flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 hover:text-slate-400 hover:bg-white/[0.05] border border-transparent hover:border-white/[0.06] transition-all duration-150 bg-transparent cursor-pointer' onClick={() => fileRef.current.click()}>
              <Paperclip size={16} />
            </button>
            <button
              onClick={toggleMic}
              className={`flex items-center justify-center w-8 h-8 rounded-lg  transition-all duration-150 cursor-pointer ${listening ?"bg-red-500 text-white":"text-slate-600 hover:bg-white/[0.05]" }`}>
             {listening?<Mic size={16} />:<MicOff size={16}/>} 
            </button>
          </div>
          <button
            disabled={!value && isLoading}
            onClick={handleSendMessage}
            className={`flex items-center justify-center w-8 h-8 rounded-lg border-none cursor-pointer transition-all duration-150 ${value.trim() ? "bg-linear-to-br from-indigo-500 to-violet-700 hover:opacity-90 text-white" : "bg-white/[0.05] text-slate-600 cursor-not-allowed"}`}>
          <Send size={15} />
        </button>
      </div>
    </div>
    </div >
  )
}

export default ChatInput
