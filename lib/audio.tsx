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

const STORAGE_KEY = 'fitsole-audio-muted'

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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const stored = localStorage.getItem(STORAGE_KEY)
    // Default: ON (unmuted) — but silent until the first gesture (autoplay-safe).
    // Reduced-motion users default to muted (respect the preference).
    const initial = stored != null ? stored === '1' : reduce
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
    setMuted((m) => {
      const next = !m
      try {
        localStorage.setItem(STORAGE_KEY, next ? '1' : '0')
      } catch {
        // ignore storage failures (private mode etc.)
      }
      audioEngine.unlock() // the toggle click is itself a valid gesture
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
