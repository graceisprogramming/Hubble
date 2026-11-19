import { useEffect, useRef, useState } from 'react'
import { SHAKE_COOLDOWN_MS, SHAKE_THRESHOLD } from './config'

// 動作感應器：iOS 需要使用者點擊後才能請求授權
export function useShake(onShake) {
  const [status, setStatus] = useState(() => {
    if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) return 'unsupported'
    return typeof window.DeviceMotionEvent.requestPermission === 'function' ? 'needs-permission' : 'granted'
  })
  const cb = useRef(onShake)
  cb.current = onShake

  useEffect(() => {
    if (status !== 'granted') return undefined
    let last = 0
    let prev = null
    const handler = (e) => {
      const a = e.accelerationIncludingGravity
      if (!a) return
      const cur = { x: a.x || 0, y: a.y || 0, z: a.z || 0 }
      if (prev) {
        const delta = Math.abs(cur.x - prev.x) + Math.abs(cur.y - prev.y) + Math.abs(cur.z - prev.z)
        const now = Date.now()
        if (delta > SHAKE_THRESHOLD && now - last > SHAKE_COOLDOWN_MS) {
          last = now
          cb.current()
        }
      }
      prev = cur
    }
    window.addEventListener('devicemotion', handler)
    return () => window.removeEventListener('devicemotion', handler)
  }, [status])

  const request = async () => {
    try {
      const result = await window.DeviceMotionEvent.requestPermission()
      setStatus(result === 'granted' ? 'granted' : 'denied')
    } catch {
      setStatus('denied')
    }
  }
  return { status, request }
}
