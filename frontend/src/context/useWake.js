import { createContext, useContext } from 'react'

export const WakeContext = createContext({
  isBannerVisible: false,
  isReady: false,
})

export const useWake = () => useContext(WakeContext)

