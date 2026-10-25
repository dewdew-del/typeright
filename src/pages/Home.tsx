import { Link } from 'react-router-dom'
import { Keyboard } from '../components/keyboard/Keyboard'

export function Home() {
  return (
    <div className="mx-auto max-w-4xl">
      <section className="py-6 text-center sm:py-12">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          Learn to type. <span className="text-accent">Race to the top.</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-muted">
          Learn the right finger for every key, build speed with guided lessons, then compete on the
          leaderboard and in live races.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/lessons"
            className="rounded-xl bg-accent px-5 py-3 font-semibold text-accent-contrast hover:opacity-90"
          >
            Start learning
          </Link>
          <Link
            to="/keyboard"
            className="rounded-xl border border-border bg-surface px-5 py-3 font-semibold hover:bg-surface-2"
          >
            Try the keyboard
          </Link>
        </div>
      </section>
      <Keyboard activeChar="f" />
    </div>
  )
}
