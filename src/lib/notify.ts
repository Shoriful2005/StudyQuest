export const notifSupported = () => typeof window !== 'undefined' && 'Notification' in window
export const notifPermission = (): NotificationPermission | 'unsupported' =>
  notifSupported() ? Notification.permission : 'unsupported'

export async function askNotifPermission() {
  if (!notifSupported()) return 'unsupported' as const
  return Notification.requestPermission()
}

/** Browser (OS-level) notification. Only works while the site is open in a tab. */
export function browserNotify(title: string, body: string, tag?: string) {
  if (!notifSupported() || Notification.permission !== 'granted') return
  try {
    const n = new Notification(title, { body, tag })
    n.onclick = () => { window.focus(); n.close() }
  } catch { /* some mobile browsers only allow notifications from a service worker */ }
}
