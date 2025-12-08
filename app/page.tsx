"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import DailySummary from "@/components/game/DailySummary"
import CollectionsPanel from "@/components/game/CollectionsPanel"
import QuestsPanel from "@/components/game/QuestsPanel"
import TreasureModal from "@/components/game/TreasureModal"
import HexGrid from "@/components/game/HexGrid"

// First-time tips overlay
function OnboardingTips({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="max-w-md mx-auto p-6 rounded-2xl bg-slate-900/95 border border-amber-600/30 shadow-2xl space-y-4">
        <h3 className="text-amber-200 text-xl font-bold">How to play</h3>
        <ol className="list-decimal list-inside space-y-2 text-amber-100/90 text-sm">
          <li>
            Click an <b>adjacent</b> hex to sail there and reveal it.
          </li>
          <li>
            Every map hides <b>exactly one treasure</b>. Keep exploring!
          </li>
          <li>Earn gold as you sail • Bigger reward when you find the chest.</li>
        </ol>
        <button className="mt-2 px-4 py-2 rounded-lg bg-amber-500 text-black font-semibold w-full" onClick={onClose}>
          Let&apos;s sail
        </button>
      </div>
    </div>
  )
}
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import {
  User,
  Trophy,
  Coins,
  Crown,
  Compass,
  Sparkles,
  Volume2,
  VolumeX,
  Music,
  Settings,
  Anchor,
  MapIcon,
  HeartIcon as Chest,
} from "lucide-react"

// ---- Move token + Captcha helpers ----
async function getMoveToken(q: number, r: number): Promise<string | null> {
  try {
    const playerId = typeof window !== "undefined" ? localStorage.getItem("playerId") || "" : ""
    const res = await fetch("/api/move-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ q, r, playerId }),
      cache: "no-store",
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.token || null
  } catch {
    return null
  }
}

// Cloudflare Turnstile (invisible) minimal exec
declare global {
  interface Window {
    turnstile?: any
  }
}
let turnstileReady: Promise<void> | null = null
function ensureTurnstileScript(siteKey?: string) {
  if (!siteKey) return null
  if (turnstileReady) return turnstileReady
  turnstileReady = new Promise<void>((resolve) => {
    const s = document.createElement("script")
    s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
    s.async = true
    s.defer = true
    s.onload = () => resolve()
    document.head.appendChild(s)
  })
  return turnstileReady
}

async function getCaptchaToken(): Promise<string | null> {
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
  if (!siteKey) return null
  await ensureTurnstileScript(siteKey)
  return new Promise((resolve) => {
    const div = document.createElement("div")
    div.style.position = "fixed"
    div.style.bottom = "-2000px" // hide offscreen
    document.body.appendChild(div)
    const widgetId = window.turnstile.render(div, {
      sitekey: siteKey,
      size: "invisible",
      callback: (token: string) => {
        resolve(token)
        setTimeout(() => {
          try {
            document.body.removeChild(div)
          } catch {}
        }, 100)
      },
      "error-callback": () => resolve(null),
      "timeout-callback": () => resolve(null),
    })
    try {
      window.turnstile.execute(widgetId)
    } catch {
      resolve(null)
    }
  })
}
// ---- Authoritative rewards helper (client) ----
async function creditRewardAuthoritative(
  kind: "sail" | "treasure",
  opts?: { moveToken?: string | null; captchaToken?: string | null },
) {
  try {
    const playerId = typeof window !== "undefined" ? localStorage.getItem("playerId") || "" : ""
    const res = await fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind,
        playerId,
        moveToken: opts?.moveToken || null,
        captchaToken: opts?.captchaToken || null,
      }),
      cache: "no-store",
    })
    if (!res.ok) {
      return { success: false, amountGranted: 0, balance: 0, reason: "network" }
    }
    const data = await res.json()
    return data
  } catch (e) {
    return { success: false, amountGranted: 0, balance: 0, reason: "error" }
  }
}

// Pirate Audio Manager for handling all game sounds
class PirateAudioManager {
  private audioContext: AudioContext | null = null
  private sounds: Map<string, HTMLAudioElement> = new Map()
  private musicVolume = 0.3
  private sfxVolume = 0.7
  private isMuted = false
  private backgroundMusic: HTMLAudioElement | null = null

  constructor() {
    this.initializeAudio()
  }

  private async initializeAudio() {
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      await this.loadSounds()
    } catch (error) {
      console.log("Audio not supported or blocked:", error)
    }
  }

  private async loadSounds() {
    const soundFiles = {
      // Sailing and exploration sounds
      sail: "/sounds/sail-wind.mp3",
      splash: "/sounds/water-splash.mp3",
      rowing: "/sounds/rowing.mp3",

      // Discovery sounds by terrain type (pirate themed)
      grass: "/sounds/island-birds.mp3",
      forest: "/sounds/jungle-sounds.mp3",
      desert: "/sounds/desert-wind.mp3",
      ocean: "/sounds/ocean-waves.mp3",
      mountain: "/sounds/cave-echo.mp3",
      treasure: "/sounds/treasure-chest.mp3",

      // UI sounds (pirate themed)
      buttonClick: "/sounds/wooden-click.mp3",
      buttonHover: "/sounds/rope-creak.mp3",
      levelUp: "/sounds/cannon-fire.mp3",
      achievement: "/sounds/pirate-cheer.mp3",

      // Special pirate sounds
      treasureFound: "/sounds/pirate-celebration.mp3",
      coinCollect: "/sounds/doubloon-clink.mp3",
      magicalChime: "/sounds/mystical-bell.mp3",
      bottleClue: "/sounds/bottle-pop.mp3",
      storm: "/sounds/thunder-storm.mp3",
      kraken: "/sounds/sea-monster.mp3",
      shipwreck: "/sounds/wood-crash.mp3",

      // Background music
      backgroundMusic: "/sounds/pirate-shanty-ambient.mp3",
    }

    // In a real implementation, these would be actual audio files
    // For demo purposes, we'll create silent audio elements
    for (const [key, url] of Object.entries(soundFiles)) {
      try {
        const audio = new Audio()
        audio.preload = "auto"
        audio.volume = key === "backgroundMusic" ? this.musicVolume : this.sfxVolume

        // For demo - create a silent audio element
        // In production, you'd set: audio.src = url
        audio.src =
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT"

        this.sounds.set(key, audio)

        if (key === "backgroundMusic") {
          this.backgroundMusic = audio
          audio.loop = true
        }
      } catch (error) {
        console.log(`Failed to load sound: ${key}`, error)
      }
    }
  }

  playSound(soundName: string, volume?: number) {
    if (this.isMuted) return

    const sound = this.sounds.get(soundName)
    if (sound) {
      try {
        sound.currentTime = 0
        if (volume !== undefined) {
          sound.volume = volume * (soundName === "backgroundMusic" ? this.musicVolume : this.sfxVolume)
        }
        sound.play().catch((e) => console.log("Audio play failed:", e))
      } catch (error) {
        console.log("Error playing sound:", error)
      }
    }
  }

  playBackgroundMusic() {
    if (this.backgroundMusic && !this.isMuted) {
      this.backgroundMusic.play().catch((e) => console.log("Background music play failed:", e))
    }
  }

  stopBackgroundMusic() {
    if (this.backgroundMusic) {
      this.backgroundMusic.pause()
      this.backgroundMusic.currentTime = 0
    }
  }

  setMusicVolume(volume: number) {
    this.musicVolume = volume
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = volume
    }
  }

  setSFXVolume(volume: number) {
    this.sfxVolume = volume
    this.sounds.forEach((sound, key) => {
      if (key !== "backgroundMusic") {
        sound.volume = volume
      }
    })
  }

  toggleMute() {
    this.isMuted = !this.isMuted
    if (this.isMuted) {
      this.stopBackgroundMusic()
    } else {
      this.playBackgroundMusic()
    }
    return this.isMuted
  }

  getMuted() {
    return this.isMuted
  }

  getMusicVolume() {
    return this.musicVolume
  }

  getSFXVolume() {
    return this.sfxVolume
  }
}

