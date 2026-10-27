import { useEffect, useRef, type CSSProperties, type ReactElement, type RefObject } from 'react'
import './wallpapers.css'

/** Text and button colours the landing page uses on top of each wallpaper. */
export interface WallpaperInk {
  onSky: string
  cta: string
  ctaFg: string
  /** Colour for the small footer link, which sits over the bottom of the scene. */
  foot: string
}

interface Wallpaper {
  id: string
  Scene: (props: { night: boolean }) => ReactElement
  ink: { light: WallpaperInk; dark: WallpaperInk }
}

const WHITE_ON_NAVY: WallpaperInk = { onSky: '#ffffff', cta: '#ffffff', ctaFg: '#0b2a5b', foot: '#ffffff' }
const NAVY_ON_WHITE: WallpaperInk = { onSky: '#0b2a5b', cta: '#0b2a5b', ctaFg: '#ffffff', foot: '#0b2a5b' }

/** Small seeded generator so every visit draws the same trees and buildings. */
function lcg(seed: number) {
  let s = seed
  return () => (s = (s * 16807) % 2147483647) / 2147483647
}

/**
 * Mouse effects: calls onMove with the pointer inside the scene and onLeave when it goes out. Skipped for
 * touch and for people who asked for less motion. Work is done at most once per frame.
 */
function usePointerFx(
  ref: RefObject<HTMLElement | null>,
  onMove: (p: { x: number; y: number; px: number; py: number }, root: HTMLElement) => void,
  onLeave: (root: HTMLElement) => void,
) {
  const handlers = useRef({ onMove, onLeave })
  handlers.current = { onMove, onLeave }

  useEffect(() => {
    const root = ref.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0
    let inside = false
    let last: PointerEvent | null = null

    const run = () => {
      frame = 0
      if (!last) return
      const r = root.getBoundingClientRect()
      const x = last.clientX - r.left
      const y = last.clientY - r.top
      if (x >= 0 && y >= 0 && x <= r.width && y <= r.height) {
        inside = true
        handlers.current.onMove({ x, y, px: x / r.width, py: y / r.height }, root)
      } else if (inside) {
        inside = false
        handlers.current.onLeave(root)
      }
    }
    const move = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      last = e
      if (!frame) frame = requestAnimationFrame(run)
    }
    const leave = () => {
      if (inside) {
        inside = false
        handlers.current.onLeave(root)
      }
    }
    window.addEventListener('pointermove', move)
    document.documentElement.addEventListener('mouseleave', leave)
    return () => {
      window.removeEventListener('pointermove', move)
      document.documentElement.removeEventListener('mouseleave', leave)
      if (frame) cancelAnimationFrame(frame)
    }
  }, [ref])
}

/* 1. Floating keys */
const KEYS = [[58, 8], [74, 32], [88, 10], [64, 62], [82, 72], [48, 40], [92, 48], [52, 76], [70, 86]].map(([left, top], i) => ({
  left, top, ch: 'ASDFJKL;QWERTYUIOPZXCVBNM'[(i * 5) % 25], d: 8 + (i % 4) * 2, l: -i, r: i % 2 ? 8 : -8,
}))

function KeysScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  usePointerFx(
    ref,
    (p, root) => {
      const r0 = root.getBoundingClientRect()
      root.querySelectorAll<HTMLElement>('.wp-key').forEach((el) => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width / 2 - (r0.left + p.x)
        const cy = r.top + r.height / 2 - (r0.top + p.y)
        const d = Math.hypot(cx, cy) || 1
        if (d < 110) {
          const f = ((110 - d) / 110) * 26
          el.style.setProperty('--px', `${(cx / d) * f}px`)
          el.style.setProperty('--py', `${(cy / d) * f}px`)
          el.classList.add('near')
        } else {
          el.style.setProperty('--px', '0px')
          el.style.setProperty('--py', '0px')
          el.classList.remove('near')
        }
      })
    },
    (root) =>
      root.querySelectorAll<HTMLElement>('.wp-key').forEach((el) => {
        el.style.setProperty('--px', '0px')
        el.style.setProperty('--py', '0px')
        el.classList.remove('near')
      }),
  )
  return (
    <div ref={ref} aria-hidden className="wp wp-keys" data-night={night ? '1' : '0'}>
      {KEYS.map((k) => (
        <span
          key={k.ch + k.left}
          className="wp-key"
          style={{ left: `${k.left}%`, top: `${k.top}%`, '--d': `${k.d}s`, '--l': `${k.l}s`, '--r': `${k.r}deg` } as CSSProperties}
        >
          {k.ch}
        </span>
      ))}
    </div>
  )
}

