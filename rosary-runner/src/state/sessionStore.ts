import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RosaryMode } from "../rosary/rosaryEngine";

export type SessionRecord = {
  id: string;
  startedAtISO: string;
  durationSeconds: number;
  distanceMeters: number;
  selectedMode: RosaryMode;
  totalDecades: number;
  completedDecades: number;
};

export type UserSettings = {
  defaultMode: RosaryMode;
  customDecades: number;
  targetDistanceMeters: number;
  hapticsEnabled: boolean;
  voicePromptsEnabled: boolean;
};

const SESSIONS_KEY = "rosary_runner_sessions_v1";
const SETTINGS_KEY = "rosary_runner_settings_v1";

export const defaultSettings: UserSettings = {
  defaultMode: "fiveDecades",
  customDecades: 5,
  targetDistanceMeters: 3200,
  hapticsEnabled: true,
  voicePromptsEnabled: true,
};

export async function loadSessions(): Promise<SessionRecord[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as SessionRecord[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const sessions = await loadSessions();
  const next = [record, ...sessions].slice(0, 100);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(next));
}

export async function loadSettings(): Promise<UserSettings> {
  const raw = await AsyncStorage.getItem(SETTINGS_KEY);
  if (!raw) return defaultSettings;
  try {
    const parsed = JSON.parse(raw) as Partial<UserSettings>;
    return {
      ...defaultSettings,
      ...parsed,
    };
  } catch {
    return defaultSettings;
  }
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

