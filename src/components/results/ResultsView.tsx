import type { ReactNode } from 'react'
import { formatAccuracy, formatTime, keyLabel, slowestKeys, topMissedKeys, wpmSeries } from '../../engine/stats'
import type { TypingResult } from '../typing/TypingArea'

/** Results for an unranked attempt: speed, accuracy, time, speed chart and keys to practice. */
export function ResultsView({ result, children }: { result: TypingResult; children?: ReactNode }) {
  const { summary } = result
  const series = wpmSeries(result.target, result.log, result.mode, summary.durationMs)
  const missed = topMissedKeys(result.keyStats, 5)
  const slow = slowestKeys(result.keyStats, 3).filter((s) => !missed.some((m) => m.char === s.char))

  return (
    <div className="flex flex-col gap-5">
      <section className="flex flex-wrap gap-3.5">
        <div className="flex-[2_1_220px] rounded-[22px] border border-border bg-accent-soft px-6 py-5">
          <div className="text-sm font-semibold text-muted">Speed</div>
          <div className="text-6xl font-extrabold leading-tight tracking-tight text-accent tabular-nums">
            {Math.round(summary.wpm)} <span className="text-xl font-bold text-muted">WPM</span>
          </div>
        </div>
        <Tile label="Accuracy" value={`${formatAccuracy(summary.accuracy)}%`} />
        <Tile label="Time" value={formatTime(summary.durationMs)} />
      </section>

      {series.length >= 2 && (
        <section aria-label="Speed over time" className="rounded-[22px] border border-border bg-surface px-6 py-5">
          <div className="mb-2 text-[15px] font-bold">Speed over time</div>
          <SpeedChart series={series} seconds={Math.round(summary.durationMs / 1000)} />
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-[22px] border border-border bg-surface px-6 py-5">
        <div className="text-[15px] font-bold">Keys to practice</div>
        {missed.length === 0 && slow.length === 0 ? (
          <p className="text-sm text-muted">No problem keys this time. Nice work.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5">
            {missed.map((k) => (
              <KeyChip key={k.char} char={k.char} note={`${k.misses} ${k.misses === 1 ? 'miss' : 'misses'}`} />
            ))}
            {slow.map((k) => (
              <KeyChip key={k.char} char={k.char} note="slow" />
            ))}
          </div>
        )}
      </section>

      {children}
    </div>
  )
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex-[1_1_140px] rounded-[22px] border border-border bg-surface px-6 py-5">
      <div className="text-sm font-semibold text-muted">{label}</div>
      <div className="mt-2 text-4xl font-extrabold tracking-tight tabular-nums">{value}</div>
    </div>
  )
}

function KeyChip({ char, note }: { char: string; note: string }) {
  return (
    <span className="flex items-center gap-2 rounded-xl border border-border bg-bg px-3 py-2">
      <span
        className="grid h-7 min-w-7 place-items-center rounded-lg border-2 bg-surface px-1.5 text-sm font-extrabold text-accent"
        style={{ borderColor: 'color-mix(in srgb, var(--accent) 25%, var(--surface))' }}
      >
        {keyLabel(char)}
      </span>
      <span className="text-[13px] font-semibold text-muted">{note}</span>
    </span>
  )
}

function SpeedChart({ series, seconds }: { series: number[]; seconds: number }) {
  const W = 640
  const H = 170
  const left = 40
  const right = 620
  const top = 20
  const bottom = 146
  const max = Math.max(20, Math.ceil(Math.max(...series) / 20) * 20)
  const x = (i: number) => left + (i / (series.length - 1)) * (right - left)
  const y = (v: number) => bottom - (v / max) * (bottom - top)
  const line = series.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${right} ${bottom} L${left} ${bottom}Z`
  const ticks = [max, (max * 2) / 3, max / 3, 0].map((v) => Math.round(v))
  const secs = seconds

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={`Line chart of speed over ${secs} seconds, ending at ${Math.round(series[series.length - 1])} WPM`}
      className="block h-auto w-full"
    >
      {ticks.map((v) => (
        <g key={v}>
          <path d={`M${left} ${y(v)}H${right}`} stroke="var(--border)" strokeWidth="1" />
          <text x={left - 10} y={y(v) + 4} textAnchor="end" fontSize="11" fill="var(--muted)">{v}</text>
        </g>
      ))}
      <text x={left} y={H - 4} fontSize="11" fill="var(--muted)">0s</text>
      <text x={right} y={H - 4} textAnchor="end" fontSize="11" fill="var(--muted)">{secs}s</text>
      <path d={area} style={{ fill: 'color-mix(in srgb, var(--accent) 12%, var(--surface))' }} />
      <path d={line} fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={x(series.length - 1)} cy={y(series[series.length - 1])} r="5" fill="var(--accent)" />
    </svg>
  )
}
