import { useCallback, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { ResultsView } from '../components/results/ResultsView'
import { TypingArea, type TypingResult } from '../components/typing/TypingArea'
import { Choice } from '../components/ui/Choice'
import { SENTENCES_EN } from '../content/sentences/en'
import { SENTENCES_FIL } from '../content/sentences/fil'
import { createRng } from '../engine/rng'
import { touchStreak } from '../lib/api'
import { useProgress } from '../storage/progressStore'

type Lang = 'en' | 'fil'
type Length = '2min' | 'endless'

function CasualBanner() {
  const row1 = [500, 540, 580, 620, 660, 700, 740, 780]
  const row2 = [520, 560, 600, 640, 680, 720, 760]
  return (
    <svg viewBox="0 0 960 170" preserveAspectRatio="xMaxYMid slice" aria-hidden className="absolute inset-0 h-full w-full">
      <rect className="art-fs art-s3" x="470" y="18" width="420" height="64" rx="14" strokeWidth="2" />
      <text x="492" y="58" fontFamily="ui-monospace, Consolas, monospace" fontSize="20" fontWeight="700" fill="var(--accent)">type anything you</text>
      <rect className="art-t1" x="714" y="38" width="2.5" height="24" rx="1" />
      {row1.map((x) => <rect key={x} className="art-t3" x={x} y="98" width="32" height="26" rx="7" />)}
      {row2.map((x) => <rect key={x} className={x === 640 ? 'art-t1' : 'art-t3'} x={x} y="130" width="32" height="26" rx="7" />)}
    </svg>
  )
}

/** Setup: language and length only. The text is always sentences. */
export function CasualSetup() {
  const navigate = useNavigate()
  const [lang, setLang] = useState<Lang>('en')
  const [length, setLength] = useState<Length>('endless')

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-7 px-6 pb-16 pt-2">
      <section aria-label="Casual typing" className="relative min-h-[170px] overflow-hidden rounded-3xl border border-border bg-art-bg">
        <CasualBanner />
        <div className="relative px-9 py-[52px]">
          <h1 className="text-[34px] font-bold tracking-tight">Casual typing</h1>
        </div>
      </section>

      <div className="flex flex-wrap gap-x-14 gap-y-7">
        <Choice label="Language" value={lang} onChange={setLang} options={[{ value: 'en', label: 'English' }, { value: 'fil', label: 'Filipino' }]} />
        <Choice label="Length" value={length} onChange={setLength} options={[{ value: '2min', label: '2 min' }, { value: 'endless', label: 'Endless' }]} />
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={() => navigate(`/casual/play?lang=${lang}&length=${length}`)}
          className="rounded-xl bg-accent px-11 py-[15px] text-lg font-bold text-accent-contrast hover:opacity-90"
        >
          Start typing
        </button>
      </div>
    </main>
  )
}

/** Endless supply of sentences in the chosen language, never the same one twice in a row. */
function sentenceFeed(lang: Lang, seed: number) {
  const pool = lang === 'fil' ? SENTENCES_FIL : SENTENCES_EN
  const rng = createRng(seed)
  let last = ''
  return () => {
    let s = rng.pick(pool)
    if (s === last && pool.length > 1) s = pool[(pool.indexOf(s) + 1) % pool.length]
    last = s
    return s
  }
}

export function CasualPlay() {
  const [params] = useSearchParams()
  const lang: Lang = params.get('lang') === 'fil' ? 'fil' : 'en'
  const timed = params.get('length') === '2min'
  const addKeyStats = useProgress((s) => s.addKeyStats)

  const [round, setRound] = useState(() => Math.floor(Math.random() * 2 ** 31))
  const [finishSignal, setFinishSignal] = useState(0)
  const [result, setResult] = useState<TypingResult | null>(null)

  const feed = useMemo(() => sentenceFeed(lang, round), [lang, round])
  const firstText = useMemo(() => [feed(), feed()].join(' '), [feed])

  const onFinish = useCallback(
    (r: TypingResult) => {
      addKeyStats(r.keyStats)
      void touchStreak()
      setResult(r)
    },
    [addKeyStats],
  )

  const again = () => {
    setResult(null)
    setFinishSignal(0)
    setRound(Math.floor(Math.random() * 2 ** 31))
  }

  if (result) {
    return (
      <main className="mx-auto flex max-w-[860px] flex-col gap-5 px-6 pb-16 pt-2">
        <h1 className="text-3xl font-bold tracking-tight">Results</h1>
        <ResultsView result={result}>
          <Link to="/practice" className="self-start text-sm font-bold text-accent">Practice your weak keys</Link>
          <div className="flex flex-wrap gap-3 pt-1">
            <button type="button" onClick={again} className="rounded-xl bg-accent px-8 py-3.5 text-[17px] font-bold text-accent-contrast hover:opacity-90">Try again</button>
            <Link to="/casual" className="rounded-xl border border-border bg-surface px-7 py-3.5 text-[17px] font-bold hover:bg-surface-2">Change settings</Link>
            <Link to="/play" className="rounded-xl border border-border bg-surface px-7 py-3.5 text-[17px] font-bold hover:bg-surface-2">Back to menu</Link>
          </div>
        </ResultsView>
      </main>
    )
  }

  return (
    <main className="mx-auto flex max-w-[900px] flex-col gap-6 px-6 pb-16 pt-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setFinishSignal((n) => n + 1)}
          className="rounded-full bg-accent px-5 py-2 text-sm font-bold text-accent-contrast hover:opacity-90"
        >
          Finish
        </button>
      </div>
      <TypingArea
        key={round}
        target={firstText}
        timeLimitMs={timed ? 120_000 : undefined}
        getMore={feed}
        finishSignal={finishSignal}
        onFinish={onFinish}
      />
      <p className="text-center text-sm text-muted">Just start typing. Click Finish when you are done.</p>
    </main>
  )
}
