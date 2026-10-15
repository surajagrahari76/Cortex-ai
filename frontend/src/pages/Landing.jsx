import React, { useState } from 'react'
import { motion } from 'motion/react'
import { Code2, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import { signInWithPopup, signInWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider } from '../../utils/firebase'
import api from '../../utils/axios'
import { setUserdata } from '../redux/userSlice'
import { FcGoogle } from "react-icons/fc"

function Landing() {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { userData } = useSelector(state => state.user)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const handleLogin = async (token) => {
      try {
          const { data } = await api.post("/api/auth/login", { token })
          dispatch(setUserdata(data))
          navigate('/chat')
      } catch (error) {
          console.log(error)
          setAuthError(error.response?.data?.message || error.message)
      }
  }

  const emailLogin = async (e) => {
      e.preventDefault();
      setAuthError('')
      if (userData) {
          navigate('/chat')
          return
      }
      try {
        const data = await signInWithEmailAndPassword(auth, email, password)
        const token = await data.user.getIdToken()
        await handleLogin(token)
      } catch (error) {
        console.log("Login error", error)
        setAuthError(error.message)
      }
  }

  const googleLogin = async () => {
      if (userData) {
          navigate('/chat')
          return
      }
      try {
        const data = await signInWithPopup(auth, googleProvider)
        const token = await data.user.getIdToken()
        await handleLogin(token)
      } catch (error) {
        console.log("Login error", error)
        setAuthError(error.message)
      }
  }

  return (
    <div className='min-h-screen mesh-bg flex flex-col items-center justify-center text-white p-6 relative overflow-hidden'>
      
      {/* Background decorations */}
      <div className='absolute top-20 left-10 w-72 h-72 bg-indigo-500/10 rounded-full blur-[100px] pointer-events-none' />
      <div className='absolute bottom-20 right-10 w-72 h-72 bg-violet-600/10 rounded-full blur-[100px] pointer-events-none' />

      <motion.div 
        initial={{opacity: 0, y: 30}} 
        animate={{opacity: 1, y: 0}} 
        transition={{duration: 0.8, ease: "easeOut"}}
        className='max-w-4xl mx-auto text-center z-10'
      >
        <motion.div 
          initial={{scale: 0.8, opacity: 0}}
          animate={{scale: 1, opacity: 1}}
          transition={{duration: 0.5, delay: 0.2}}
          className='w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(99,102,241,0.4)]'
        >
          <Code2 size={40} className="text-white" />
        </motion.div>

        <h1 className='text-5xl md:text-7xl font-bold tracking-tight mb-6 bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent'>
          Welcome to Cortex AI
        </h1>
        <p className='text-lg md:text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed'>
          Your intelligent coding assistant. Write, debug, and understand code faster than ever before with an AI that understands your context.
        </p>

        <div className='flex flex-col items-center justify-center gap-4'>
          {userData ? (
             <motion.button 
             whileHover={{scale: 1.05}}
             whileTap={{scale: 0.95}}
             onClick={() => navigate('/chat')}
             className='flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] hover:shadow-[0_0_30px_rgba(99,102,241,0.5)] transition-all cursor-pointer'
           >
             Go to Chat <ArrowRight size={20} />
           </motion.button>
          ) : (
            <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
              <form onSubmit={emailLogin} className='flex flex-col gap-3 w-full mb-2'>
                <input 
                  type='email' 
                  placeholder='Email' 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className='w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors'
                  required
                />
                <input 
                  type='password' 
                  placeholder='Password' 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className='w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:outline-none focus:border-indigo-500 transition-colors'
                  required
                />
                {authError && <p className='text-red-400 text-sm'>{authError}</p>}
                <motion.button 
                  whileHover={{scale: 1.02}}
                  whileTap={{scale: 0.98}}
                  type='submit'
                  className='w-full flex justify-center items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 text-white font-medium text-lg shadow-[0_0_20px_rgba(99,102,241,0.3)] transition-all cursor-pointer'
                >
                  Login with Email
                </motion.button>
              </form>
              <div className='flex items-center w-full gap-3'>
                <div className='h-px bg-white/10 flex-1'></div>
                <span className='text-slate-400 text-sm'>or</span>
                <div className='h-px bg-white/10 flex-1'></div>
              </div>
              <motion.button 
                whileHover={{scale: 1.05}}
                whileTap={{scale: 0.95}}
                onClick={googleLogin}
                type="button"
                className='w-full flex justify-center items-center gap-3 px-8 py-3 rounded-xl bg-white text-slate-900 font-medium text-lg shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all cursor-pointer'
              >
                <FcGoogle size={24} /> Continue with Google
              </motion.button>
            </div>
          )}
          
          {!userData && <p className='text-sm text-slate-500 mt-2'>Sign in to start chatting</p>}
        </div>

      </motion.div>

      {/* Footer */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1, delay: 0.8 }}
        className="absolute bottom-6 left-0 right-0 text-center"
      >
        <p className="text-sm text-slate-400 font-medium tracking-wide flex items-center justify-center gap-1.5">
          Made with <span className="text-red-500 animate-pulse">❤️</span> by 
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-violet-400 font-semibold hover:from-indigo-300 hover:to-violet-300 transition-colors cursor-pointer">
            Suraj Agrahari
          </span>
        </p>
      </motion.div>

    </div>
  )
}

export default Landing
