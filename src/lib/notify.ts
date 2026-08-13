let ctx: AudioContext | null = null;

/** Cria/desbloqueia o contexto de áudio (deve ser chamado num gesto do usuário). */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
  } catch {
    /* ignore */
  }
}

function beep(at: number, freq: number, duration = 0.18) {
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, at);
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(0.35, at + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Alerta sonoro curto gerado no próprio app (sem arquivo de áudio). */
export function playAlertSound() {
  try {
    unlockAudio();
    if (!ctx) return;
    const now = ctx.currentTime;
    beep(now, 880);
    beep(now + 0.22, 1170);
    beep(now + 0.44, 1480, 0.24);
  } catch {
    /* ignore */
  }
}

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  return notificationsSupported() ? Notification.permission : "unsupported";
}

export async function requestNotificationPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!notificationsSupported()) return "unsupported";
  unlockAudio();
  try {
    return await Notification.requestPermission();
  } catch {
    return Notification.permission;
  }
}

export function showSystemNotification(title: string, body: string, tag?: string) {
  try {
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  } catch {
    /* ignore */
  }
  if (!notificationsSupported() || Notification.permission !== "granted") return;
  try {
    new Notification(title, {
      body,
      tag,
      icon: "/icons/icon-512x512.png",
      badge: "/icons/icon-512x512.png",
    });
  } catch {
    /* ignore */
  }
}
