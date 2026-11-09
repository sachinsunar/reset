import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import type { NotificationPreferences } from '@/types';
import { isTimeWithinQuietHours, timeToMinutes } from './date';

const COPY: Record<string, { title: string; body: string }> = {
  wake: {
    title: 'Good morning',
    body: 'A gentle start. Water, light, and one small step.',
  },
  movement: {
    title: 'Morning movement',
    body: 'A short walk or an easy session is enough today.',
  },
  study: {
    title: 'First study block',
    body: 'Begin with the first small question. You do not need to finish everything.',
  },
  revision: {
    title: 'Evening revision',
    body: 'A short recall session, then let the day be done.',
  },
  journal: {
    title: 'Evening reflection',
    body: 'Three optional lines about today. No judgement.',
  },
  bedtime: {
    title: 'Wind-down',
    body: 'Screens down when you can. Sleep is part of the plan.',
  },
};

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reset-reminders', {
    name: 'Gentle reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 120],
    lightColor: '#B94DF2',
    sound: null,
  });
}

export async function requestNotificationPermission(): Promise<boolean> {
  await ensureAndroidChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Notifications.requestPermissionsAsync();
  return result.granted;
}

export async function getNotificationPermission(): Promise<boolean> {
  const current = await Notifications.getPermissionsAsync();
  return current.granted;
}

export async function cancelAllReminders(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // Scheduling is unavailable on some environments (e.g. web / Expo Go limits).
  }
}

export async function scheduleReminders(
  prefs: NotificationPreferences,
  wakeTime: string,
): Promise<{ scheduled: number; skippedQuiet: number }> {
  await cancelAllReminders();
  if (!prefs.enabled) return { scheduled: 0, skippedQuiet: 0 };
  const granted = await requestNotificationPermission();
  if (!granted) return { scheduled: 0, skippedQuiet: 0 };
  await ensureAndroidChannel();

  let scheduled = 0;
  let skippedQuiet = 0;
  for (const item of prefs.items) {
    if (!item.enabled) continue;
    if (isTimeWithinQuietHours(item.time, prefs.quietStart, prefs.quietEnd)) {
      skippedQuiet++;
      continue;
    }
    const [hour, minute] = item.time.split(':').map(Number);
    const copy = COPY[item.key] ?? { title: 'Reset', body: 'A small step is enough.' };
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: copy.title,
          body: copy.body,
          sound: false,
          data: { kind: item.key, wakeTime },
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour,
          minute,
          channelId: 'reset-reminders',
        },
      });
      scheduled++;
    } catch {
      // Ignore individual scheduling failures and keep the rest working.
    }
  }
  return { scheduled, skippedQuiet };
}

export async function sendTestReminder(): Promise<void> {
  const granted = await requestNotificationPermission();
  if (!granted) return;
  await ensureAndroidChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'A small reminder',
      body: 'This is how gentle reminders will look. No pressure attached.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      channelId: 'reset-reminders',
    },
  });
}

export function minutesUntil(time: string, now: Date = new Date()): number {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  let diff = timeToMinutes(time) - nowMinutes;
  if (diff < 0) diff += 24 * 60;
  return diff;
}
