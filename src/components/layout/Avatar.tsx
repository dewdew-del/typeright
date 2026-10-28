import { useState } from 'react'

/** Round avatar: the image when a link is set and loads, otherwise the first letter of the name. */
export function Avatar({ name, url, size = 34 }: { name: string; url?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false)
  const style = { width: size, height: size }
  if (url && !broken) {
    return <img src={url} alt="" loading="lazy" decoding="async" style={style} className="shrink-0 rounded-full border border-border object-cover" onError={() => setBroken(true)} referrerPolicy="no-referrer" />
  }
  return (
    <span aria-hidden style={{ ...style, fontSize: size * 0.42 }} className="grid shrink-0 place-items-center rounded-full bg-accent-soft font-extrabold text-accent">
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
