import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { LessonCard } from '../components/journey/LessonCard'
import { LESSONS } from '../content/lessons/catalog'
import { currentLesson, lessonStatus } from '../engine/progress'
import { useProgress } from '../storage/progressStore'

function JourneyBanner() {
  return (
    <svg viewBox="0 0 960 190" preserveAspectRatio="xMaxYMax slice" aria-hidden className="absolute inset-0 h-full w-full">
      <path className="art-t4" d="M0 120 Q260 70 520 112 T960 84 V190 H0Z" />
      <path className="art-t3" d="M0 160 Q300 118 560 152 T960 134 V190 H0Z" />
      <path d="M430 178 C520 170 500 146 580 138 C660 130 640 108 730 100 C800 94 800 76 860 64" fill="none" stroke="var(--surface)" strokeWidth="14" strokeLinecap="round" />
      <path d="M430 178 C520 170 500 146 580 138 C660 130 640 108 730 100 C800 94 800 76 860 64" fill="none" className="art-s2" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="1 8" />
      <circle className="art-t1" cx="520" cy="162" r="13" />
      <path d="M514 162l4.5 4.5L527 157" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="art-t1" cx="600" cy="136" r="13" />
      <path d="M594 136l4.5 4.5L607 131" fill="none" stroke="var(--accent-contrast)" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="art-fs art-s1" cx="720" cy="102" r="13" strokeWidth="3" />
      <text x="720" y="107" textAnchor="middle" fontSize="13" fontWeight="800" fill="var(--accent)">3</text>
      <path d="M860 64V24" className="art-s1" strokeWidth="3" strokeLinecap="round" />
      <path className="art-t1" d="M860 24l32 10-32 11z" />
      <g fontSize="14" fontWeight="800" textAnchor="middle">
        <rect className="art-fs art-s3" x="470" y="34" width="32" height="32" rx="9" strokeWidth="2" /><text x="486" y="56" fill="var(--accent)">F</text>
        <rect className="art-fs art-s3" x="516" y="18" width="32" height="32" rx="9" strokeWidth="2" /><text x="532" y="40" fill="var(--accent)">J</text>
        <rect className="art-fs art-s3" x="562" y="46" width="32" height="32" rx="9" strokeWidth="2" /><text x="578" y="68" fill="var(--accent)">D</text>
      </g>
    </svg>
  )
}

export function Journey() {
  const progress = useProgress((s) => s.progress)
  const current = currentLesson(LESSONS, progress)

  // Land on the lesson in progress.
  useEffect(() => {
    const id = window.setTimeout(() => {
      const el = document.getElementById(`lesson-${current?.order ?? 1}`)
      if (el && (current?.order ?? 1) > 6) el.scrollIntoView({ block: 'center' })
    }, 50)
    return () => window.clearTimeout(id)
    // Only when the page opens, not on every progress change.
  }, [])

  return (
    <main className="mx-auto max-w-[960px] px-6 pb-24 pt-2">
      <section aria-label="Journey" className="relative min-h-[190px] overflow-hidden rounded-3xl border border-border bg-art-bg">
        <JourneyBanner />
        <div className="relative flex flex-wrap items-center gap-x-6 gap-y-4 px-9 py-10">
          <h1 className="text-[34px] font-bold tracking-tight">Journey</h1>
          <Link to="/journey/test" className="rounded-xl border border-border bg-surface px-[18px] py-2.5 text-[15px] font-bold hover:bg-surface-2">
            Test skill
          </Link>
        </div>
      </section>

      <div className="mt-6 grid gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(176px,1fr))]">
        {LESSONS.map((lesson) => {
          const status = lessonStatus(lesson, progress, current)
          return (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              status={status}
              stars={progress.lessons[lesson.id]?.stars ?? 0}
              target={lesson.type === 'checkpoint' ? `${lesson.pass.wpm} WPM, ${lesson.pass.accuracy}%` : undefined}
            />
          )
        })}
      </div>
    </main>
  )
}
