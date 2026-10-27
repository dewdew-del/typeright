import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

function JourneyArt() {
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="A dotted path of steps leading up to a flag" className="block h-auto w-full bg-art-bg">
      <path className="art-t4" d="M0 140 Q70 92 150 128 T320 98 V210 H0Z" />
      <path className="art-t3" d="M0 176 Q96 132 196 166 T320 148 V210 H0Z" />
      <path d="M34 196 C96 182 70 154 124 146 C178 138 150 114 206 106 C244 100 236 84 254 70" fill="none" stroke="var(--surface)" strokeWidth="12" strokeLinecap="round" />
      <path d="M34 196 C96 182 70 154 124 146 C178 138 150 114 206 106 C244 100 236 84 254 70" fill="none" className="art-s2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 8" />
      <circle className="art-t1" cx="66" cy="168" r="12" />
      <path d="M60 168l4.5 4.5L73 163" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="art-t1" cx="126" cy="146" r="12" />
      <path d="M120 146l4.5 4.5L133 141" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="art-fs art-s1" cx="196" cy="110" r="12" strokeWidth="3" />
      <text x="196" y="114.5" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--accent)">3</text>
      <path d="M254 70V34" className="art-s1" strokeWidth="2.5" strokeLinecap="round" />
      <path className="art-t1" d="M254 34l28 9-28 10z" />
      <g fontSize="13" fontWeight="800" textAnchor="middle">
        <rect className="art-fs art-s3" x="22" y="44" width="28" height="28" rx="8" strokeWidth="2" /><text x="36" y="63" fill="var(--accent)">F</text>
        <rect className="art-fs art-s3" x="60" y="26" width="28" height="28" rx="8" strokeWidth="2" /><text x="74" y="45" fill="var(--accent)">J</text>
        <rect className="art-fs art-s3" x="98" y="52" width="28" height="28" rx="8" strokeWidth="2" /><text x="112" y="71" fill="var(--accent)">D</text>
      </g>
    </svg>
  )
}

function FriendsArt() {
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="Three racers on lanes heading to a finish line" className="block h-auto w-full bg-art-bg">
      <defs>
        <pattern id="finish-checker" width="12" height="12" patternUnits="userSpaceOnUse">
          <rect className="art-t2" width="6" height="6" />
          <rect className="art-t2" x="6" y="6" width="6" height="6" />
        </pattern>
      </defs>
      <rect className="art-fs art-s3" x="22" y="38" width="276" height="40" rx="20" strokeWidth="2" />
      <rect className="art-fs art-s3" x="22" y="88" width="276" height="40" rx="20" strokeWidth="2" />
      <rect className="art-fs art-s3" x="22" y="138" width="276" height="40" rx="20" strokeWidth="2" />
      <rect className="art-t2" x="26" y="42" width="196" height="32" rx="16" />
      <rect className="art-t3" x="26" y="92" width="148" height="32" rx="16" />
      <rect className="art-t4" x="26" y="142" width="100" height="32" rx="16" />
      <rect x="278" y="32" width="12" height="152" fill="url(#finish-checker)" />
      <circle className="art-t1" cx="206" cy="58" r="15" />
      <circle cx="206" cy="53" r="4.5" fill="var(--accent-contrast)" />
      <path d="M197 66c1-5 4-7 9-7s8 2 9 7z" fill="var(--accent-contrast)" />
      <circle className="art-t2" cx="158" cy="108" r="15" />
      <circle cx="158" cy="103" r="4.5" fill="var(--surface)" />
      <path d="M149 116c1-5 4-7 9-7s8 2 9 7z" fill="var(--surface)" />
      <circle className="art-t3" cx="110" cy="158" r="15" />
      <circle className="art-t1" cx="110" cy="153" r="4.5" />
      <path className="art-t1" d="M101 166c1-5 4-7 9-7s8 2 9 7z" />
      <path className="art-t1" d="M196 38l4-8 6 5 6-5 4 8z" />
      <rect className="art-t1" x="232" y="48" width="34" height="20" rx="10" />
      <text x="249" y="62" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--accent-contrast)">1st</text>
    </svg>
  )
}

function CasualArt() {
  const row1 = [46, 74, 102, 130, 158, 186, 214, 242]
  const row2 = [60, 88, 116, 144, 172, 200, 228]
  return (
    <svg viewBox="0 0 320 210" role="img" aria-label="A typing window above a keyboard" className="block h-auto w-full bg-art-bg">
      <rect className="art-fs art-s3" x="30" y="22" width="260" height="92" rx="14" strokeWidth="2" />
      <path className="art-t4" d="M30 36a14 14 0 0 1 14-14h232a14 14 0 0 1 14 14v8H30z" />
      <circle className="art-t2" cx="46" cy="33" r="3.5" />
      <circle className="art-t3" cx="58" cy="33" r="3.5" />
      <circle className="art-t3" cx="70" cy="33" r="3.5" />
      <text x="46" y="70" fontFamily="ui-monospace, Consolas, monospace" fontSize="16" fontWeight="700" fill="var(--accent)">the quick brown</text>
      <text x="46" y="94" fontFamily="ui-monospace, Consolas, monospace" fontSize="16" fill="var(--muted)">fox jumps over</text>
      <rect className="art-t1" x="249" y="55" width="2.5" height="20" rx="1" />
      <rect className="art-t1" x="206" y="100" width="62" height="24" rx="12" />
      <text x="237" y="116" textAnchor="middle" fontSize="12" fontWeight="800" fill="var(--accent-contrast)">62 WPM</text>
      {row1.map((x) => (
        <rect key={x} className="art-t3" x={x} y="136" width="24" height="22" rx="6" />
      ))}
      {row2.map((x) => (
        <rect key={x} className={x === 144 ? 'art-t1' : 'art-t3'} x={x} y="162" width="24" height="22" rx="6" />
      ))}
    </svg>
  )
}

function ModeCard({ to, title, art }: { to: string; title: string; art: ReactNode }) {
  return (
    <Link
      to={to}
      className="flex flex-col overflow-hidden rounded-3xl border border-border bg-surface transition duration-150 hover:-translate-y-1 hover:border-accent hover:shadow-[0_12px_28px_rgba(15,23,42,0.10)] motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      {art}
      <div className="px-6 py-[22px] text-center text-[22px] font-bold tracking-tight">{title}</div>
    </Link>
  )
}

export function Modes() {
  return (
    <main className="mx-auto max-w-[1120px] px-6 pb-16 pt-9">
      <h1 className="mb-8 text-center text-3xl font-bold tracking-tight sm:text-4xl">How do you want to type today?</h1>
      <div className="grid gap-5 [grid-template-columns:repeat(auto-fit,minmax(280px,1fr))]">
        <ModeCard to="/journey" title="Journey" art={<JourneyArt />} />
        <ModeCard to="/friends" title="Play with friends" art={<FriendsArt />} />
        <ModeCard to="/casual/play" title="Casual typing" art={<CasualArt />} />
      </div>
    </main>
  )
}