// Pirate Audio Settings Component
const PirateAudioSettings = ({
  audioManager,
}: {
  audioManager: PirateAudioManager
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [musicVolume, setMusicVolume] = useState(audioManager.getMusicVolume() * 100)
  const [sfxVolume, setSfxVolume] = useState(audioManager.getSFXVolume() * 100)
  const [isMuted, setIsMuted] = useState(audioManager.getMuted())

  const handleMusicVolumeChange = (value: number[]) => {
    const volume = value[0] / 100
    setMusicVolume(value[0])
    audioManager.setMusicVolume(volume)
  }

  const handleSFXVolumeChange = (value: number[]) => {
    const volume = value[0] / 100
    setSfxVolume(value[0])
    audioManager.setSFXVolume(volume)
    audioManager.playSound("coinCollect", 0.5) // Test sound
  }

  const handleMuteToggle = () => {
    const muted = audioManager.toggleMute()
    setIsMuted(muted)
  }

  // --- render ---

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className="bg-amber-900/20 border border-amber-600/40 text-amber-200 hover:bg-amber-800/30 backdrop-blur-sm transition-all duration-300"
          onClick={() => audioManager.playSound("buttonClick")}
        >
          <Settings className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md bg-slate-900/95 backdrop-blur-2xl border border-amber-600/30">
        <DialogHeader>
          <DialogTitle className="flex items-center text-amber-200 text-xl font-bold">
            <Music className="w-6 h-6 mr-3 text-amber-400" />
            Ship's Audio Controls
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 p-4">
          {/* Mute Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-amber-200 font-medium">Master Audio</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMuteToggle}
              className={`${
                isMuted
                  ? "bg-red-500/20 border-red-500/40 text-red-300"
                  : "bg-green-500/20 border-green-500/40 text-green-300"
              }`}
            >
              {isMuted ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
              {isMuted ? "Unmute" : "Mute"}
            </Button>
          </div>

          {/* Music Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-200/80 font-medium">Sea Shanties</span>
              <span className="text-amber-200/60 text-sm">{musicVolume}%</span>
            </div>
            <Slider
              value={[musicVolume]}
              onValueChange={handleMusicVolumeChange}
              max={100}
              step={5}
              className="w-full"
              disabled={isMuted}
            />
          </div>

          {/* SFX Volume */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-amber-200/80 font-medium">Ship Sounds</span>
              <span className="text-amber-200/60 text-sm">{sfxVolume}%</span>
            </div>
            <Slider
              value={[sfxVolume]}
              onValueChange={handleSFXVolumeChange}
              max={100}
              step={5}
              className="w-full"
              disabled={isMuted}
            />
          </div>

          {/* Sound Test Buttons */}
          <div className="space-y-2">
            <span className="text-amber-200/80 font-medium">Test Sounds</span>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioManager.playSound("coinCollect")}
                className="bg-yellow-500/20 border-yellow-500/40 text-yellow-300"
                disabled={isMuted}
              >
                🪙 Doubloon
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioManager.playSound("achievement")}
                className="bg-purple-500/20 border-purple-500/40 text-purple-300"
                disabled={isMuted}
              >
                🏴‍☠️ Victory
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioManager.playSound("magicalChime")}
                className="bg-blue-500/20 border-blue-500/40 text-blue-300"
                disabled={isMuted}
              >
                ⚓ Mystical
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => audioManager.playSound("treasureFound")}
                className="bg-orange-500/20 border-orange-500/40 text-orange-300"
                disabled={isMuted}
              >
                💰 Treasure
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// Epic Treasure Found Celebration Component with Pirate Theme
// --- Safe, self-contained celebration component (hotfix) ---
const PirateTreasureCelebration = ({
  reward,
  onClose,
  audioManager,
}: {
  reward: number
  onClose: () => void
  audioManager: PirateAudioManager
}) => {
  const [showConfetti, setShowConfetti] = useState(false)
  const [countdown, setCountdown] = useState(5)
  const [showTips, setShowTips] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem("pm_onboarded")) setShowTips(true)
    } catch {}

    let mounted = true
    setShowConfetti(true)
    try {
      audioManager?.playSound("treasure")
    } catch {}

    const t = setInterval(() => {
      if (!mounted) return
      setCountdown((c) => (c > 0 ? c - 1 : 0))
    }, 1000)

    return () => {
      mounted = false
      clearInterval(t)
    }
  }, [audioManager])

  useEffect(() => {
    if (countdown === 0) onClose()
  }, [countdown, onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      {/* Confetti (placeholder dots) */}
      {showConfetti && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-6 left-1/4 w-2 h-2 rounded-full bg-amber-400 animate-bounce" />
          <div className="absolute top-10 left-2/3 w-2 h-2 rounded-full bg-yellow-300 animate-bounce" />
          <div className="absolute top-20 left-1/2 w-2 h-2 rounded-full bg-orange-400 animate-bounce" />
        </div>
      )}

      <div className="relative w-full max-w-2xl mx-4">
        <div className="rounded-2xl shadow-2xl bg-gradient-to-b from-amber-900/90 to-amber-800/90 border border-amber-600/50 p-6 md:p-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <svg width="36" height="36" viewBox="0 0 24 24" className="text-amber-300">
              <path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4l-6 4l1.5-7.5L2 9h7z" />
            </svg>
            <h2 className="text-2xl md:text-3xl font-bold text-amber-200 tracking-wide">Treasure Found!</h2>
            <svg width="36" height="36" viewBox="0 0 24 24" className="text-amber-300">
              <path fill="currentColor" d="M12 2l3 7h7l-5.5 4.5L18 21l-6-4l-6 4l1.5-7.5L2 9h7z" />
            </svg>
          </div>

          <div className="text-center space-y-4">
            <div className="text-amber-100 opacity-90 text-sm">You’ve uncovered a hidden cache of</div>
            <div className="text-4xl md:text-5xl font-extrabold text-amber-300 drop-shadow">
              {reward.toLocaleString()} Doubloons
            </div>
            <div className="text-amber-200/90">The crew erupts in cheer as the chest swings open!</div>

            <div className="mt-6 flex items-center justify-center gap-3 text-amber-100/90">
              <span className="text-sm opacity-80">Continuing in</span>
              <span className="text-2xl font-bold tabular-nums">{countdown}</span>
              <span className="text-sm opacity-80">seconds…</span>
            </div>

            <button
              onClick={onClose}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition shadow"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Inline Auth Form Component (simple)
function QuestItem({ done, label }: { done: boolean; label: string }) {
  return (
    <div className={"flex items-center gap-2 text-sm " + (done ? "opacity-70 line-through" : "")}>
      <div className={"w-3 h-3 rounded-full " + (done ? "bg-green-500" : "bg-white/20")} />
      <div>{label}</div>
    </div>
  )
}

function AuthForm({
  onSubmit,
  error,
  mode,
  setMode,
}: {
  onSubmit: (email: string, password: string) => void
  error: string | null
  mode: "login" | "signup"
  setMode: (m: "login" | "signup") => void
}) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  return (
    <div className="w-72">
      <div className="text-lg font-semibold mb-2">{mode === "login" ? "Log in" : "Create account"}</div>
      <div className="space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 outline-none"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password (min 6)"
          className="w-full px-3 py-2 rounded bg-white/10 border border-white/20 outline-none"
        />
        {error && <div className="text-red-400 text-sm">{error}</div>}
        <button
          onClick={() => onSubmit(email, password)}
          className="w-full px-3 py-2 rounded bg-amber-600 hover:bg-amber-500 transition"
        >
          {mode === "login" ? "Log in" : "Sign up"}
        </button>
        <button
          onClick={() => setMode(mode === "login" ? "signup" : "login")}
          className="w-full px-3 py-2 rounded bg-white/10 hover:bg-white/20 transition"
        >
          {mode === "login" ? "Need an account? Sign up" : "Have an account? Log in"}
        </button>
      </div>
    </div>
  )
}

