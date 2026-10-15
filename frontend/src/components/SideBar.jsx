import React from 'react'
import { Coins, LogOut, Menu, MessageSquare, PanelLeftIcon, PanelRight, PenBoxIcon, PenSquare, Plus, User, X, Search } from "lucide-react"
import { useState } from 'react'
import { useEffect } from 'react'
import { getConversations } from '../features/getConversations'
import { searchConversations } from '../features/searchConversations'
import { useDispatch, useSelector } from 'react-redux'
import { addConversation, setConversations, setSelectedConversation } from '../redux/conversationSlice'

import { createConversation } from '../features/createConversation'
import logOut from '../features/logOut'
import { setUserdata } from '../redux/userSlice'
import BillingDrawer from './BillingDrawer'
import { motion, AnimatePresence } from 'motion/react'
import { useNavigate } from 'react-router-dom'

function SideBar() {
    const [collapsed, setCollapsed] = useState(false)
    const dispatch = useDispatch()
    const navigate = useNavigate()
    const [imageError, setImageError] = useState(false)
    const { conversations, selectedConversation } = useSelector(state => state.conversation)
    const { userData } = useSelector(state => state.user)
    const [showBilling, setShowBilling] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [isSearching, setIsSearching] = useState(false)

    useEffect(() => {
        const timer = setTimeout(async () => {
            if (searchQuery.trim() !== '') {
                setIsSearching(true)
                const data = await searchConversations(searchQuery)
                dispatch(setConversations(data))
                setIsSearching(false)
            } else {
                const data = await getConversations()
                dispatch(setConversations(data))
            }
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery, userData?._id])

    const handleCreateConversation = async () => {
        const data = await createConversation()
        dispatch(addConversation(data))
    }



    if (collapsed) {
        return (
            <motion.div initial={{ width: 0, opacity: 0 }} animate={{ width: 56, opacity: 1 }} transition={{ duration: 0.3 }} className='hidden lg:flex flex-col items-center w-[56px] h-screen glass-panel border-r border-white/[0.06] py-4 gap-1 shrink-0 z-40'>
                <button className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/10 transition-all duration-200 bg-transparent border-none cursor-pointer mb-1'
                    onClick={() => setCollapsed(false)}
                >
                    <PanelRight />
                </button>

                <button
                    className='flex items-center justify-center w-9 h-9 rounded-xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer '
                    onClick={() => dispatch(setSelectedConversation(null))}
                >
                    <Plus size={17} />
                </button>

                <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pt-5'>
                    {conversations.map((conv, i) => {
                        const isActive = selectedConversation?._id == conv?._id
                        return (
                            <div
                                onClick={() => dispatch(setSelectedConversation(conv))}
                                className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-[10px] border transition-colors duration-150
                ${isActive ? "bg-indigo-500/10 border-indigo-500/[0.18]"
                                        : "bg-transparent border-transparent"}`}>
                                <div className={`flex items-center justify-center shrink-0 w-[20px] h-[20px] rounded-lg transition-colors duration-150
                ${isActive ? "bg-indigo-500/15 text-indigo-400" : "bg-white/[0.05] text-slate-500"}`}>
                                    <MessageSquare size={13} />
                                </div>


                            </div>
                        )
                    })}

                </div>

                <div className='"relative shrink-0'>
                    {
                        (userData?.avatar && !imageError)
                            ?
                            <img
                                className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                src={userData?.avatar}
                                alt={"image"}
                                onError={() => setImageError(true)} />
                            :
                            <div className='w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center'>
                                <User size={15} className="text-slate-400" />
                            </div>

                    }

                </div>


            </motion.div>
        )
    }


    return (
        <>

            <button className='lg:hidden fixed top-3.5 left-4 z-50 flex items-center justify-center w-8 h-8 rounded-lg bg-[#0d0f14] border border-white/[0.06] text-slate-400 hover:text-slate-200 transition-colors duration-150 cursor-pointer' onClick={() => setMobileOpen(true)}>
                <Menu size={14} />
            </button>

            {mobileOpen && <div onClick={() => setMobileOpen(false)} className='lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-md' />}



            <div className={` fixed lg:static inset-y-0 left-0 z-50
        w-[270px] h-screen shrink-0
        glass-panel border-r border-white/[0.06]
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
`}
            >



                <div className='flex flex-col h-full'>
                    <div className='flex items-center gap-2.5 px-4 py-4 border-b border-white/[0.06]'>
                        <div className='hidden lg:flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
                            onClick={() => setCollapsed(true)}
                        >
                            <PanelLeftIcon />
                        </div>

                        <button onClick={() => setMobileOpen(false)}
                            className="lg:hidden flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer"
                        >
                            <X />
                        </button>
                        <span className='text-[16px] font-semibold text-slate-100 tracking-tight flex-1'>
                            Cortex AI
                        </span>
                        <span className='text-[10px] font-medium text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full tracking-wide'>{userData?.plan || "free"}</span>
                        <button className='flex items-center justify-center w-7 h-7 rounded-lg text-slate-500 hover:text-slate-200 hover:bg-white/[0.05] transition-colors duration-150 bg-transparent border-none cursor-pointer'
                            onClick={() => dispatch(setSelectedConversation(null))}>
                            <PenSquare size={14} />
                        </button>
                    </div>

                    <div className='px-4 pt-4 pb-1'>
                        <button className='w-full flex items-center justify-center gap-2 text-sm font-medium text-white bg-linear-to-br from-indigo-500 to-violet-700 rounded-xl py-[10px] border-none cursor-pointer hover:opacity-90 transition-opacity duration-150'
                            onClick={() => dispatch(setSelectedConversation(null))}
                        >
                            <Plus size={15} />
                            New Chat
                        </button>
                    </div>

                    <div className="px-4 pt-3 pb-2">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search size={14} className="text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search chats..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl pl-9 pr-4 py-2 text-[13px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50 focus:bg-white/[0.06] transition-colors"
                            />
                        </div>
                    </div>

                    {conversations.length == 0
                        ?
                        <div className='px-5 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600'>
                            {searchQuery.trim() !== '' ? "No chats found" : "No Recent Conversations"}
                        </div>
                        :
                        (
                            <div className='px-5 pt-3 pb-1.5 text-[10.5px] font-semibold uppercase tracking-widest text-slate-600'>
                                Recents
                            </div>
                        )}


                    <div className='flex-1 overflow-y-auto px-2.5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden'>
                        <AnimatePresence>
                            {conversations?.map((conv, i) => {
                                const isActive = selectedConversation?._id == conv?._id
                                return (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        transition={{ duration: 0.2, delay: i * 0.05 }}
                                        key={conv?._id || i}
                                        onClick={() => dispatch(setSelectedConversation(conv))}
                                        className={`flex items-center gap-2.5 cursor-pointer mb-0.5 px-3 py-2.5 rounded-xl border transition-all duration-200
                ${isActive ? "bg-indigo-500/15 border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.15)]"
                                                : "bg-transparent border-transparent hover:bg-white/5"}`}>
                                        <div className={`flex items-center justify-center shrink-0 w-[28px] h-[28px] rounded-lg transition-colors duration-200
                ${isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-slate-400"}`}>
                                            <MessageSquare size={13} />
                                        </div>
                                        <span className={`text-[13px] font-medium truncate transition-colors duration-200 ${isActive ? "text-white" : "text-slate-300"}`}>
                                            {conv?.title || "New Chat"}
                                        </span>

                                    </motion.div>
                                )
                            })}
                        </AnimatePresence>

                    </div>

                    <div className='mx-2.5 h-px bg-white/[0.06]' />
                    <div className='px-3.5 py-3.5'>
                        {userData ? (
                            <div className='flex items-center gap-2.5 cursor-pointer rounded-xl px-3 py-2.5 hover:bg-white/[0.05] transition-colors duration-150'>
                                <div className='"relative shrink-0'>
                                    {
                                        (userData?.avatar && !imageError)
                                            ?
                                            <img
                                                className='w-9 h-9 rounded-[10px] object-cover border-2 border-indigo-500/25'
                                                src={userData?.avatar}
                                                alt={"image"}
                                                onError={() => setImageError(true)} />
                                            :
                                            <div className='w-9 h-9 rounded-[10px] bg-white/[0.06] flex items-center justify-center'>
                                                <User size={15} className="text-slate-400" />
                                            </div>

                                    }

                                </div>
                                <div className='flex-1 min-w-0'>
                                    <p className='text-[13.5px] font-semibold text-slate-100 truncate'>{userData?.name || "user"}</p>
                                    <p className='text-[11px] text-slate-600 mt-px'>{`${userData?.plan}` || "free plan"} </p>
                                </div>
                                <div className='flex gap-1'>
                                    <button
                                        onClick={() => setShowBilling(true)}
                                        className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-yellow-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150'>
                                        <Coins size={16} />
                                    </button>
                                    <button className='flex items-center justify-center w-7 h-7 rounded-[7px] border-none bg-transparent text-slate-600 cursor-pointer hover:bg-white/[0.08] hover:text-slate-400 transition-all duration-150'
                                        onClick={() => {
                                            logOut();
                                            dispatch(setUserdata(null))
                                        }}
                                    >
                                        <LogOut size={16} />
                                    </button>
                                </div>
                            </div>)
                            :
                            <button onClick={() => navigate('/')} className='w-full flex items-center justify-center gap-2 text-sm font-medium text-slate-200 bg-white/[0.05] border border-white/[0.08] rounded-xl py-[11px] cursor-pointer hover:bg-white/[0.08] transition-colors duration-150'>
                                Login
                            </button>}
                    </div>
                </div>

            </div>


            <BillingDrawer
                open={showBilling}
                onClose={() => setShowBilling(false)}
            />

        </>
    )




}

export default SideBar
