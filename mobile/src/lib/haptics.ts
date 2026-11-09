import * as Haptics from 'expo-haptics';

export async function tapFeedback(): Promise<void> {
  try {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  } catch {
    // Haptics are a nice-to-have; never block an action because of them.
  }
}

export async function successFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  } catch {
    // ignore
  }
}

export async function warningFeedback(): Promise<void> {
  try {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  } catch {
    // ignore
  }
}

export async function selectionFeedback(): Promise<void> {
  try {
    await Haptics.selectionAsync();
  } catch {
    // ignore
  }
}
