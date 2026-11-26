import { catalog } from "../platform/locale/locale.ts";

// The notifications' menu as both apps write it: its title, the empty list, the clearing and the toast time setting.
// The alerts' own messages stay in notifications.ts.

/** The notifications menu's labels and screen-reader names. */
export const NOTIFICATION_TEXTS = catalog(
  {
    alerts: "Alertas",
    clear: "Limpar notificações",
    decrease: "Diminuir o tempo do aviso",
    duration: "Tempo do aviso",
    durationHint: "Quanto tempo cada aviso fica na tela",
    empty: "Nenhuma notificação",
    increase: "Aumentar o tempo do aviso",
    latest: "Últimas notificações",
    title: "Notificações",
    alertsUnread: (badge: string) => `Alertas, ${badge} não lidas`,
    unread: (badge: string) => `Notificações, ${badge} não lidas`,
  },
  {
    alerts: "Alerts",
    clear: "Clear notifications",
    decrease: "Shorten the toast time",
    duration: "Toast time",
    durationHint: "How long each toast stays on screen",
    empty: "No notifications",
    increase: "Lengthen the toast time",
    latest: "Latest notifications",
    title: "Notifications",
    alertsUnread: (badge) => `Alerts, ${badge} unread`,
    unread: (badge) => `Notifications, ${badge} unread`,
  },
);
