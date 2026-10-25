import { Link } from 'react-router-dom'

export function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
      <p className="mt-2 text-muted">Coming in Stage {stage}.</p>
      <Link to="/play" className="mt-6 inline-block font-semibold text-accent">
        Back to menu
      </Link>
    </main>
  )
}
