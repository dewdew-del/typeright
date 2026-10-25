import { useResolvedTheme } from '../../lib/theme'

/** Deterministic star field so the sky looks the same on every render. */
const STARS = (() => {
  let seed = 7
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647
  return Array.from({ length: 90 }, () => {
    const size = rnd() < 0.15 ? 3 : rnd() < 0.5 ? 2 : 1.5
    return {
      left: `${(rnd() * 100).toFixed(1)}%`,
      top: `${(rnd() * 72).toFixed(1)}%`,
      size,
      opacity: 0.45 + rnd() * 0.5,
      delay: `${(rnd() * 4).toFixed(1)}s`,
    }
  })
})()

/** Full-bleed background for the landing page: stars at night, clouds always. */
export function SkyScene() {
  const night = useResolvedTheme() === 'dark'

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ background: 'linear-gradient(180deg, var(--sky-top) 0%, var(--sky-bottom) 100%)' }}
      />
      {night &&
        STARS.map((s, i) => (
          <span
            key={i}
            className="twinkle absolute rounded-full bg-white"
            style={{ left: s.left, top: s.top, width: s.size, height: s.size, opacity: s.opacity, animationDelay: s.delay }}
          />
        ))}
      <svg
        viewBox="0 0 1440 200"
        preserveAspectRatio="xMidYMax slice"
        className="absolute inset-x-0 bottom-0 block h-[190px] w-full"
      >
        <g fill="var(--cloud-1)">
          <circle cx="30" cy="120" r="70" /><circle cx="170" cy="100" r="62" /><circle cx="310" cy="95" r="78" /><circle cx="460" cy="110" r="66" /><circle cx="600" cy="90" r="84" /><circle cx="760" cy="115" r="64" /><circle cx="900" cy="80" r="92" /><circle cx="1060" cy="105" r="70" /><circle cx="1210" cy="95" r="76" /><circle cx="1370" cy="75" r="88" />
          <rect x="0" y="120" width="1440" height="80" />
        </g>
        <g fill="var(--cloud-2)">
          <circle cx="90" cy="150" r="64" /><circle cx="240" cy="132" r="74" /><circle cx="400" cy="150" r="62" /><circle cx="540" cy="128" r="72" /><circle cx="690" cy="148" r="66" /><circle cx="840" cy="130" r="76" /><circle cx="990" cy="152" r="64" /><circle cx="1140" cy="128" r="74" /><circle cx="1290" cy="150" r="66" /><circle cx="1430" cy="132" r="70" />
          <rect x="0" y="160" width="1440" height="40" />
        </g>
        <g fill="var(--cloud-3)">
          <circle cx="40" cy="185" r="66" /><circle cx="200" cy="170" r="58" /><circle cx="350" cy="190" r="72" /><circle cx="510" cy="172" r="60" /><circle cx="660" cy="192" r="74" /><circle cx="820" cy="170" r="62" /><circle cx="970" cy="190" r="70" /><circle cx="1120" cy="172" r="60" /><circle cx="1270" cy="192" r="72" /><circle cx="1420" cy="174" r="64" />
          <rect x="0" y="180" width="1440" height="30" />
        </g>
      </svg>
    </div>
  )
}

/** The moon at night, the sun by day. Sized by its parent. */
export function SkyBody() {
  const night = useResolvedTheme() === 'dark'

  if (night) {
    return (
      <div
        aria-hidden
        className="relative h-[220px] w-[220px] rounded-full sm:h-[250px] sm:w-[250px]"
        style={{
          background: 'radial-gradient(circle at 38% 36%, #ffffff 0%, #e4eefc 45%, #c3d9f7 100%)',
          boxShadow: '0 0 60px 18px rgba(170,205,255,0.45), 0 0 140px 50px rgba(120,170,255,0.18)',
        }}
      >
        {[
          ['28%', '22%', 54, 44, 3],
          ['58%', '40%', 70, 52, 4],
          ['22%', '60%', 60, 46, 4],
          ['62%', '16%', 30, 26, 2],
        ].map(([l, t, w, h, blur], i) => (
          <span
            key={i}
            className="absolute rounded-full"
            style={{ left: l, top: t, width: w, height: h, background: 'rgba(150,190,240,0.42)', filter: `blur(${blur}px)` }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      aria-hidden
      className="h-[200px] w-[200px] rounded-full sm:h-[220px] sm:w-[220px]"
      style={{
        background: 'radial-gradient(circle at 40% 38%, #fffbe0 0%, #ffe27a 55%, #ffc83d 100%)',
        boxShadow: '0 0 70px 30px rgba(255,220,110,0.55), 0 0 160px 70px rgba(255,235,160,0.35)',
      }}
    />
  )
}
