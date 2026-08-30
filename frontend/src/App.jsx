import React, { useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Landing from './pages/Landing'
import getCurrentUser from './features/getCurrentUser'
import { useDispatch } from 'react-redux'
import { setUserdata } from './redux/userSlice'

function App() {

  const dispatch=useDispatch()
  useEffect(()=>{
    const getUser=async ()=>{
      const data=await getCurrentUser()
      dispatch(setUserdata(data))
    }
    getUser()
  },[])

  return (
   <BrowserRouter>
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/chat" element={<Home />} />
    </Routes>
   </BrowserRouter>
  )
}

export default App
