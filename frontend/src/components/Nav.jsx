import { MessageSquare } from 'lucide-react'
import React from 'react'
import { useSelector } from 'react-redux'

function Nav() {
const {selectedConversation}=useSelector(state=>state.conversation)
const {messages}=useSelector(state=>state.message)
  return (
<>
    {selectedConversation &&   <div className='h-16 flex items-center gap-3 px-6 border-b border-white/[0.04] bg-white/[0.01] backdrop-blur-md sticky top-0 z-10'>
      <div className='flex items-center justify-center w-8 h-8 rounded-lg bg-indigo-500/15 border border-indigo-500/30 shadow-[0_0_10px_rgba(99,102,241,0.2)]'>
        <MessageSquare size={14} className="text-indigo-400"/>
      </div>
      <div className='text-[15px] font-semibold text-slate-100 tracking-tight'>
{selectedConversation?.title || "New Chat"}
      </div>
      <div className='text-[11px] font-medium text-slate-400 bg-white/5 border border-white/10 px-2.5 py-1 rounded-full shadow-inner'>
        {messages?.length} Messages
      </div>
    </div>}
  </>
  )
}

export default Nav