// Enhanced terrain types with pirate descriptions (keeping exact same structure)
const terrainTypes = {
  // ── tiles 0–9 ────────────────────────────────────────────────────────────
  grassPlain: {
    name: "Emerald Plains",
    gradient: "from-lime-300 via-green-400 to-emerald-400",
    image: "tile_00.png",
    reward: 0.001,
    rarity: "common",
    description: "Peaceful meadows stretch endlessly",
    glow: "shadow-green-500/50",
    sound: "grass",
  },

  sparseForest: {
    name: "Whispering Woods",
    gradient: "from-emerald-400 via-green-500 to-emerald-600",
    image: "tile_01.png",
    reward: 0.0012,
    rarity: "common",
    description: "Scattered trees stand guard",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  denseForest: {
    name: "Emerald Thicket",
    gradient: "from-green-600 via-emerald-600 to-green-700",
    image: "tile_02.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Thick foliage brims with life",
    glow: "shadow-green-600/50",
    sound: "forest",
  },

  rockyOutcrop: {
    name: "Stone Ridge",
    gradient: "from-gray-400 via-gray-500 to-gray-600",
    image: "tile_03.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Jagged rocks rise from the earth",
    glow: "shadow-gray-500/50",
    sound: "mountain",
  },

  pineHills: {
    name: "Pine Grove",
    gradient: "from-green-500 via-teal-600 to-green-700",
    image: "tile_04.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Tall pines cloak the hillside",
    glow: "shadow-teal-500/50",
    sound: "forest",
  },

  snowPeak: {
    name: "Frostpeak",
    gradient: "from-slate-300 via-gray-400 to-white",
    image: "tile_05.png",
    reward: 0.003,
    rarity: "rare",
    description: "Snow-capped summit touching clouds",
    glow: "shadow-white/50",
    sound: "mountain",
  },

  shallowOcean: {
    name: "Coral Shallows",
    gradient: "from-cyan-300 via-blue-400 to-blue-500",
    image: "tile_06.png",
    reward: 0.001,
    rarity: "common",
    description: "Clear shallows teeming with life",
    glow: "shadow-cyan-500/50",
    sound: "ocean",
  },

  deepOcean: {
    name: "Abyssal Blue",
    gradient: "from-blue-700 via-indigo-800 to-blue-900",
    image: "tile_07.png",
    reward: 0.0008,
    rarity: "uncommon",
    description: "Dark depths hide ancient secrets",
    glow: "shadow-indigo-800/50",
    sound: "ocean",
  },

  sunlitVillage: {
    name: "Sunlit Village",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    image: "tile_08.png",
    reward: 0.0015,
    rarity: "common",
    description: "Homes cluster around a central square",
    glow: "shadow-amber-500/50",
    sound: "grass",
  },

  ruinedKeep: {
    name: "Ruined Keep",
    gradient: "from-gray-600 via-gray-700 to-gray-800",
    image: "tile_09.png",
    reward: 0.0025,
    rarity: "rare",
    description: "Ancient walls stand defiant",
    glow: "shadow-gray-700/50",
    sound: "mountain",
  },
  // ── tiles 10–19 ────────────────────────────────────────────────────────────
  abandonedFortress: {
    name: "Forgotten Fortress",
    gradient: "from-gray-600 via-gray-700 to-gray-800",
    image: "tile_10.png",
    reward: 0.0025,
    rarity: "rare",
    description: "Ancient stones hold forgotten tales",
    glow: "shadow-gray-700/50",
    sound: "mountain",
  },

  goldenWheatfields: {
    name: "Golden Wheatfields",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_11.png",
    reward: 0.0013,
    rarity: "common",
    description: "Endless stalks sway in the breeze",
    glow: "shadow-amber-500/50",
    sound: "grass",
  },

  forestClearing: {
    name: "Forest Clearing",
    gradient: "from-teal-400 via-green-500 to-emerald-500",
    image: "tile_12.png",
    reward: 0.0015,
    rarity: "common",
    description: "Sunlight filters through treetops",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  mistyMarsh: {
    name: "Misty Marsh",
    gradient: "from-green-200 via-lime-300 to-green-400",
    image: "tile_13.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Murky waters brim with life",
    glow: "shadow-lime-500/50",
    sound: "ocean",
  },

  sunnyMeadow: {
    name: "Sunny Meadow",
    gradient: "from-green-200 via-lime-300 to-emerald-300",
    image: "tile_14.png",
    reward: 0.001,
    rarity: "common",
    description: "Soft grass basks under the sun",
    glow: "shadow-lime-500/50",
    sound: "grass",
  },

  wildHeath: {
    name: "Wild Heath",
    gradient: "from-green-600 via-lime-500 to-green-700",
    image: "tile_15.png",
    reward: 0.0012,
    rarity: "common",
    description: "Thickets of tall grass and shrubs",
    glow: "shadow-green-600/50",
    sound: "grass",
  },

  snowfield: {
    name: "Snowfield",
    gradient: "from-slate-100 via-slate-200 to-white",
    image: "tile_16.png",
    reward: 0.0008,
    rarity: "common",
    description: "A blanket of untouched snow",
    glow: "shadow-white/50",
    sound: "mountain",
  },

  frostedGrove: {
    name: "Frosted Grove",
    gradient: "from-teal-100 via-slate-200 to-white",
    image: "tile_17.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Snow-kissed pines stand tall",
    glow: "shadow-cyan-500/50",
    sound: "forest",
  },

  winterwood: {
    name: "Winterwood",
    gradient: "from-green-500 via-slate-400 to-white",
    image: "tile_18.png",
    reward: 0.002,
    rarity: "rare",
    description: "Dense evergreens draped in snow",
    glow: "shadow-green-500/50",
    sound: "forest",
  },

  frozenCrag: {
    name: "Frozen Crag",
    gradient: "from-slate-400 via-gray-500 to-slate-600",
    image: "tile_19.png",
    reward: 0.0022,
    rarity: "uncommon",
    description: "Icy rocks jut from the earth",
    glow: "shadow-gray-500/50",
    sound: "mountain",
  },
  // ── tiles 20–29 ────────────────────────────────────────────────────────────
  crystalGlade: {
    name: "Crystal Glade",
    gradient: "from-cyan-100 via-white to-slate-200",
    image: "tile_20.png",
    reward: 0.002,
    rarity: "rare",
    description: "Sunlight glimmers on icy branches",
    glow: "shadow-cyan-200/50",
    sound: "magicalChime",
  },

  iceFloe: {
    name: "Ice Floe",
    gradient: "from-cyan-200 via-blue-300 to-white",
    image: "tile_21.png",
    reward: 0.001,
    rarity: "common",
    description: "Chunks drift across frigid waters",
    glow: "shadow-blue-300/50",
    sound: "ocean",
  },

  winterHamlet: {
    name: "Winter Hamlet",
    gradient: "from-gray-300 via-slate-400 to-white",
    image: "tile_22.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Cozy homes blanketed in snow",
    glow: "shadow-slate-400/50",
    sound: "grass",
  },

  winterCitadel: {
    name: "Winter Citadel",
    gradient: "from-red-600 via-gray-700 to-white",
    image: "tile_23.png",
    reward: 0.003,
    rarity: "rare",
    description: "Frozen ramparts protect ancient halls",
    glow: "shadow-red-600/50",
    sound: "mountain",
  },

  sandSea: {
    name: "Sand Sea",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_24.png",
    reward: 0.001,
    rarity: "common",
    description: "Shifting sands under a blazing sun",
    glow: "shadow-yellow-500/50",
    sound: "desert",
  },

  desertBasin: {
    name: "Desert Basin",
    gradient: "from-amber-300 via-orange-400 to-orange-500",
    image: "tile_25.png",
    reward: 0.0012,
    rarity: "common",
    description: "Cracked pits that hold rare rain",
    glow: "shadow-amber-500/50",
    sound: "desert",
  },

  rollingDunes: {
    name: "Rolling Dunes",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    image: "tile_26.png",
    reward: 0.0011,
    rarity: "common",
    description: "Wind-sculpted waves of golden sand",
    glow: "shadow-yellow-500/50",
    sound: "desert",
  },

  scarletMesa: {
    name: "Scarlet Mesa",
    gradient: "from-orange-600 via-red-500 to-orange-700",
    image: "tile_27.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Sheer cliffs of red rock",
    glow: "shadow-red-500/50",
    sound: "mountain",
  },

  hiddenSpring: {
    name: "Hidden Spring",
    gradient: "from-green-300 via-teal-400 to-cyan-400",
    image: "tile_28.png",
    reward: 0.0022,
    rarity: "uncommon",
    description: "A secret pond nourished by clear waters",
    glow: "shadow-green-500/50",
    sound: "ocean",
  },

  mirageOasis: {
    name: "Mirage Oasis",
    gradient: "from-yellow-300 via-amber-400 to-orange-500",
    image: "tile_29.png",
    reward: 0.0025,
    rarity: "rare",
    description: "A shimmering pool in scorching sands",
    glow: "shadow-amber-500/80",
    sound: "magicalChime",
  },
  // ────────────────────────────────────────────────────────────────────────────
  // ── tiles 30, 31, 32, 36–40 ────────────────────────────────────────────────

  coastalVillage: {
    name: "Coastal Village",
    gradient: "from-yellow-300 via-amber-400 to-orange-400",
    image: "tile_30.png",
    reward: 0.0015,
    rarity: "common",
    description: "Whitewashed homes by the azure sea",
    glow: "shadow-amber-500/50",
    sound: "ocean",
  },

  frostholdOutpost: {
    name: "Frosthold Outpost",
    gradient: "from-slate-200 via-slate-400 to-white",
    image: "tile_31.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "A snowy bastion guarding the shore",
    glow: "shadow-gray-400/50",
    sound: "mountain",
  },

  primevalForest: {
    name: "Primeval Forest",
    gradient: "from-green-600 via-emerald-600 to-green-700",
    image: "tile_32.png",
    reward: 0.0015,
    rarity: "uncommon",
    description: "Ancient trees cloaked in mystery",
    glow: "shadow-green-600/50",
    sound: "forest",
  },

  harborVillage: {
    name: "Harbor Village",
    gradient: "from-cyan-300 via-blue-400 to-blue-500",
    image: "tile_36.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Colorful boats bobbing in sheltered waters",
    glow: "shadow-blue-400/50",
    sound: "ocean",
  },

  twinHarbors: {
    name: "Twin Harbors",
    gradient: "from-cyan-400 via-blue-500 to-indigo-600",
    image: "tile_37.png",
    reward: 0.0018,
    rarity: "uncommon",
    description: "Two ports linked by rugged coastline",
    glow: "shadow-indigo-500/50",
    sound: "ocean",
  },

  lighthouseIsle: {
    name: "Lighthouse Isle",
    gradient: "from-orange-300 via-yellow-400 to-white",
    image: "tile_38.png",
    reward: 0.002,
    rarity: "rare",
    description: "Beacon shining across storm-tossed waves",
    glow: "shadow-yellow-500/50",
    sound: "ocean",
  },

  volcanicShrine: {
    name: "Volcanic Shrine",
    gradient: "from-red-600 via-orange-600 to-red-700",
    image: "tile_39.png",
    reward: 0.003,
    rarity: "rare",
    description: "Ancient stones warmed by flowing magma",
    glow: "shadow-red-600/50",
    sound: "mountain",
  },

  hauntedRuins: {
    name: "Haunted Ruins",
    gradient: "from-green-200 via-gray-400 to-slate-500",
    image: "tile_40.png",
    reward: 0.002,
    rarity: "uncommon",
    description: "Echoes of a civilization long lost",
    glow: "shadow-gray-400/50",
    sound: "mountain",
  },

  // Tiles used for default states
  unexplored: {
    name: "Uncharted Waters",
    gradient: "from-gray-700 via-gray-800 to-gray-900",
    image: "tile_07.png",
    reward: 0,
    rarity: "unknown",
    description: "These waters have yet to be sailed",
    glow: "shadow-gray-700/50",
    sound: "sail",
  },

  treasure: {
    name: "Pirate's Bounty",
    gradient: "from-yellow-200 via-yellow-400 to-amber-500",
    image: "elDorado.png",
    reward: 0.005,
    rarity: "legendary",
    description: "A chest of gleaming doubloons",
    glow: "shadow-yellow-400/80",
    sound: "treasure",
  },
}

// Map generic terrain categories to specific tile keys
const terrainCategories = {
  grass: ["grassPlain", "sunnyMeadow", "wildHeath", "goldenWheatfields"],
  forest: ["sparseForest", "denseForest", "pineHills", "primevalForest", "forestClearing"],
  desert: ["sandSea", "desertBasin", "rollingDunes", "scarletMesa", "mirageOasis"],
  ocean: ["shallowOcean", "deepOcean"],
  lake: ["hiddenSpring", "iceFloe"],
  mountain: ["rockyOutcrop", "snowPeak", "winterwood", "frozenCrag", "volcanicShrine", "winterCitadel"],
  treasure: ["treasure"],
} as const

const getTerrainByCategory = (category: keyof typeof terrainCategories) => {
  const options = terrainCategories[category]
  return options[Math.floor(Math.random() * options.length)]
}

const terrainCategoryLookup: Record<string, keyof typeof terrainCategories> = {}
Object.entries(terrainCategories).forEach(([category, tiles]) => {
  ;(tiles as readonly string[]).forEach((tile) => {
    terrainCategoryLookup[tile] = category as keyof typeof terrainCategories
  })
})
terrainCategoryLookup["harborVillage"] = "ocean"
terrainCategoryLookup["twinHarbors"] = "ocean"

const getMapNeighbors = (row: number, col: number, map: string[][]) => {
  const neighbors: { row: number; col: number }[] = []
  const isEvenRow = row % 2 === 0
  const evenRowOffsets = [
    [-1, -1],
    [-1, 0],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
  ]
  const oddRowOffsets = [
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, 0],
    [1, 1],
  ]
  const offsets = isEvenRow ? evenRowOffsets : oddRowOffsets
  offsets.forEach(([dr, dc]) => {
    const newRow = row + dr
    const newCol = col + dc
    if (newRow >= 0 && newRow < map.length && newCol >= 0 && newCol < map[newRow].length) {
      neighbors.push({ row: newRow, col: newCol })
    }
  })
  return neighbors
}

const chooseTerrain = (row: number, col: number, map: string[][]) => {
  if (Math.random() < 0.01) {
    return getTerrainByCategory("treasure")
  }
  const weights: Record<keyof typeof terrainCategories, number> = {
    grass: 3,
    forest: 2,
    desert: 2,
    ocean: 1,
    lake: 1,
    mountain: 1,
    treasure: 0,
  }
  const neighbors = getMapNeighbors(row, col, map)
  neighbors.forEach(({ row: nRow, col: nCol }) => {
    const terrain = map[nRow][nCol]
    const category = terrainCategoryLookup[terrain]
    if (category) {
      weights[category] += 3
    }
  })
  const categories = Object.keys(weights) as (keyof typeof terrainCategories)[]
  const total = categories.reduce((sum, key) => sum + weights[key], 0)
  let r = Math.random() * total
  for (const cat of categories) {
    r -= weights[cat]
    if (r <= 0) {
      return getTerrainByCategory(cat)
    }
  }
  return getTerrainByCategory("grass")
}

const getClimateZone = (row: number, rows: number) => {
  const mid = (rows - 1) / 2
  const dist = Math.abs(row - mid) / mid // 0 at equator, 1 at poles
  if (dist > 0.8) return "snow"
  if (dist > 0.55) return "temperate"
  if (dist > 0.25) return "desert"
  return "tropical"
}

const chooseLandTerrainForZone = (zone: string) => {
  const zoneCategories: Record<string, (keyof typeof terrainCategories)[]> = {
    snow: ["mountain", "lake", "forest"],
    temperate: ["grass", "forest", "mountain"],
    desert: ["desert", "grass"],
    tropical: ["forest", "grass", "mountain"],
  }
  const cats = zoneCategories[zone] || ["grass"]
  const cat = cats[Math.floor(Math.random() * cats.length)]
  return getTerrainByCategory(cat)
}

const generateTerrainMap = (rows: number, cols: number) => {
  const map: string[][] = []
  const zones: string[][] = []
  const resources: (string | null)[][] = []

  // Fill the map with deep ocean tiles first
  for (let row = 0; row < rows; row++) {
    const rowTerrains: string[] = []
    const rowZones: string[] = []
    const rowResources: (string | null)[] = []
    const colsInRow = row % 2 === 0 ? cols : cols - 1
    for (let col = 0; col < colsInRow; col++) {
      rowTerrains.push("deepOcean")
      rowZones.push("ocean")
      rowResources.push(null)
    }
    map.push(rowTerrains)
    zones.push(rowZones)
    resources.push(rowResources)
  }

  const totalCells = map.reduce((sum, r) => sum + r.length, 0)
  const targetLand = Math.floor(totalCells * 0.2) // 20% land

  const allCells: { row: number; col: number }[] = []
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1
    for (let col = 0; col < colsInRow; col++) {
      allCells.push({ row, col })
    }
  }
  for (let i = allCells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[allCells[i], allCells[j]] = [allCells[j], allCells[i]]
  }

  let placed = 0
  for (const { row, col } of allCells) {
    if (placed >= targetLand) break
    const neighbors = getMapNeighbors(row, col, map)
    const hasLand = neighbors.some((n) => terrainCategoryLookup[map[n.row][n.col]] !== "ocean")
    if (hasLand) continue

    const zone = getClimateZone(row, rows)
    zones[row][col] = zone
    map[row][col] = chooseLandTerrainForZone(zone)
    placed++
  }

  const maxHarbors = Math.max(1, Math.floor(totalCells / 100))
  let harborCount = 0
  let twinCount = 0
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1
    for (let col = 0; col < colsInRow; col++) {
      if (terrainCategoryLookup[map[row][col]] !== "ocean") continue

      if (
        harborCount < maxHarbors &&
        col > 0 &&
        terrainCategoryLookup[map[row][col - 1]] !== "ocean" &&
        Math.random() < 0.02
      ) {
        map[row][col] = "harborVillage"
        harborCount++
        continue
      }

      if (
        twinCount < maxHarbors &&
        col < colsInRow - 1 &&
        terrainCategoryLookup[map[row][col + 1]] !== "ocean" &&
        Math.random() < 0.02
      ) {
        map[row][col] = "twinHarbors"
        twinCount++
      }
    }
  }

  // Coral shallows generation around islands
  for (let row = 0; row < rows; row++) {
    const colsInRow = row % 2 === 0 ? cols : cols - 1
    for (let col = 0; col < colsInRow; col++) {
      if (map[row][col] !== "deepOcean") continue
      const neighbors = getMapNeighbors(row, col, map)
      const hasLand = neighbors.some((n) => terrainCategoryLookup[map[n.row][n.col]] !== "ocean")
      const hasDeep = neighbors.some((n) => map[n.row][n.col] === "deepOcean")
      const shallowNeighbors = neighbors.filter((n) => map[n.row][n.col] === "shallowOcean").length
      if (hasLand && hasDeep && shallowNeighbors === 0) {
        map[row][col] = "shallowOcean"
      }
    }
  }

  // Resource placement
  const resourceTypes = ["whales.png", "goldOre.png", "pearls.png", "gems.png", "sugar.png", "spices.png", "silver.png"]
  const resourcesToPlace = Math.floor(Math.random() * 5)
  for (let r = 0; r < resourcesToPlace; r++) {
    const res = resourceTypes[Math.floor(Math.random() * resourceTypes.length)]
    const candidates: { row: number; col: number }[] = []
    for (let row = 0; row < rows; row++) {
      const colsInRow = row % 2 === 0 ? cols : cols - 1
      for (let col = 0; col < colsInRow; col++) {
        if (resources[row][col] || map[row][col] === "treasure") continue
        const zone = zones[row][col]
        const terrain = map[row][col]
        const cat = terrainCategoryLookup[terrain]
        const isLand = cat !== "ocean" && cat !== "lake"

        const valid =
          (res === "whales.png" && cat === "ocean") ||
          (res === "goldOre.png" && isLand && (zone === "desert" || zone === "snow")) ||
          (res === "pearls.png" && terrain === "shallowOcean") ||
          (res === "gems.png" && isLand && zone === "tropical") ||
          (res === "sugar.png" && isLand && zone === "tropical") ||
          (res === "spices.png" && isLand && zone === "tropical") ||
          (res === "silver.png" && isLand && (zone === "snow" || cat === "mountain"))

        if (valid) candidates.push({ row, col })
      }
    }

    if (candidates.length) {
      const choice = candidates[Math.floor(Math.random() * candidates.length)]
      resources[choice.row][choice.col] = res
    }
  }
  // ── GUARANTEE AT LEAST ONE OF EACH RESOURCE ────────────────────────────────
  {
    const guaranteeTypes = [
      "whales.png",
      "goldOre.png",
      "pearls.png",
      "gems.png",
      "sugar.png",
      "spices.png",
      "silver.png",
    ]

    for (const res of guaranteeTypes) {
      // skip if already placed
      if (resources.flat().includes(res)) continue

      // find all valid spots
      const validCandidates: { row: number; col: number }[] = []
      for (let row = 0; row < rows; row++) {
        const colsInRow = row % 2 === 0 ? cols : cols - 1
        for (let col = 0; col < colsInRow; col++) {
          if (resources[row][col] != null || map[row][col] === "treasure") continue
          const zone = zones[row][col]
          const terrain = map[row][col]
          const cat = terrainCategoryLookup[terrain]
          const isLand = cat !== "ocean" && cat !== "lake"

          const valid =
            (res === "whales.png" && cat === "ocean") ||
            (res === "goldOre.png" && isLand && (zone === "desert" || zone === "snow")) ||
            (res === "pearls.png" && terrain === "shallowOcean") ||
            (res === "gems.png" && isLand && zone === "tropical") ||
            (res === "sugar.png" && isLand && zone === "tropical") ||
            (res === "spices.png" && isLand && zone === "tropical") ||
            (res === "silver.png" && isLand && (zone === "snow" || cat === "mountain"))

          if (valid) validCandidates.push({ row, col })
        }
      }

      // plant one if possible
      if (validCandidates.length) {
        const pick = validCandidates[Math.floor(Math.random() * validCandidates.length)]
        resources[pick.row][pick.col] = res
      }
    }
  }
  // ────────────────────────────────────────────────────────────────────────────

  // ─── Guarantee at least one treasure tile ───────────────────────────────────
  {
    const landCells: { row: number; col: number }[] = []
    for (let row = 0; row < map.length; row++) {
      for (let col = 0; col < map[row].length; col++) {
        if (terrainCategoryLookup[map[row][col]] !== "ocean") {
          landCells.push({ row, col })
        }
      }
    }
    if (landCells.length) {
      const pick = landCells[Math.floor(Math.random() * landCells.length)]
      map[pick.row][pick.col] = "treasure"
      resources[pick.row][pick.col] = null
    }
  }
  // ────────────────────────────────────────────────────────────────────────────
  return { terrain: map, resources, zones }
}

