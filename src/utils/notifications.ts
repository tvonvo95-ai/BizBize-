/**
 * BizBize ❤️ Notification Service
 * Supports Browser Web Notifications and In-App Toast alerts
 */

export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

export function showSystemNotification(title: string, body: string, icon?: string) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        body,
        icon: icon || 'https://api.dicebear.com/7.x/identicon/svg?seed=bizbize',
        badge: 'https://api.dicebear.com/7.x/identicon/svg?seed=bizbize',
      });
      notif.onclick = () => {
        window.focus();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('System notification error:', err);
  }
}
