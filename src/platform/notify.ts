/** Desktop notifications via the service worker (falls back to `new Notification`). */

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  return notificationsSupported() ? Notification.permission : 'unsupported';
}

export async function requestNotifications(): Promise<NotificationPermission | 'unsupported'> {
  if (!notificationsSupported()) return 'unsupported';
  try {
    return await Notification.requestPermission();
  } catch (err) {
    console.error('[notify] permission request failed', err);
    return Notification.permission;
  }
}

export async function showNotification(title: string, body: string, opts: { tag?: string; silent?: boolean } = {}): Promise<void> {
  if (notificationPermission() !== 'granted') return;
  const options: NotificationOptions = {
    body,
    tag: opts.tag ?? 'routine-hud',
    silent: opts.silent ?? false,
    icon: `${import.meta.env.BASE_URL}pwa-192.png`,
    badge: `${import.meta.env.BASE_URL}pwa-192.png`,
    data: { url: location.href },
  };
  try {
    const reg = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration() : undefined;
    if (reg?.active) {
      await reg.showNotification(title, options);
      return;
    }
    new Notification(title, options);
  } catch (err) {
    console.error('[notify] failed', err);
  }
}