/* 2. Aurora, colours flow like water */
const BLOBS = [
  { fx: 0.9, pos: { left: '-8%', top: '2%' }, color: 'var(--ba)', x: '26vw', y: '10vh', d: 15 },
  { fx: 1.3, pos: { left: '30%', top: '25%' }, color: 'var(--bb)', x: '-24vw', y: '-9vh', d: 19 },
  { fx: 0.6, pos: { right: '-8%', top: '4%' }, color: 'var(--bc)', x: '-22vw', y: '14vh', d: 23 },
  { fx: 1.1, pos: { left: '8%', bottom: '-10%' }, color: 'var(--bd)', x: '28vw', y: '-12vh', d: 17 },
  { fx: 0.75, pos: { right: '6%', bottom: '-8%' }, color: 'var(--be)', x: '-26vw', y: '-10vh', d: 21 },
] as const

function AuroraScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const target = useRef({ x: 0, y: 0 })
  const cur = useRef(BLOBS.map(() => [0, 0]))
  const frame = useRef(0)

  const loop = () => {
    const root = ref.current
    if (!root) return
    let again = false
    root.querySelectorAll<HTMLElement>('.wp-bw').forEach((el, i) => {
      const f = BLOBS[i].fx
      const c = cur.current[i]
      c[0] += (target.current.x * f - c[0]) * 0.09
      c[1] += (target.current.y * f - c[1]) * 0.09
      el.style.transform = `translate(${c[0]}px,${c[1]}px)`
      if (Math.abs(target.current.x * f - c[0]) > 0.3 || Math.abs(target.current.y * f - c[1]) > 0.3) again = true
    })
    frame.current = again ? requestAnimationFrame(loop) : 0
  }
  const kick = () => {
    if (!frame.current) frame.current = requestAnimationFrame(loop)
  }
  useEffect(() => () => cancelAnimationFrame(frame.current), [])

  usePointerFx(
    ref,
    (p, root) => {
      // The colours follow the mouse across the whole scene and shift shade as it moves.
      target.current = { x: (p.px - 0.5) * 520, y: (p.py - 0.5) * 300 }
      root.querySelector<HTMLElement>('.wp-water')?.style.setProperty('--hue', `${(p.px - 0.5) * 240}deg`)
      root.style.setProperty('--mx', `${p.px * 100}%`)
      root.style.setProperty('--my', `${p.py * 100}%`)
      kick()
    },
    (root) => {
      target.current = { x: 0, y: 0 }
      root.querySelector<HTMLElement>('.wp-water')?.style.setProperty('--hue', '0deg')
      kick()
    },
  )
  return (
    <div ref={ref} aria-hidden className="wp wp-aurora" data-night={night ? '1' : '0'}>
      <div className="wp-water">
        {BLOBS.map((b, i) => (
          <div key={i} className="wp-bw" style={{ position: 'absolute', ...b.pos }}>
            <span className="wp-blob" style={{ background: b.color, '--x': b.x, '--y': b.y, '--d': `${b.d}s` } as CSSProperties} />
          </div>
        ))}
      </div>
      <div className="wp-shine" />
    </div>
  )
}

/* 3. Layered hills */
const STARS = [[12, 16], [30, 10], [48, 24], [62, 12], [78, 34], [90, 20]]

/** By day the sand shows up against what is under the mouse: dark sand on the pale sky, light sand on the hills. */
const SAND_ON_SKY = '#b4713a'
const SAND_ON_HILL = ['#fff0d2', '#ffe6c4', '#ffdcb4']

