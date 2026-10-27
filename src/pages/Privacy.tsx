import type { ReactNode } from 'react'

const UPDATED = '27 October 2026'

/** Plain-language privacy policy (Google sign-in requires one before the app can go public). */
export function Privacy() {
  return (
    <main className="mx-auto flex max-w-[760px] flex-col gap-6 px-6 pb-16 pt-2 leading-relaxed">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Privacy policy</h1>
        <p className="mt-1 text-sm text-muted">Last updated {UPDATED}</p>
      </div>

      <p>
        TypeRight is a free typing trainer made as a personal portfolio project. This page explains what it stores
        about you and why. It does not sell your data, show ads or use tracking cookies.
      </p>

      <Section title="Playing without an account">
        Lessons, practice and casual typing work without logging in. Your progress is kept in your own browser only.
        If you play online as a guest, a temporary guest account is created so races and leaderboard runs can be
        checked. Guest accounts and everything linked to them are deleted automatically after 14 days.
      </Section>

      <Section title="What we store when you log in">
        <ul className="ml-5 list-disc space-y-1">
          <li>Your email address, to log you in.</li>
          <li>If you use Google: your name and email address from Google. TypeRight does not get access to anything else in your Google account.</li>
          <li>Your username, country and profile photo, if you set them. These are shown on the leaderboards, in races and on your public profile. The leaderboards also show your speed and accuracy, and the time of Endless runs.</li>
          <li>Your lesson progress, typing results (speed, accuracy and how long the run lasted) and which keys you miss most.</li>
          <li>Which casual typing stories you have finished, so you get new ones until you have read them all.</li>
          <li>Friend races: the rooms you join and your race results. Other players in the room can see your username.</li>
          <li>For leaderboard and race runs: the timing of each key press, used only to check the result is genuine. These logs are deleted after 30 days.</li>
        </ul>
      </Section>

      <Section title="People online">
        The home page shows how many people have TypeRight open right now. This is a live counter only: each open tab
        uses a random, temporary id that is forgotten when the tab closes. No names, accounts or locations are used.
      </Section>

      <Section title="On your device">
        Your settings (theme, text size, sound) and the last home page wallpaper you saw are kept in your own browser.
        They are not sent anywhere.
      </Section>

      <Section title="Where it is kept">
        Data is stored with Supabase (database and login) and the website is hosted by Vercel. Google is used only
        if you choose to log in with Google. Cloudflare may run a quick check that you are human when you log in.
      </Section>

      <Section title="Your choices">
        You can change your username, country and photo at any time in your profile. To delete your account and all
        its data, contact the developer using the support email shown on TypeRight's Google sign-in screen, and it
        will be removed.
      </Section>

      <Section title="Children">
        TypeRight is suitable for learners of all ages but does not knowingly collect more than an email address
        from anyone. Younger children can use it without an account.
      </Section>

      <Section title="Changes">
        If this policy changes, the date at the top will change too.
      </Section>
    </main>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      <div className="text-text">{children}</div>
    </section>
  )
}
