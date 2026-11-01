import { useEffect, useState, useRef } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { WakeContext } from './useWake'

export const WakeProvider = ({ children }) => {
  const [isBannerVisible, setIsBannerVisible] = useState(true)
  const [isReady, setIsReady] = useState(false)
  const [justBecameReady, setJustBecameReady] = useState(false)
  const attemptsRef = useRef(0)
  const timeoutRef = useRef(null)
  const isMountedRef = useRef(true)

  useEffect(() => {
    isMountedRef.current = true
    attemptsRef.current = 0

    const checkWake = async () => {
      if (!isMountedRef.current) return

      if (attemptsRef.current >= 12) {
        if (isMountedRef.current) {
          setIsBannerVisible(false)
        }
        return
      }

      attemptsRef.current += 1

      try {
        const res = await fetch("/api/wake")
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`)
        }
        const data = await res.json()

        if (data && data.ready) {
          if (isMountedRef.current) {
            setIsReady(true)
            setJustBecameReady(true)
            setIsBannerVisible(true)
            setTimeout(() => {
              if (isMountedRef.current) {
                setIsBannerVisible(false)
                setJustBecameReady(false)
              }
            }, 2000)
          }
          return
        }

        // Not ready yet, retry in 5s
        if (isMountedRef.current && attemptsRef.current < 12) {
          timeoutRef.current = setTimeout(checkWake, 5000)
        } else if (isMountedRef.current) {
          setIsBannerVisible(false)
        }
      } catch {
        // Network error / timeout, retry in 5s
        if (isMountedRef.current && attemptsRef.current < 12) {
          timeoutRef.current = setTimeout(checkWake, 5000)
        } else if (isMountedRef.current) {
          setIsBannerVisible(false)
        }
      }
    }

    checkWake()

    return () => {
      isMountedRef.current = false
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  return (
    <WakeContext.Provider value={{ isBannerVisible, isReady }}>
      {isBannerVisible && (
        <div
          className={`fixed top-0 left-0 right-0 z-[9999] pointer-events-none flex items-center justify-center py-2 px-4 text-xs font-medium backdrop-blur-md shadow-md transition-all duration-300 ${
            justBecameReady
              ? "bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300"
              : "bg-amber-500/20 border-b border-amber-500/30 text-amber-200"
          }`}
        >
          {justBecameReady ? (
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-emerald-400" />
              <span>Ready</span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Loader2 size={14} className="animate-spin text-amber-300" />
              <span>Servers are starting up (free hosting). This can take 30-60 seconds.</span>
            </div>
          )}
        </div>
      )}
      {children}
    </WakeContext.Provider>
  )
}

export default WakeProvider

