import { Audio } from "expo-av";
import * as Haptics from "expo-haptics";
import * as Speech from "expo-speech";

export async function playDecadeTransitionPrompt(decadeNumber: number) {
  await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
  });
  Speech.speak(`Begin decade ${decadeNumber}.`, {
    rate: 0.95,
    pitch: 1.0,
  });
  return `Decade ${decadeNumber} started`;
}

export async function playSessionCompletedPrompt() {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  await Audio.setAudioModeAsync({
    playsInSilentModeIOS: true,
  });
  Speech.speak("Session complete. Great job finishing your rosary run.", {
    rate: 0.95,
    pitch: 1.0,
  });
}