// Hexagonal grid utilities
const getHexPosition = (q: number, r: number, hexSize: number) => {
  const x = hexSize * ((3 / 2) * q)
  const y = hexSize * ((Math.sqrt(3) / 2) * q + Math.sqrt(3) * r)
  return { x, y }
}

const getHexNeighborsAxial = (q: number, r: number) => {
  const directions = [
    [+1, 0],
    [+1, -1],
    [0, -1],
    [-1, 0],
    [-1, +1],
    [0, +1],
  ]
  return directions.map(([dq, dr]) => ({ q: q + dq, r: r + dr }))
}

// Convert axial coordinates to array indices for storage
const axialToIndex = (q: number, r: number, radius: number) => {
  return `${q},${r}`
}

// Generate hexagonal grid with proper axial coordinates

function startNextRound() {
  try {
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768
    const maxRadius = isMobile ? 6 : 7
    // This function will be properly implemented when called from within the component
  } catch {}
}

const generateHexGrid = () => {
  const radius = 4 // Grid radius (creates a roughly circular map)
  const hexSize = 52
  const { terrain: terrainMap, resources: resourceMap } = generateTerrainMap(radius * 2 + 1, radius * 2 + 1)

  // Create a map to store hex tiles by their axial coordinates
  const hexMap = new Map()
  const hexArray = []

  // Generate hexes in a hexagonal pattern
  for (let q = -radius; q <= radius; q++) {
    const r1 = Math.max(-radius, -q - radius)
    const r2 = Math.min(radius, -q + radius)

    for (let r = r1; r <= r2; r++) {
      const position = getHexPosition(q, r, hexSize)
      const index = hexArray.length

      // Convert axial to offset coordinates for terrain lookup
      const col = q + Math.floor((r + (r & 1)) / 2) + radius
      const row = r + radius

      const terrainKey =
        terrainMap[Math.min(row, terrainMap.length - 1)]?.[Math.min(col, terrainMap[0]?.length - 1)] || "deepOcean"
      const resourceKey =
        resourceMap[Math.min(row, resourceMap.length - 1)]?.[Math.min(col, terrainMap[0]?.length - 1)] || null

      const hex = {
        id: `${q}-${r}`,
        q,
        r,
        index,
        x: position.x,
        y: position.y,
        terrain: "unexplored",
        hiddenTerrain: terrainKey,
        hiddenResource: resourceKey,
        resource: null,
        explored: false,
        isAdjacent: false,
        discoveredAt: null,
      }

      hexMap.set(axialToIndex(q, r, radius), hex)
      hexArray.push(hex)
    }
  }

  // Set starting position (center of the map)
  const centerHex = hexMap.get(axialToIndex(0, 0, radius))
  if (centerHex) {
    centerHex.terrain = centerHex.hiddenTerrain
    centerHex.resource = centerHex.hiddenResource
    centerHex.explored = true

    // Set adjacent hexes
    const neighbors = getHexNeighborsAxial(0, 0)
    neighbors.forEach(({ q, r }) => {
      const neighbor = hexMap.get(axialToIndex(q, r, radius))
      if (neighbor) {
        neighbor.isAdjacent = true
      }
    })
  }

  return { hexArray, hexMap, radius, hexSize }
}

