export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron')
    const { generateWeeklyReport, generateMonthlyReport } = await import('@/lib/report-generator')
    const { getDb } = await import('@/lib/db')

    // Weekly report: Every Sunday at 8:00 AM
    cron.schedule('0 8 * * 0', async () => {
      console.log('[Scheduler] Generating weekly reports...')
      try {
        const db = getDb()
        const users = db.prepare('SELECT id FROM users').all() as { id: number }[]
        for (const user of users) {
          try {
            const id = await generateWeeklyReport(undefined, user.id)
            console.log(`[Scheduler] Weekly report #${id} generated for user ${user.id}`)
          } catch (e) {
            console.error(`[Scheduler] Failed weekly report for user ${user.id}:`, e)
          }
        }

        try {
          const { exec } = await import('child_process')
          exec('notify-send "FinTrack" "Weekly financial reports are ready!" -i dialog-information')
        } catch {}
      } catch (e) {
        console.error('[Scheduler] Failed to generate weekly reports:', e)
      }
    })

    // Monthly report: 1st of each month at 8:00 AM
    cron.schedule('0 8 1 * *', async () => {
      console.log('[Scheduler] Generating monthly reports...')
      try {
        const db = getDb()
        const users = db.prepare('SELECT id FROM users').all() as { id: number }[]
        for (const user of users) {
          try {
            const id = await generateMonthlyReport(undefined, user.id)
            console.log(`[Scheduler] Monthly report #${id} generated for user ${user.id}`)
          } catch (e) {
            console.error(`[Scheduler] Failed monthly report for user ${user.id}:`, e)
          }
        }

        try {
          const { exec } = await import('child_process')
          exec('notify-send "FinTrack" "Monthly financial statements are ready!" -i dialog-information')
        } catch {}
      } catch (e) {
        console.error('[Scheduler] Failed to generate monthly reports:', e)
      }
    })

    console.log('[Scheduler] Report scheduling initialized - Weekly: Sunday 8AM, Monthly: 1st 8AM')
  }
}