function grainColorAt(root: HTMLElement, x: number, y: number): string {
  const r = root.getBoundingClientRect()
  const hills = root.querySelectorAll<SVGSVGElement>('.wp-hill')
  for (let i = hills.length - 1; i >= 0; i--) {
    const svg = hills[i]
    const path = svg.querySelector('path')
    const m = svg.getScreenCTM()
    if (!path || !m) continue
    const pt = new DOMPoint(r.left + x, r.top + y).matrixTransform(m.inverse())
    if (path.isPointInFill(pt)) return SAND_ON_HILL[i]
  }
  return SAND_ON_SKY
}

function HillsScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const lastGrain = useRef({ x: -99, y: -99 })
  usePointerFx(
    ref,
    (p, root) => {
      root.querySelectorAll<SVGElement>('.wp-hill').forEach((h) => {
        h.style.transform = `translateX(${-(p.px - 0.5) * Number(h.dataset.s)}px)`
      })
      // Sand blown off the cursor: a few grains drift away in the wind and fade.
      if (Math.hypot(p.x - lastGrain.current.x, p.y - lastGrain.current.y) < 14) return
      lastGrain.current = { x: p.x, y: p.y }
      const color = night ? null : grainColorAt(root, p.x, p.y)
      for (let i = 0; i < 3; i++) {
        const grain = document.createElement('span')
        grain.className = 'wp-grain'
        if (color) grain.style.background = color
        grain.style.left = `${p.x + (Math.random() - 0.5) * 16}px`
        grain.style.top = `${p.y + (Math.random() - 0.5) * 16}px`
        const size = 2 + Math.random() * 3
        grain.style.width = grain.style.height = `${size}px`
        root.appendChild(grain)
        const dx = 20 + Math.random() * 70
        const dy = -25 + Math.random() * 70
        grain
          .animate(
            [
              { transform: 'translate(0, 0)', opacity: 0.95 },
              { transform: `translate(${dx}px, ${dy}px)`, opacity: 0 },
            ],
            { duration: 700 + Math.random() * 600, easing: 'ease-out' },
          )
          .finished.then(() => grain.remove(), () => grain.remove())
      }
    },
    (root) => {
      root.querySelectorAll<SVGElement>('.wp-hill').forEach((h) => (h.style.transform = ''))
      root.querySelectorAll('.wp-grain').forEach((g) => g.remove())
    },
  )
  const hills = [
    { s: 8, h: '34%', c: 'var(--h1)', d: 'M0 90 C120 30 260 40 380 80 S650 40 800 70 V160 H0Z' },
    { s: 16, h: '26%', c: 'var(--h2)', d: 'M0 80 C150 20 300 100 450 60 S700 30 800 70 V160 H0Z' },
    { s: 28, h: '18%', c: 'var(--h3)', d: 'M0 60 C130 30 280 90 430 55 S700 70 800 40 V160 H0Z' },
  ]
  return (
    <div ref={ref} aria-hidden className="wp wp-hills" data-night={night ? '1' : '0'}>
      <span className="wp-orb" />
      {STARS.map(([l, t], i) => (
        <span key={i} className="wp-star" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${i * 0.6}s` }} />
      ))}
      {hills.map((h) => (
        <svg key={h.s} className="wp-hill" data-s={h.s} viewBox="0 0 800 160" preserveAspectRatio="none" style={{ height: h.h, '--hc': h.c } as CSSProperties}>
          <path d={h.d} />
        </svg>
      ))}
    </div>
  )
}

/* 4. City */
const CITY = (() => {
  const r = lcg(5)
  const buildings: { x: number; w: number; h: number }[] = []
  const windows: { x: number; y: number; delay: number }[] = []
  for (let x = 0; x < 1440; ) {
    const w = 34 + Math.floor(r() * 40)
    const h = 90 + Math.floor(r() * 150)
    buildings.push({ x, w, h })
    for (let wy = 280 - h + 12; wy < 268; wy += 16) {
      for (let wx = x + 6; wx < x + w - 8; wx += 12) if (r() < 0.45) windows.push({ x: wx, y: wy, delay: Math.floor(r() * 6) })
    }
    x += w + 3
  }
  return { buildings, windows }
})()

function CityScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  const lit = useRef(new Set<number>())
  usePointerFx(
    ref,
    (p, root) => {
      const glow = root.querySelector<HTMLElement>('.wp-glow-city')
      if (glow) {
        glow.style.left = `${p.x}px`
        glow.style.top = `${p.y}px`
      }
      const svg = root.querySelector<SVGSVGElement>('.wp-skyline')
      const m = svg?.getScreenCTM()
      if (!svg || !m) return
      const rect = root.getBoundingClientRect()
      const pt = new DOMPoint(rect.left + p.x, rect.top + p.y).matrixTransform(m.inverse())
      const els = svg.querySelectorAll<SVGElement>('.wp-win')
      CITY.windows.forEach((w, i) => {
        const on = Math.hypot(w.x - pt.x, w.y - pt.y) < 24
        if (on !== lit.current.has(i)) {
          els[i].classList.toggle('lit', on)
          if (on) lit.current.add(i)
          else lit.current.delete(i)
        }
      })
    },
    (root) => {
      root.querySelectorAll('.wp-win.lit').forEach((e) => e.classList.remove('lit'))
      lit.current.clear()
    },
  )
  return (
    <div ref={ref} aria-hidden className="wp wp-city" data-night={night ? '1' : '0'}>
      <svg className="wp-skyline" viewBox="0 0 1440 280" preserveAspectRatio="xMidYMax slice">
        {CITY.buildings.map((b) => (
          <rect key={b.x} className="wp-bd" x={b.x} y={280 - b.h} width={b.w} height={b.h} />
        ))}
        {CITY.windows.map((w, i) => (
          <rect key={i} className="wp-win" style={{ animationDelay: `-${w.delay}s` }} x={w.x} y={w.y} width={4} height={6} />
        ))}
      </svg>
      <div className="wp-glow-city" />
    </div>
  )
}

/* 5. Dot grid with glow */
function DotsScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  usePointerFx(
    ref,
    (p, root) => {
      const glow = root.querySelector<HTMLElement>('.wp-glow-dots')
      if (glow) {
        glow.style.left = `${p.x}px`
        glow.style.top = `${p.y}px`
      }
    },
    () => {},
  )
  return (
    <div ref={ref} aria-hidden className="wp wp-dots" data-night={night ? '1' : '0'}>
      <div className="wp-dotgrid" />
      <div className="wp-glow-dots" />
    </div>
  )
}

/* 6. Green forest under a sky */
function treeLayer(seed: number, hMin: number, hMax: number, gap: number, pine: boolean) {
  const r = lcg(seed)
  const H = 200
  const out: ReactElement[] = []
  for (let x = -10; x < 1450; ) {
    const h = hMin + r() * (hMax - hMin)
    const w = h * (pine ? 0.5 : 0.62)
    out.push(
      <g key={x} className="wp-tree" style={{ '--d': `${(4 + r() * 4).toFixed(1)}s`, '--l': `${(-r() * 6).toFixed(1)}s` } as CSSProperties}>
        <rect x={x + w / 2 - 3} y={H - h * 0.3} width={6} height={h * 0.3} />
        {pine ? (
          <polygon points={`${x + w / 2},${H - h} ${x + w},${H - h * 0.25} ${x},${H - h * 0.25}`} />
        ) : (
          <ellipse cx={x + w / 2} cy={H - h * 0.62} rx={w / 2} ry={h * 0.4} />
        )}
      </g>,
    )
    x += w * gap
  }
  return out
}
const TREE_LAYERS = [
  { cls: 'wp-t1', k: 0.55, s: 10, trees: treeLayer(11, 70, 110, 0.8, false) },
  { cls: 'wp-t2', k: 0.75, s: 22, trees: treeLayer(23, 90, 140, 0.75, true) },
  { cls: 'wp-t3', k: 1, s: 40, trees: treeLayer(37, 110, 170, 0.85, true) },
]
const CLOUDS = [
  { top: '10%', d: 70, delay: 0 },
  { top: '30%', d: 95, delay: -40 },
  { top: '19%', d: 120, delay: -80 },
]
const FLIES = Array.from({ length: 8 }, (_, i) => ({ left: `${15 + i * 10}%`, top: `${45 + (i % 3) * 12}%`, delay: -i }))

function ForestScene({ night }: { night: boolean }) {
  const ref = useRef<HTMLDivElement>(null)
  usePointerFx(
    ref,
    (p, root) => {
      root.classList.add('on')
      root.style.setProperty('--mx', `${p.px * 100}%`)
      root.style.setProperty('--my', `${p.py * 100}%`)
      root.querySelectorAll<SVGElement>('.wp-trees').forEach((el) => {
        el.style.transform = `translateX(${-(p.px - 0.5) * Number(el.dataset.s)}px)`
      })
      root.querySelectorAll<HTMLElement>('.wp-fly').forEach((f, i) => {
        f.style.left = `${p.x + Math.cos(i * 0.8) * (24 + i * 7)}px`
        f.style.top = `${p.y + Math.sin(i * 1.3) * (20 + i * 6)}px`
      })
    },
    (root) => {
      root.classList.remove('on')
      root.querySelectorAll<SVGElement>('.wp-trees').forEach((el) => (el.style.transform = ''))
    },
  )
  return (
    <div ref={ref} aria-hidden className="wp wp-forest" data-night={night ? '1' : '0'}>
      <span className="wp-orb" />
      {STARS.map(([l, t], i) => (
        <span key={i} className="wp-star" style={{ left: `${l}%`, top: `${t * 0.8}%`, animationDelay: `${i * 0.6}s` }} />
      ))}
      {CLOUDS.map((c, i) => (
        <span key={i} className="wp-cloud" style={{ top: c.top, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s` }} />
      ))}
      <div className="wp-sunlight" />
      {FLIES.map((f, i) => (
        <i key={i} className="wp-fly" style={{ left: f.left, top: f.top, animationDelay: `${f.delay}s`, zIndex: 3 }} />
      ))}
      {TREE_LAYERS.map((l) => (
        <svg key={l.cls} className={`wp-trees ${l.cls}`} data-s={l.s} viewBox="0 0 1440 200" preserveAspectRatio="xMidYMax slice" style={{ '--k': l.k } as CSSProperties}>
          {l.trees}
        </svg>
      ))}
    </div>
  )
}

