export function ComingSoon({ title, stage }: { title: string; stage: number }) {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-2 text-muted">Coming in Stage {stage}.</p>
    </div>
  )
}