// Enhanced pirate leaderboard with more personality
const pirateLeaderboard = [
  {
    rank: 1,
    player: "BlackbeardCrypto",
    address: "0x1234...5678",
    treasure: "Round #42",
    reward: "2500 Gold",
    time: "2 days ago",
    avatar: "🏴‍☠️",
    level: 15,
    title: "Pirate King",
  },
  {
    rank: 2,
    player: "RedMaryTreasure",
    address: "0x8765...4321",
    treasure: "Round #41",
    reward: "2100 Gold",
    time: "5 days ago",
    avatar: "👑",
    level: 12,
    title: "Pirate Lord",
  },
  {
    rank: 3,
    player: "CaptainGoldbeard",
    address: "0x9876...1234",
    treasure: "Round #40",
    reward: "1800 Gold",
    time: "1 week ago",
    avatar: "⚓",
    level: 10,
    title: "Sea Captain",
  },
  {
    rank: 4,
    player: "BuccaneerBob",
    address: "0x5432...8765",
    treasure: "Round #39",
    reward: "1500 Gold",
    time: "2 weeks ago",
    avatar: "⭐",
    level: 8,
    title: "Buccaneer",
  },
  {
    rank: 5,
    player: "SailorSally",
    address: "0x2468...1357",
    treasure: "Round #38",
    reward: "1200 Gold",
    time: "3 weeks ago",
    avatar: "💎",
    level: 7,
    title: "First Mate",
  },
]

// Pirate rank system based on Gold holdings
const getPirateRank = (level: number) => {
  if (level >= 20) return { title: "Pirate King", icon: "👑", color: "text-yellow-400" }
  if (level >= 15) return { title: "Pirate Lord", icon: "🏴‍☠️", color: "text-purple-400" }
  if (level >= 10) return { title: "Sea Captain", icon: "⚓", color: "text-blue-400" }
  if (level >= 5) return { title: "Buccaneer", icon: "⚔️", color: "text-red-400" }
  return { title: "Sailor", icon: "🌊", color: "text-cyan-400" }
}

