'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react'
import { audioEngine } from './audioEngine'

// Bumped v2→v3 to clear any stale remembered mute so sound is ON by default for
// everyone (a one-time reset of the saved preference; explicit mutes persist again
// from here). Sound still stays silent until the first user gesture per autoplay policy.
const STORAGE_KEY = 'fitsole-audio-v3'

interface AudioState {
  muted: boolean
  toggle: () => void
  hydrated: boolean
}

const AudioCtx = createContext<AudioState | null>(null)

/**
 * App-wide audio state. SSR-safe (starts muted on the server; the real state is
 * resolved after mount from localStorage / prefers-reduced-motion). The actual
 * sound graph is the `audioEngine` singleton — components that drive the bed or
 * fire cues import it directly; this provider only owns the mute toggle + the
 * one-time gesture unlock the browser autoplay policy requires.
 */
export function AudioProvider({ children }: { children: ReactNode }) {
  // Start muted to match the server render; corrected in the effect below so
  // there's no hydration divergence (same pattern as the cart).
  const [muted, setMuted] = useState(true)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // Sound is ON by default for everyone (it stays silent until the first user
    // gesture, per the browser autoplay policy). An explicit mute is remembered.
    // Guard the read: Safari Private Mode (and any storage-disabled context) throws
    // synchronously on localStorage access. An unguarded throw here would skip
    // setHydrated(true), so the gesture-unlock effect below (gated on `hydrated`)
    // would never wire up and audio would never start. Mirrors cart.tsx's guard.
    let initial = false
    try {
      initial = localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      // storage unavailable → fall back to the unmuted default
    }
    setMuted(initial)
    audioEngine.setMuted(initial)
    setHydrated(true)
  }, [])

  // One-time unlock on the first user gesture (iOS/Safari autoplay policy):
  // create + resume the context and start the (silent-until-needed) bed.
  useEffect(() => {
    if (!hydrated) return
    const onGesture = () => audioEngine.unlock()
    const opts: AddEventListenerOptions = { once: true, passive: true }
    // Includes scroll/wheel/touchmove so the music starts the moment the visitor
    // scrolls (the natural first action here), not only on a click.
    const events = ['scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown'] as const
    events.forEach((e) => window.addEventListener(e, onGesture, opts))
    return () => events.forEach((e) => window.removeEventListener(e, onGesture))
  }, [hydrated])

  const toggle = useCallback(() => {
    audioEngine.unlock() // the click is a valid gesture — (re)start the context
    setMuted((m) => {
      // First click on a not-yet-running context = "turn sound ON", not a mute: the
      // unmuted default is silent only because the browser blocks audio before a
      // gesture (and scroll/wheel don't count as one). Once it's actually running,
      // the icon toggles normally.
      const next = audioEngine.running ? !m : false
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore storage failures (private mode etc.)
      }
      audioEngine.setMuted(next)
      return next
    })
  }, [])

  return (
    <AudioCtx.Provider value={{ muted, toggle, hydrated }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}
