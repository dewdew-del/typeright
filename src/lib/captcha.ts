/**
 * Cloudflare Turnstile (free) in front of Supabase sign-ins, so bots can't mass-create guests.
 * Off until VITE_TURNSTILE_SITE_KEY is set; Supabase checks the token once CAPTCHA protection
 * is switched on in Auth settings. Each token works once, so every call renders a fresh widget.
 * Most people never see it; a small check box appears only when Cloudflare is unsure.
 */

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'

interface Turnstile {
  render: (el: HTMLElement, options: Record<string, unknown>) => string
  remove: (id: string) => void
}
declare global {
  interface Window {
    turnstile?: Turnstile
  }
}

let loading: Promise<Turnstile> | null = null

function loadScript(): Promise<Turnstile> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')))
    script.onerror = () => {
      loading = null
      reject(new Error('turnstile'))
    }
    document.head.appendChild(script)
  })
  return loading
}

/** A one-time token for Supabase auth calls, or undefined when Turnstile isn't set up. */
export async function captchaToken(): Promise<string | undefined> {
  if (!SITE_KEY) return undefined
  const turnstile = await loadScript()
  const box = document.createElement('div')
  box.className = 'fixed bottom-4 left-1/2 z-[60] -translate-x-1/2'
  document.body.appendChild(box)
  let id = ''
  try {
    return await new Promise<string>((resolve, reject) => {
      id = turnstile.render(box, {
        sitekey: SITE_KEY,
        appearance: 'interaction-only',
        callback: resolve,
        'error-callback': () => reject(new Error('turnstile')),
        'timeout-callback': () => reject(new Error('turnstile')),
      })
    })
  } finally {
    if (id) turnstile.remove(id)
    box.remove()
  }
}