export default function PirateMapGame() {
  const [gridData, setGridData] = useState(() => generateHexGrid())
  const [currentPosition, setCurrentPosition] = useState({ q: 0, r: 0 })
  const [exploredTiles, setExploredTiles] = useState(1)
  const [totalRewards, setTotalRewards] = useState(0)
  const [discoveryLog, setDiscoveryLog] = useState<string[]>([
    "🏴‍☠️ A new adventure begins...",
    "🗺️ Charting the unknown seas.",
  ])
  const [playerId] = useState(() => {
    if (typeof window === "undefined") return "guest"
    const ex = localStorage.getItem("playerId")
    if (ex) return ex
    const id = crypto && "randomUUID" in crypto ? (crypto as any).randomUUID() : Math.random().toString(36).slice(2)
    localStorage.setItem("playerId", id)
    return id
  })

  const startNextRound = useCallback(() => {
    try {
      const isMobile = typeof window !== "undefined" && window.innerWidth < 768
      const maxRadius = isMobile ? 6 : 7
      const nextRadius = Math.min(maxRadius, gridData.radius + 1)

      // Generate new grid with increased radius
      const newGridData = generateHexGrid()
      setGridData(newGridData)
    } catch {}
  }, [gridData.radius])

  // --- Auth state (Phase 6) ---
  const [user, setUser] = useState<{ id: string; email: string } | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [authMode, setAuthMode] = useState<"login" | "signup">("login")

  async function fetchMe() {
    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" })
      const data = await res.json()
      setUser(data.user)
    } catch {}
  }

  async function submitAuth(email: string, password: string) {
    setAuthError(null)
    const url = authMode === "login" ? "/api/auth/login" : "/api/auth/signup"
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    if (!res.ok) {
      setAuthError(data?.error ?? "Authentication failed")
      return
    }
    await fetchMe()
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" })
    await fetchMe()
  }

  // === Metrics & Quests (Phase 8) ===
  type Summary = { earnedToday: number; sailCount: number; treasureCount: number; cap: number; streak: number }
  const [summary, setSummary] = useState<Summary | null>(null)

  async function refreshCollections() {
    try {
      const params = !user ? `?playerId=${playerId}` : ""
      const res = await fetch(`/api/collections${params}`, { cache: "no-store" })
      const data = await res.json()
      if (data?.items) setCollections(data.items)
      if (typeof data?.spiceSet === "boolean") setSpiceSet(!!data.spiceSet)
    } catch {}
  }

  async function checkYesterdaySummary() {
    try {
      const params = !user ? `?playerId=${playerId}` : ""
      const res = await fetch(`/api/summary/yesterday${params}`, { cache: "no-store" })
      if (!res.ok) return
      const data = await res.json()
      if (!data?.date) return
      const key = `pm_summary_seen_${data.date}`
      if (
        typeof window !== "undefined" &&
        !localStorage.getItem(key) &&
        (data.earned > 0 || data.questsCompleted > 0)
      ) {
        setYesterdaySummary(data)
        setSummaryModalOpen(true)
        try {
          localStorage.setItem(key, "1")
        } catch {}
      }
    } catch {}
  }

  async function refreshQuests() {
    try {
      const params = !user ? `?playerId=${playerId}` : ""
      const res = await fetch(`/api/quests/today${params}`, { cache: "no-store" })
      const data = await res.json()
      if (data?.quests) setQuests(data.quests)
    } catch (e) {}
  }

  async function refreshSummary() {
    try {
      const params = !user ? `?playerId=${playerId}` : ""
      const res = await fetch(`/api/metrics/summary${params}`, { cache: "no-store" })
      if (res.ok) {
        const data: Summary = await res.json()
        setSummary(data)
      }
    } catch (e) {
      console.error("summary fetch failed", e)
    }
  }

  useEffect(() => {
    refreshSummary()
    refreshQuests()
    refreshCollections()
    checkYesterdaySummary()
    const t = setInterval(() => {
      refreshSummary()
      refreshQuests()
      refreshCollections()
    }, 5000)
    return () => clearInterval(t)
  }, [playerId, user])
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false)
  const [isQuestsOpen, setIsQuestsOpen] = useState(false)
  const [isCollectionsOpen, setIsCollectionsOpen] = useState(false)
  const [collections, setCollections] = useState<{ [k: string]: number }>({})
  const [spiceSet, setSpiceSet] = useState(false)
  const [summaryModalOpen, setSummaryModalOpen] = useState(false)
  const [yesterdaySummary, setYesterdaySummary] = useState<any>(null)
  const [quests, setQuests] = useState<any[]>([])
  const [showTips, setShowTips] = useState(false)
  const [isSailing, setIsSailing] = useState(false)
  const [streak, setStreak] = useState(0)
  const [level, setLevel] = useState(1)
  const [experience, setExperience] = useState(0)
  const [showTreasureFound, setShowTreasureFound] = useState(false)
  const [treasureReward, setTreasureReward] = useState(0)
  const [dropBanner, setDropBanner] = useState<string | null>(null)
  const [lastDelta, setLastDelta] = useState<number>(0)
  const [bottleClues, setBottleClues] = useState<string[]>([])
  const [goldBalance, setGoldBalance] = useState<number>(0)
  const [isLoadingBalance, setIsLoadingBalance] = useState(false)
  const [balanceError, setBalanceError] = useState<string | null>(null)
  // Pirate Audio Manager
  const audioManagerRef = useRef<PirateAudioManager | null>(null)

  useEffect(() => {
    audioManagerRef.current = new PirateAudioManager()

    // Start background music after a short delay
    const musicTimer = setTimeout(() => {
      audioManagerRef.current?.playBackgroundMusic()
    }, 1000)

    return () => {
      clearTimeout(musicTimer)
      audioManagerRef.current?.stopBackgroundMusic()
    }
  }, [])

  // Level tied to total Gold holdings
  const getLevelFromTreasure = (trez: number) => {
    if (trez >= 1_000_000) return 20
    if (trez >= 100_000) return 15
    if (trez >= 10_000) return 10
    if (trez >= 1_000) return 5
    return 1
  }

  useEffect(() => {
    setExperience(totalRewards)
    const newLevel = getLevelFromTreasure(totalRewards)
    if (newLevel > level) {
      audioManagerRef.current?.playSound("levelUp")
    }
    setLevel(newLevel)
  }, [totalRewards])

  // Bottle clue system
  const generateBottleClue = () => {
    const clues = [
      "🍾 A floating bottle whispers: 'The treasure lies where the sun sets...'",
      "🍾 Message in a bottle: 'Seek ye the darkest waters for golden rewards...'",
      "🍾 Ancient bottle reveals: 'Where two currents meet, fortune awaits...'",
      "🍾 Mysterious bottle: 'The kraken guards what ye seek most...'",
      "🍾 Weathered bottle says: 'Follow the lighthouse beam to riches...'",
    ]

    if (Math.random() < 0.15) {
      // 15% chance
      const clue = clues[Math.floor(Math.random() * clues.length)]
      setBottleClues((prev) => [clue, ...prev.slice(0, 2)])
      audioManagerRef.current?.playSound("bottleClue")
    }
  }

  const getHexNeighbors = (q: number, r: number) => {
    return getHexNeighborsAxial(q, r)
  }

  const sailToTile = async (q: number, r: number) => {
    const targetHex = gridData.hexMap.get(axialToIndex(q, r, gridData.radius))
    if (!targetHex || !targetHex.isAdjacent || targetHex.explored || isSailing) return

    // Signed move token + (optional) captcha
    const moveToken = await getMoveToken(q, r)
    const captchaToken = await getCaptchaToken()

    // Play sailing sound
    audioManagerRef.current?.playSound("sail")
    audioManagerRef.current?.playSound("splash", 0.4)

    setIsSailing(true)
    await new Promise((resolve) => setTimeout(resolve, 850))

    const newTerrain = targetHex.hiddenTerrain
    const terrain = terrainTypes[newTerrain as keyof typeof terrainTypes] || terrainTypes.unexplored

    // Update the hex
    targetHex.terrain = newTerrain
    targetHex.resource = targetHex.hiddenResource
    targetHex.explored = true
    targetHex.isAdjacent = false
    targetHex.discoveredAt = new Date()

    // Update neighbors
    const neighbors = getHexNeighbors(q, r)
    neighbors.forEach(({ q: nq, r: nr }) => {
      const neighbor = gridData.hexMap.get(axialToIndex(nq, nr, gridData.radius))
      if (neighbor && !neighbor.explored) {
        neighbor.isAdjacent = true
      }
    })

    // Force re-render
    setGridData({ ...gridData })
    setCurrentPosition({ q, r })
    setExploredTiles((prev) => prev + 1)

    // Rest of the sailing logic remains the same...
    let tokenReward = Math.floor(10 + Math.random() * 91)
    let bigReward = 0
    const _sail = await creditRewardAuthoritative("sail", { moveToken, captchaToken })
    tokenReward = _sail.amountGranted
    setLastDelta(tokenReward || 0)
    if (_sail?.quests) setQuests(_sail.quests)
    if (_sail?.itemDrop) setDropBanner(`You found a collectible: ${_sail.itemDrop}!`)

    setTotalRewards((prev) => prev + tokenReward)

    // Play terrain-specific sound
    if (terrain.sound) {
      audioManagerRef.current?.playSound(terrain.sound, 0.6)
    }

    audioManagerRef.current?.playSound("coinCollect", 0.5)
    setStreak((prev) => prev + 1)
    generateBottleClue()

    // Check if treasure was found
    if (newTerrain === "treasure") {
      bigReward = Math.floor(1000 + Math.random() * 9001)
      const _trez = await creditRewardAuthoritative("treasure", { moveToken, captchaToken })
      setLastDelta(_trez.amountGranted || 0)
      if (_trez?.quests) setQuests(_trez.quests)
      if (_trez?.itemDrop) setDropBanner(`You found a collectible: ${_trez.itemDrop}!`)
      bigReward = _trez.amountGranted
      setTreasureReward(bigReward)
      setTotalRewards((prev) => prev + bigReward)
      setShowTreasureFound(true)
    }

    const logMessage =
      newTerrain === "treasure"
        ? `🏴‍☠️ LEGENDARY PIRATE'S BOUNTY DISCOVERED! ${bigReward} Gold found in the ${terrain.name}! Shiver me timbers! 🏴‍☠️`
        : `🪙 Ye've plundered ${tokenReward} Gold from the mystical ${terrain.name}, ye savvy sailor!`

    setDiscoveryLog((prev) => [logMessage, ...prev.slice(0, 4)])
    setIsSailing(false)
  }

  const sailToAdjacentWaters = async () => {
    const adjacentHexes = gridData.hexArray.filter((hex) => hex.isAdjacent && !hex.explored)
    if (adjacentHexes.length === 0) return
    const randomHex = adjacentHexes[Math.floor(Math.random() * adjacentHexes.length)]
    await sailToTile(randomHex.q, randomHex.r)
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case "legendary":
        return "text-amber-400"
      case "rare":
        return "text-purple-400"
      case "uncommon":
        return "text-blue-400"
      default:
        return "text-gray-400"
    }
  }

  const handleButtonClick = useCallback(() => {
    audioManagerRef.current?.playSound("buttonClick")
  }, [])

  const handleButtonHover = useCallback(() => {
    audioManagerRef.current?.playSound("buttonHover", 0.3)
  }, [])

  const currentRank = getPirateRank(level)

  useEffect(() => {
    /* web2: removed balance polling */
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 relative overflow-hidden">
      {/* Enhanced animated background with ocean theme */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/10 to-transparent"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-gradient-to-br from-amber-400/10 to-orange-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-br from-emerald-400/10 to-teal-500/10 rounded-full blur-3xl animate-pulse delay-500"></div>

        {/* Floating particles (like sea spray) */}
        <div className="absolute inset-0">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-cyan-300/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Ultra-modern pirate navigation */}
      <nav className="relative z-10 bg-black/20 backdrop-blur-2xl border-b border-amber-600/20 shadow-2xl">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center h-24">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img src="/piratemaplogo.png" alt="PirateMap Logo" className="w-14 h-14 animate-bounce" />
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full animate-ping"></div>
              </div>
              <div>
                <h1 className="text-4xl font-black bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  PirateMap.io
                </h1>
                <p className="text-amber-200/60 text-sm font-medium tracking-wider">SAIL • DISCOVER • PLUNDER</p>
              </div>
            </div>

            <div className="flex items-center space-x-6">
              <div className="flex items-center space-x-2 bg-gradient-to-r from-amber-600/20 via-orange-500/20 to-red-500/20 px-4 py-2 rounded-xl border border-amber-400/40 backdrop-blur-sm shadow-lg">
                <Coins className="w-5 h-5 text-amber-400" />
                <div className="text-center">
                  <span className="text-lg font-bold text-amber-400">{goldBalance.toLocaleString()}</span>
                  <span className="text-sm font-medium text-amber-300 ml-1">Gold</span>
                </div>
              </div>

              {/* Daily Quests Button */}
              <Button
                className="bg-gradient-to-r from-emerald-600/20 to-teal-500/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 backdrop-blur-sm transition-all duration-300 hover:scale-105 px-4 py-3"
                onClick={() => {
                  handleButtonClick()
                  setIsQuestsOpen(true)
                }}
                onMouseEnter={handleButtonHover}
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Daily Quests
              </Button>

              <div className="hidden lg:flex items-center space-x-4 text-amber-200/80">
                <div className="flex items-center space-x-2 bg-amber-900/20 px-4 py-2 rounded-full backdrop-blur-sm border border-amber-600/30">
                  <span className={`${currentRank.color} text-lg`}>{currentRank.icon}</span>
                  <span className="text-sm font-bold">{currentRank.title}</span>
                </div>
                <div className="flex items-center space-x-2 bg-amber-900/20 px-4 py-2 rounded-full backdrop-blur-sm border border-amber-600/30">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-bold">{experience} XP</span>
                </div>
              </div>

              {/* Audio Settings */}
              {audioManagerRef.current && <PirateAudioSettings audioManager={audioManagerRef.current} />}

              <Dialog open={isLeaderboardOpen} onOpenChange={setIsLeaderboardOpen}>
                <DialogTrigger asChild>
                  <Button
                    className="bg-amber-900/20 border border-amber-600/40 text-amber-200 hover:bg-amber-800/30 backdrop-blur-sm transition-all duration-300 hover:scale-105"
                    onClick={handleButtonClick}
                    onMouseEnter={handleButtonHover}
                  >
                    <Trophy className="w-4 h-4 mr-2" />
                    Hall of Fame
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl bg-slate-900/95 backdrop-blur-2xl border border-amber-600/30">
                  <DialogHeader>
                    <DialogTitle className="flex items-center text-amber-400 text-2xl font-bold">
                      <Crown className="w-7 h-7 mr-3" />
                      Legendary Pirate Captains
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    {pirateLeaderboard.map((pirate, index) => (
                      <div
                        key={pirate.rank}
                        className={`flex items-center justify-between p-5 rounded-2xl transition-all duration-500 hover:scale-105 transform ${
                          index === 0
                            ? "bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-orange-500/20 border-2 border-amber-500/40 shadow-lg shadow-amber-500/20"
                            : index === 1
                              ? "bg-gradient-to-r from-gray-400/20 via-slate-400/20 to-gray-500/20 border-2 border-gray-400/40 shadow-lg shadow-gray-400/20"
                              : index === 2
                                ? "bg-gradient-to-r from-orange-600/20 via-red-500/20 to-pink-500/20 border-2 border-orange-500/40 shadow-lg shadow-orange-500/20"
                                : "bg-amber-900/10 border border-amber-600/20 hover:bg-amber-900/20"
                        }`}
                      >
                        <div className="flex items-center space-x-5">
                          <div className="text-3xl">{pirate.avatar}</div>
                          <div>
                            <p className="font-bold text-amber-200 text-lg">{pirate.player}</p>
                            <p className="font-mono text-sm text-amber-400/60">{pirate.address}</p>
                            <p className="text-xs text-amber-500/60">
                              {pirate.treasure} • {pirate.time} • {pirate.title}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-amber-400 text-xl">{pirate.reward}</p>
                          <Badge
                            variant="outline"
                            className="text-xs border-amber-500/40 text-amber-400 bg-amber-500/10"
                          >
                            #{pirate.rank}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>

              <Button
                className="bg-gradient-to-r from-amber-600 via-orange-500 to-red-500 hover:from-amber-700 hover:via-orange-600 hover:to-red-600 text-white font-bold shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-110 px-6 py-3"
                onClick={() => {
                  handleButtonClick()
                }}
                onMouseEnter={handleButtonHover}
              >
                <User className="w-5 h-5 mr-2" />
                Web2Player
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 max-w-7xl mx-auto p-6 lg:p-8">
        {/* Hexagonal Game Grid - Now Full Width */}
        <Card className="bg-black/20 backdrop-blur-2xl border border-amber-600/30 shadow-2xl">
          <CardHeader className="text-center pb-6">
            <CardTitle className="text-3xl text-amber-200 flex items-center justify-center space-x-3">
              <Compass className="w-8 h-8 text-cyan-400" />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Pirate's Navigation Chart
              </span>
            </CardTitle>
            <div className="flex justify-center space-x-8 text-sm text-amber-200/70 mt-4">
              <span className="bg-amber-900/20 px-3 py-1 rounded-full border border-amber-600/30">
                Explored: {exploredTiles}
              </span>
              <span className="bg-amber-900/20 px-3 py-1 rounded-full border border-amber-600/30">
                Rank: {currentRank.title}
              </span>
              <span className="bg-amber-900/20 px-3 py-1 rounded-full border border-amber-600/30">
                XP: {experience}
              </span>
            </div>
            <Progress value={(exploredTiles / 80) * 100} className="w-full h-3 bg-amber-900/30 mt-4" />
          </CardHeader>
          <CardContent>
            <div className="relative p-12 bg-gradient-to-br from-black/30 to-black/10 rounded-3xl backdrop-blur-sm border border-amber-600/20">
              <div className="flex justify-center">
                <div className="transform scale-125">
                  <HexGrid
                    radius={gridData.radius}
                    hexArray={gridData.hexArray}
                    onTileClick={(q, r) => sailToTile(q, r)}
                    isSailing={isSailing}
                    onHover={handleButtonHover}
                    currentPosition={currentPosition}
                  />
                </div>
              </div>
            </div>
            <div className="mt-6 text-center">
              <p className="text-amber-200/80 text-sm">Connect your profile to embark on your voyage</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Captain's Log */}
          <Card className="bg-black/20 backdrop-blur-2xl border border-amber-600/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-amber-200 flex items-center justify-between">
                <div className="flex items-center">
                  <Anchor className="w-5 h-5 mr-2 text-cyan-400" />
                  <span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent text-lg">
                    Captain's Log
                  </span>
                </div>
                <Badge className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 py-1 text-xs">
                  {currentRank.title}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-900/10 to-amber-800/20 rounded-xl border border-amber-600/20">
                <span className="text-amber-200/80 font-medium text-sm">Current Waters:</span>
                <div className="text-right">
                  <span className="font-bold text-amber-200 text-sm block">
                    {
                      (
                        terrainTypes[
                          gridData.hexArray.find((hex) => hex.q === currentPosition.q && hex.r === currentPosition.r)
                            ?.terrain as keyof typeof terrainTypes
                        ] || terrainTypes.unexplored
                      ).name
                    }
                  </span>
                  <span
                    className={`text-xs font-semibold ${getRarityColor(
                      (
                        terrainTypes[
                          gridData.hexArray.find((hex) => hex.q === currentPosition.q && hex.r === currentPosition.r)
                            ?.terrain as keyof typeof terrainTypes
                        ] || terrainTypes.unexplored
                      ).rarity,
                    )}`}
                  >
                    {
                      (
                        terrainTypes[
                          gridData.hexArray.find((hex) => hex.q === currentPosition.q && hex.r === currentPosition.r)
                            ?.terrain as keyof typeof terrainTypes
                        ] || terrainTypes.unexplored
                      ).rarity
                    }
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Exploration Stats */}
          <Card className="bg-black/20 backdrop-blur-2xl border border-amber-600/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-amber-200 flex items-center">
                <MapIcon className="w-5 h-5 mr-2 text-cyan-400" />
                <span className="text-lg">Exploration</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30">
                  <p className="text-cyan-400 text-xs font-semibold uppercase tracking-wider">Explored</p>
                  <p className="text-amber-200 text-xl font-bold">{exploredTiles}</p>
                </div>
                <div className="p-3 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30">
                  <p className="text-purple-400 text-xs font-semibold uppercase tracking-wider">Experience</p>
                  <p className="text-amber-200 text-xl font-bold">{experience}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Plunder */}
          <Card className="bg-black/20 backdrop-blur-2xl border border-amber-600/30 shadow-2xl">
            <CardHeader>
              <CardTitle className="text-amber-200 flex items-center">
                <Chest className="w-5 h-5 mr-2 text-amber-400" />
                <span className="text-lg">Total Plunder</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-gradient-to-r from-amber-600/20 via-yellow-500/20 to-orange-500/20 rounded-xl border-2 border-amber-400/40">
                <div className="text-center">
                  <span className="font-black text-amber-400 text-2xl block">{totalRewards} Gold</span>
                  <span className="text-amber-200/60 text-sm">Session Earnings</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <OnboardingTips
        open={showTips}
        onClose={() => {
          setShowTips(false)
          try {
            localStorage.setItem("pm_onboarded", "1")
          } catch {}
        }}
      />

      <QuestsPanel open={isQuestsOpen} onClose={() => setIsQuestsOpen(false)} quests={quests} />

      <CollectionsPanel
        open={isCollectionsOpen}
        onClose={() => setIsCollectionsOpen(false)}
        items={collections}
        spiceSet={spiceSet}
      />

      <DailySummary open={summaryModalOpen} onClose={() => setSummaryModalOpen(false)} data={yesterdaySummary} />
      {/* Treasure Found Modal */}
      <TreasureModal
        open={showTreasureFound}
        amount={treasureReward}
        onClose={() => {
          setShowTreasureFound(false)
          startNextRound()
        }}
      />
      <style jsx global>{`
        .hex-grid {
          --hex-size: 52px;
          --hex-gap: 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .hex-row {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: calc(var(--hex-size) * -0.25);
        }

        .hex-row:first-child {
          margin-bottom: calc(var(--hex-size) * -0.25);
        }

        .hex-row:nth-child(even) {
          margin-left: calc(var(--hex-size) * 0.5 + var(--hex-gap));
        }

        .hex-tile {
          width: var(--hex-size);
          height: calc(var(--hex-size) * 0.866);
          position: relative;
          margin: 0 var(--hex-gap);
          overflow: hidden;
          clip-path: polygon(
            25% 0%,
            75% 0%,
            100% 50%,
            75% 100%,
            25% 100%,
            0% 50%
          );
          transition: all 0.3s ease;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            var(--tw-gradient-from),
            var(--tw-gradient-to)
          );
        }

        .hex-tile:hover {
          transform: scale(1.1);
          z-index: 10;
          filter: brightness(1.1);
        }

        .hex-img {
          position: absolute;
          width: 100%;
          height: 100%;
          /* tweak these four until the sprite fills the hex exactly */
          top: -30px; /* ↑ moves the image up */
          right: -10px; /* ← expands it past the right edge */
          bottom: -10px; /* ↓ expands it past the bottom */
          left: 0px; /* → expands it past the left edge */

          object-fit: cover;
          /* first value is horizontal alignment (0–100%), second is vertical (0–100%) */
          object-position: 50% 20%; /* center horizontally, shift up by 30% */

          pointer-events: none;
          z-index: 1;
        }

        .eldorado-img {
          position: absolute;
          width: 100%;
          height: 100%;

          top: -30px;
          right: -10px;
          bottom: -10px;
          left: 0px;

          object-fit: cover;
          object-position: 50% 20%;

          pointer-events: none;
          z-index: 2; /* higher than normal hex-img, if needed */
        }

        .hex-resource {
          position: absolute;
          bottom: 2px;
          right: 2px;
          width: 24px;
          height: 24px;
          pointer-events: none;
          z-index: 3;
        }

        .hex-tile::after {
          content: "";
          position: absolute;
          inset: 0;
          background: linear-gradient(
            135deg,
            rgba(255, 255, 255, 0.1) 0%,
            transparent 50%,
            rgba(0, 0, 0, 0.1) 100%
          );
          z-index: 2;
          pointer-events: none;
        }

        .current-position {
          box-shadow: 0 0 0 3px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.8);
          transform: scale(1.15);
          z-index: 20;
          animation: currentPositionPulse 2s ease-in-out infinite;
        }

        .adjacent-tile {
          box-shadow: 0 0 15px rgba(245, 158, 11, 0.6);
          animation: adjacentTilePulse 2s ease-in-out infinite;
        }

        .adjacent-tile:hover {
          box-shadow: 0 0 0 2px #f59e0b, 0 0 25px rgba(245, 158, 11, 0.8);
        }

        .explored-tile {
          opacity: 1;
        }

        .unexplored-tile {
          opacity: 0.7;
          filter: grayscale(0.3) brightness(0.8);
        }

        .adjacent-tile:not(.explored-tile) {
          opacity: 0.95;
          filter: grayscale(0) brightness(1.05);
        }

        /* Rarity-based effects */
        .hex-tile[data-rarity="legendary"] {
          box-shadow: 0 0 0 2px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.6);
          animation: legendaryGlow 3s ease-in-out infinite;
        }

        .hex-tile[data-rarity="rare"] {
          box-shadow: 0 0 0 2px #a855f7, 0 0 15px rgba(168, 85, 247, 0.4);
        }

        .hex-tile[data-rarity="uncommon"] {
          box-shadow: 0 0 0 1px #3b82f6, 0 0 10px rgba(59, 130, 246, 0.3);
        }

        @keyframes currentPositionPulse {
          0%,
          100% {
            box-shadow: 0 0 0 3px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.8);
          }
          50% {
            box-shadow: 0 0 0 4px #f59e0b, 0 0 30px rgba(245, 158, 11, 1);
          }
        }

        @keyframes adjacentTilePulse {
          0%,
          100% {
            box-shadow: 0 0 15px rgba(245, 158, 11, 0.6);
          }
          50% {
            box-shadow: 0 0 25px rgba(245, 158, 11, 0.8);
          }
        }

        @keyframes legendaryGlow {
          0%,
          100% {
            box-shadow: 0 0 0 2px #f59e0b, 0 0 20px rgba(245, 158, 11, 0.6);
          }
          33% {
            box-shadow: 0 0 0 3px #f97316, 0 0 25px rgba(249, 115, 22, 0.7);
          }
          66% {
            box-shadow: 0 0 0 3px #ea580c, 0 0 25px rgba(234, 88, 12, 0.7);
          }
        }

        /* Responsive design */
        @media (max-width: 1024px) {
          .hex-grid {
            --hex-size: 48px;
          }
        }

        @media (max-width: 768px) {
          .hex-grid {
            --hex-size: 42px;
          }
        }

        @media (max-width: 640px) {
          .hex-grid {
            --hex-size: 36px;
          }
        }

        /* Custom scrollbar styling */
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(245, 158, 11, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(to bottom, #f59e0b, #d97706);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(to bottom, #d97706, #b45309);
        }
      `}</style>
    </div>
  )
}