export const WALLPAPERS: Wallpaper[] = [
  { id: 'keys', Scene: KeysScene, ink: { light: WHITE_ON_NAVY, dark: WHITE_ON_NAVY } },
  { id: 'aurora', Scene: AuroraScene, ink: { light: NAVY_ON_WHITE, dark: WHITE_ON_NAVY } },
  { id: 'hills', Scene: HillsScene, ink: { light: { onSky: '#5a2a22', cta: '#5a2a22', ctaFg: '#ffffff', foot: '#ffffff' }, dark: { onSky: '#ffffff', cta: '#ffffff', ctaFg: '#2a2150', foot: '#ffffff' } } },
  { id: 'city', Scene: CityScene, ink: { light: { ...NAVY_ON_WHITE, foot: '#ffffff' }, dark: { onSky: '#ffffff', cta: '#ffffff', ctaFg: '#2a1f55', foot: '#ffffff' } } },
  { id: 'dots', Scene: DotsScene, ink: { light: NAVY_ON_WHITE, dark: WHITE_ON_NAVY } },
  { id: 'forest', Scene: ForestScene, ink: { light: { onSky: '#0b3a2a', cta: '#0f3a22', ctaFg: '#ffffff', foot: '#ffffff' }, dark: { onSky: '#ffffff', cta: '#ffffff', ctaFg: '#0f3a22', foot: '#ffffff' } } },
]

const LAST_KEY = 'typeright.wallpaper'

/** A random wallpaper for this visit, never the same one as the visit before. */
export function pickWallpaper(): number {
  let last = -1
  try {
    last = Number(localStorage.getItem(LAST_KEY) ?? -1)
  } catch {
    // storage blocked: fine, any wallpaper will do
  }
  let i = Math.floor(Math.random() * WALLPAPERS.length)
  if (i === last) i = (i + 1 + Math.floor(Math.random() * (WALLPAPERS.length - 1))) % WALLPAPERS.length
  try {
    localStorage.setItem(LAST_KEY, String(i))
  } catch {
    // ignore
  }
  return i
}
