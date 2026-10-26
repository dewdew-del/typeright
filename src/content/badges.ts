// Badge definitions. The server awards them (see the Stage 7 migration); this file only describes them.
export interface BadgeDef {
  id: string
  name: string
  description: string
  /** Short text drawn inside the badge. */
  mark: string
}

export const BADGES: BadgeDef[] = [
  { id: 'wpm-30', name: '30 WPM', description: 'A ranked run at 30 WPM or more with 95% accuracy.', mark: '30' },
  { id: 'wpm-50', name: '50 WPM', description: 'A ranked run at 50 WPM or more with 95% accuracy.', mark: '50' },
  { id: 'wpm-70', name: '70 WPM', description: 'A ranked run at 70 WPM or more with 95% accuracy.', mark: '70' },
  { id: 'wpm-100', name: '100 WPM', description: 'A ranked run at 100 WPM or more with 95% accuracy.', mark: '100' },
  { id: 'accuracy-98', name: 'Sharp shooter', description: '98% accuracy at 30 WPM or more.', mark: '98%' },
  { id: 'accuracy-100', name: 'Flawless', description: 'A ranked run with zero mistakes.', mark: '100%' },
  { id: 'streak-3', name: '3-day streak', description: 'Practiced three days in a row.', mark: '3d' },
  { id: 'streak-7', name: '7-day streak', description: 'Practiced a whole week in a row.', mark: '7d' },
  { id: 'streak-30', name: '30-day streak', description: 'Practiced 30 days in a row.', mark: '30d' },
  { id: 'daily-player', name: 'Daily challenger', description: 'Played a daily challenge.', mark: 'D' },
  { id: 'first-race', name: 'First race', description: 'Finished a live race.', mark: 'R' },
  { id: 'race-winner', name: 'Race winner', description: 'First to finish a race against others.', mark: '1st' },
]

export const badgeById = (id: string) => BADGES.find((b) => b.id === id)
