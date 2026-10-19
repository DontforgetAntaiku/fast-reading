import { useEffect, useState } from 'react'

/** True once a service worker is active and controls the page, i.e. the app works without a network. */
export function useOfflineReady(): boolean {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return
    let alive = true
    const done = () => alive && setReady(true)
    void navigator.serviceWorker.ready.then(() => {
      if (navigator.serviceWorker.controller) done()
      else navigator.serviceWorker.addEventListener('controllerchange', done, { once: true })
    })
    return () => {
      alive = false
    }
  }, [])
  return ready
}
