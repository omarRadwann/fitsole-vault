'use client'

// FitSole Vault — Web Audio engine (placeholder sound design, synthesized).
//
// Architecture (per MOONSHOT_HANDOVER §6): one AudioContext, a master gain, an
// ambient "bed" bus that ducks while a one-shot cue plays, and a cue bus. The
// context is created lazily and only RESUMED on a user gesture (iOS/Safari
// autoplay-safe). Everything is a synthesized placeholder for now — to drop in
// professionally composed sound later, replace the per-cue synth functions
// below with decoded file buffers (e.g. loaded from /public/audio via withBase);
// the public API (unlock / setMuted / setBedActive / playCue) does not change.

export type CueName = 'whoosh' | 'chime' | 'thunk' | 'ney' | 'tick'

class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private bedGain: GainNode | null = null // ambient bed — ducked under cues
  private cueGain: GainNode | null = null // one-shot cues
  private motionGain: GainNode | null = null // scroll-velocity "air" whoosh
  private motionFilter: BiquadFilterNode | null = null
  private analyser: AnalyserNode | null = null // taps the master mix
  private freqData: Uint8Array<ArrayBuffer> | null = null
  private level = 0 // smoothed reactive energy
  private bedStarted = false
  private bedActive = false
  muted = false

  // Master volume when unmuted. Intentionally restrained — ambient, not loud.
  private readonly vol = 0.42
  private readonly bedVol = 0.62

  /** Lazily build the graph. Returns null if Web Audio is unavailable. */
  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx
    if (typeof window === 'undefined') return null
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const master = ctx.createGain()
    master.gain.value = this.muted ? 0 : this.vol
    master.connect(ctx.destination)
    const bedGain = ctx.createGain()
    bedGain.gain.value = 0 // raised by setBedActive
    bedGain.connect(master)
    const cueGain = ctx.createGain()
    cueGain.gain.value = 0.7 // restrain one-shot cues to tasteful accents
    cueGain.connect(master)
    // Analyser taps the master mix (post-gain → silent when muted), so the vault
    // pulses with whatever is actually audible — the scroll-motion air.
    const analyser = ctx.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.8
    master.connect(analyser)
    this.ctx = ctx
    this.master = master
    this.bedGain = bedGain
    this.cueGain = cueGain
    this.analyser = analyser
    this.freqData = new Uint8Array(analyser.frequencyBinCount)
    return ctx
  }

  /** Call on a user gesture: resume the context + start the ambient bed. */
  unlock() {
    const ctx = this.ensure()
    if (!ctx) return
    if (ctx.state === 'suspended') void ctx.resume()
    if (!this.bedStarted) {
      this.startBed(ctx)
      this.bedStarted = true
    }
  }

  get ready() {
    return this.ctx !== null
  }

  // The bed's "active" level — a faint room-tone underlayer.
  private bedTarget(): number {
    return this.bedActive ? this.bedVol : 0
  }

  /** Smoothed 0–1 audio energy (bass-weighted) for the audio-reactive vault.
   *  Fast attack / slow decay so visuals pulse with the beat, not jitter. Reads
   *  0 when muted or silent (the analyser taps the post-gain master). */
  getLevel(): number {
    const a = this.analyser
    const data = this.freqData
    if (!a || !data) return 0
    a.getByteFrequencyData(data)
    let sum = 0
    const n = 16 // low / low-mid bins carry the beat
    for (let i = 1; i <= n; i++) sum += data[i]
    const raw = sum / (n * 255)
    this.level = raw > this.level ? raw : this.level * 0.9 + raw * 0.1
    return this.level
  }

  // ---- Ambient bed: a soft, warm "room tone" — gently filtered air with a
  // faint warm sub-pad underneath, breathing slowly. Deliberately quiet and
  // atmospheric, NOT a musical drone. The breathing LFO modulates a dedicated
  // inner `voice` gain, leaving `bedGain` (the bus) clean so setBedActive/duck
  // ramps can take it to TRUE silence.
  private startBed(ctx: AudioContext) {
    // No ambient bed — the vault is SILENT at rest. The ONLY sound is the
    // scroll-motion "air" below, driven by setMotion (zero gain when not scrolling).
    //
    // A soft velocity-driven WIND: brown noise → highpass (cut low rumble) →
    // velocity-controlled lowpass (opens up + brightens with scroll speed) → gain.
    // A lowpass (not the old bandpass) reads as smooth air rushing past, not a
    // hiss. Routed to master so it also feeds the analyser → the neon pulses with
    // your movement.
    const mNoise = this.brownNoise(ctx, 4)
    const mhp = ctx.createBiquadFilter()
    mhp.type = 'highpass'
    mhp.frequency.value = 180
    const mlp = ctx.createBiquadFilter()
    mlp.type = 'lowpass'
    mlp.frequency.value = 360
    mlp.Q.value = 0.5
    const mGain = ctx.createGain()
    mGain.gain.value = 0
    mNoise.connect(mhp)
    mhp.connect(mlp)
    mlp.connect(mGain)
    mGain.connect(this.master!)
    mNoise.start()
    this.motionGain = mGain
    this.motionFilter = mlp
  }

  private brownNoise(ctx: AudioContext, seconds: number) {
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(1, len, ctx.sampleRate)
    const d = buf.getChannelData(0)
    let last = 0
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1
      last = (last + 0.02 * w) / 1.02
      d[i] = last * 2.2
    }
    const src = ctx.createBufferSource()
    src.buffer = buf
    src.loop = true
    return src
  }

  /** Raise/lower the ambient bed (e.g. only while the vault is on-screen). */
  setBedActive(active: boolean) {
    this.bedActive = active
    const ctx = this.ctx
    if (!ctx || !this.bedGain) return
    const t = ctx.currentTime
    this.bedGain.gain.cancelScheduledValues(t)
    this.bedGain.gain.setValueAtTime(this.bedGain.gain.value, t)
    this.bedGain.gain.linearRampToValueAtTime(this.bedTarget(), t + 0.7)
  }

  /** Drive the scroll-motion "air" from the per-frame scroll-progress delta.
   *  Silent at rest; louder + brighter the faster you move through the vault.
   *  setTargetAtTime gives a smooth, click-free follow of the jittery input. */
  setMotion(delta: number) {
    const ctx = this.ctx
    if (!ctx || !this.motionGain || !this.motionFilter) return
    const drive = Math.min(1, Math.max(0, delta) * 55)
    const t = ctx.currentTime
    // Zero gain at rest → SILENCE when not scrolling; opens up with scroll speed.
    this.motionGain.gain.setTargetAtTime(drive * 0.3, t, 0.08)
    this.motionFilter.frequency.setTargetAtTime(360 + drive * 1900, t, 0.08)
  }

  setMuted(m: boolean) {
    this.muted = m
    const ctx = this.ctx
    if (!ctx || !this.master) return
    const t = ctx.currentTime
    this.master.gain.cancelScheduledValues(t)
    this.master.gain.setValueAtTime(this.master.gain.value, t)
    this.master.gain.linearRampToValueAtTime(m ? 0 : this.vol, t + 0.25)
  }

  /** Tuck the bed briefly so a cue reads cleanly, then restore. */
  private duck(dur: number) {
    const ctx = this.ctx
    if (!ctx) return
    const t = ctx.currentTime
    if (this.bedGain && this.bedActive) {
      const g = this.bedGain.gain
      const base = this.bedTarget()
      g.cancelScheduledValues(t)
      g.setValueAtTime(g.value, t)
      g.linearRampToValueAtTime(base * 0.5, t + 0.05)
      g.linearRampToValueAtTime(base, t + dur + 0.4)
    }
  }

  playCue(name: CueName) {
    const ctx = this.ensure()
    if (!ctx || this.muted || !this.cueGain) return
    if (ctx.state === 'suspended') void ctx.resume()
    const t = ctx.currentTime
    switch (name) {
      case 'chime':
        this.duck(1.6)
        this.bell(ctx, t)
        break
      case 'whoosh':
        this.duck(1.2)
        this.whoosh(ctx, t)
        break
      case 'thunk':
        this.duck(0.6)
        this.thunk(ctx, t)
        break
      case 'ney':
        this.duck(3.5)
        this.ney(ctx, t)
        break
      case 'tick':
        this.tick(ctx, t)
        break
    }
  }

  // ---- Cue synths (placeholders) ----

  // Authentication chime: an inharmonic bell — verification, "passed".
  private bell(ctx: AudioContext, t: number) {
    const partials: Array<[number, number, number]> = [
      [880, 1, 1.6],
      [1320, 0.55, 1.3],
      [1760, 0.4, 1.0],
      [2640, 0.22, 0.7],
      [3520, 0.12, 0.5],
    ]
    for (const [f, amp, dur] of partials) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = f
      const g = ctx.createGain()
      g.gain.setValueAtTime(0.0001, t)
      g.gain.exponentialRampToValueAtTime(amp * 0.5, t + 0.008)
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
      o.connect(g)
      g.connect(this.cueGain!)
      o.start(t)
      o.stop(t + dur + 0.05)
    }
  }

  // Soft door/air whoosh: filtered noise with a lowpass sweep.
  private whoosh(ctx: AudioContext, t: number) {
    const noise = this.brownNoise(ctx, 1.6)
    noise.loop = false
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.setValueAtTime(180, t)
    bp.frequency.exponentialRampToValueAtTime(900, t + 0.5)
    bp.frequency.exponentialRampToValueAtTime(140, t + 1.3)
    bp.Q.value = 0.8
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.5, t + 0.25)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.3)
    noise.connect(bp)
    bp.connect(g)
    g.connect(this.cueGain!)
    noise.start(t)
    noise.stop(t + 1.4)
  }

  // Wax-seal thunk: a low body + a short click transient.
  private thunk(ctx: AudioContext, t: number) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(140, t)
    o.frequency.exponentialRampToValueAtTime(58, t + 0.18)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.7, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4)
    o.connect(g)
    g.connect(this.cueGain!)
    o.start(t)
    o.stop(t + 0.45)
    // click
    const click = this.brownNoise(ctx, 0.05)
    click.loop = false
    const cg = ctx.createGain()
    cg.gain.setValueAtTime(0.4, t)
    cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.05)
    click.connect(cg)
    cg.connect(this.cueGain!)
    click.start(t)
    click.stop(t + 0.06)
  }

  // Ney flute (placeholder): a breathy, vibrato'd tone with a slow attack.
  // Clearly a stand-in — swap for a real mastered ney recording later.
  private ney(ctx: AudioContext, t: number) {
    const o = ctx.createOscillator()
    o.type = 'triangle'
    o.frequency.value = 392 // G4
    const vib = ctx.createOscillator()
    vib.frequency.value = 5.2
    const vibGain = ctx.createGain()
    vibGain.gain.value = 4
    vib.connect(vibGain)
    vibGain.connect(o.frequency)
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.0001, t)
    g.gain.linearRampToValueAtTime(0.32, t + 0.5)
    g.gain.setValueAtTime(0.32, t + 2.6)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 3.6)
    // breath
    const breath = this.brownNoise(ctx, 3.6)
    breath.loop = false
    const bf = ctx.createBiquadFilter()
    bf.type = 'highpass'
    bf.frequency.value = 1200
    const bg = ctx.createGain()
    bg.gain.value = 0.05
    breath.connect(bf)
    bf.connect(bg)
    bg.connect(this.cueGain!)
    o.connect(g)
    g.connect(this.cueGain!)
    o.start(t)
    vib.start(t)
    breath.start(t)
    o.stop(t + 3.7)
    vib.stop(t + 3.7)
    breath.stop(t + 3.7)
  }

  // Subtle UI/transition tick.
  private tick(ctx: AudioContext, t: number) {
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = 2100
    const g = ctx.createGain()
    g.gain.setValueAtTime(0.18, t)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07)
    o.connect(g)
    g.connect(this.cueGain!)
    o.start(t)
    o.stop(t + 0.08)
  }
}

// Module singleton — one engine for the whole app.
export const audioEngine = new AudioEngine()
