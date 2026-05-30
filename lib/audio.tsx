'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
  useId,
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
  // Register/unregister a section as wanting the ambient bed on. The bed plays
  // while ANY registered section is active (see useBedSection).
  setBedSection: (id: string, active: boolean) => void
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

  // Ambient-bed coordination. The bed plays while ANY cinematic section (vault,
  // finale, unboxing video) is in view, and fades out once the user reaches the
  // shop. Sections report in-view via useBedSection(); we OR them here so the
  // engine's setBedActive is called from exactly ONE place. The id Set lives in a
  // ref (stable callback, no stale closures); React state flips only on the 0↔n
  // boundary, so sections toggling while another stays active cause no re-render.
  const bedIdsRef = useRef<Set<string>>(new Set())
  const [bedAny, setBedAny] = useState(false)
  const setBedSection = useCallback((id: string, active: boolean) => {
    const s = bedIdsRef.current
    if (active) s.add(id)
    else s.delete(id)
    setBedAny((prev) => (s.size > 0) === prev ? prev : s.size > 0)
  }, [])
  useEffect(() => {
    audioEngine.setBedActive(bedAny)
  }, [bedAny])

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

  // Unlock on the first VALID user gesture (autoplay policy). Chrome does NOT count
  // scroll/wheel/touchmove as a user-activation for AudioContext.resume() — so a
  // `{once:true}` listener gets consumed by the first scroll (resume stays blocked)
  // and never retries, which is why audio used to start only on the speaker click.
  // Fix: KEEP listening and retry unlock() on every gesture, detaching only once the
  // context is actually running (a real activation — click/key/touch — landed).
  useEffect(() => {
    if (!hydrated) return
    const events = ['scroll', 'wheel', 'touchstart', 'touchmove', 'pointerdown', 'keydown', 'click', 'mousedown'] as const
    const opts: AddEventListenerOptions = { passive: true } // NOT once — re-arm until running
    const detach = () => events.forEach((e) => window.removeEventListener(e, onGesture))
    const onGesture = () => {
      audioEngine.unlock()
      // ctx.resume() is async — `running` is usually still false the instant after
      // unlock() even on a VALID gesture. Re-check on the next tick so a single
      // valid click/keypress detaches cleanly (don't depend on a 2nd gesture).
      if (audioEngine.running) detach()
      else setTimeout(() => { if (audioEngine.running) detach() }, 80)
    }
    events.forEach((e) => window.addEventListener(e, onGesture, opts))
    return detach
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
    <AudioCtx.Provider value={{ muted, toggle, hydrated, setBedSection }}>
      {children}
    </AudioCtx.Provider>
  )
}

export function useAudio() {
  const ctx = useContext(AudioCtx)
  if (!ctx) throw new Error('useAudio must be used within AudioProvider')
  return ctx
}

/**
 * Report this section's in-view state to the shared ambient-bed registry. The bed
 * plays while ANY registered section is active and fades out when the last one
 * leaves view — so the music carries across the vault → finale → video stretch and
 * stops in the shop. Auto-unregisters on unmount. No-ops if no provider is present.
 */
export function useBedSection(active: boolean) {
  const ctx = useContext(AudioCtx)
  const id = useId()
  const setBedSection = ctx?.setBedSection
  useEffect(() => {
    setBedSection?.(id, active)
    return () => setBedSection?.(id, false)
  }, [setBedSection, id, active])
}
