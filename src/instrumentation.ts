export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const cron = await import('node-cron')
    const { generateWeeklyReport, generateMonthlyReport } = await import('@/lib/report-generator')

    // Weekly report: Every Sunday at 8:00 AM
    cron.schedule('0 8 * * 0', async () => {
      console.log('[Scheduler] Generating weekly report...')
      try {
        const id = await generateWeeklyReport()
        console.log(`[Scheduler] Weekly report generated: #${id}`)

        // Desktop notification (Arch Linux)
        try {
          const { exec } = await import('child_process')
          exec('notify-send "FinTrack" "Your weekly financial report is ready!" -i dialog-information')
        } catch {}
      } catch (e) {
        console.error('[Scheduler] Failed to generate weekly report:', e)
      }
    })

    // Monthly report: 1st of each month at 8:00 AM
    cron.schedule('0 8 1 * *', async () => {
      console.log('[Scheduler] Generating monthly report...')
      try {
        const id = await generateMonthlyReport()
        console.log(`[Scheduler] Monthly report generated: #${id}`)

        try {
          const { exec } = await import('child_process')
          exec('notify-send "FinTrack" "Your monthly financial statement is ready!" -i dialog-information')
        } catch {}
      } catch (e) {
        console.error('[Scheduler] Failed to generate monthly report:', e)
      }
    })

    console.log('[Scheduler] Report scheduling initialized - Weekly: Sunday 8AM, Monthly: 1st 8AM')
  }
}
