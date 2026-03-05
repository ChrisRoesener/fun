import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { decadesFromMode, RosaryEngine, RosaryMode } from "@/src/rosary/rosaryEngine";
import {
  requestLocationPermissions,
  startLocationTracking,
  type LocationTracker,
} from "@/src/services/locationService";
import {
  playDecadeTransitionPrompt,
  playSessionCompletedPrompt,
} from "@/src/services/promptService";
import {
  loadSettings,
  defaultSettings,
  saveSettings,
  saveSession,
  type SessionRecord,
} from "@/src/state/sessionStore";

const formatDistanceKm = (meters: number) => `${(meters / 1000).toFixed(2)} km`;
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};
const formatPace = (secPerKm: number | null) => {
  if (!secPerKm || !Number.isFinite(secPerKm)) return "--:-- /km";
  const mins = Math.floor(secPerKm / 60);
  const secs = Math.round(secPerKm % 60);
  return `${mins}:${secs.toString().padStart(2, "0")} /km`;
};

export default function RunScreen() {
  const router = useRouter();
  const trackerRef = useRef<LocationTracker | null>(null);
  const engineRef = useRef<RosaryEngine | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [mode, setMode] = useState<RosaryMode>("fiveDecades");
  const [customDecadesInput, setCustomDecadesInput] = useState("5");
  const [targetDistanceInput, setTargetDistanceInput] = useState("3200");
  const [isRunning, setIsRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [distanceMeters, setDistanceMeters] = useState(0);
  const [paceSecPerKm, setPaceSecPerKm] = useState<number | null>(null);
  const [currentDecade, setCurrentDecade] = useState(0);
  const [statusText, setStatusText] = useState("Ready to begin.");

  const customDecades = useMemo(
    () => Math.max(1, Number.parseInt(customDecadesInput, 10) || 1),
    [customDecadesInput]
  );
  const targetDistanceMeters = useMemo(
    () => Math.max(400, Number.parseInt(targetDistanceInput, 10) || 400),
    [targetDistanceInput]
  );
  const totalDecades = decadesFromMode(mode, customDecades);

  useEffect(() => {
    loadSettings()
      .then((settings) => {
        setMode(settings.defaultMode);
        setCustomDecadesInput(`${settings.customDecades}`);
        setTargetDistanceInput(`${settings.targetDistanceMeters}`);
      })
      .catch(() => {
        setMode(defaultSettings.defaultMode);
      });

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      trackerRef.current?.stop();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      saveSettings({
        ...defaultSettings,
        defaultMode: mode,
        customDecades,
        targetDistanceMeters,
      }).catch(() => undefined);
    }, 250);

    return () => clearTimeout(timeout);
  }, [mode, customDecades, targetDistanceMeters]);

  const stopSession = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    trackerRef.current?.stop();
    trackerRef.current = null;
    setIsRunning(false);
  };

  const finishSession = async (completedDecades: number) => {
    await stopSession();
    await playSessionCompletedPrompt();
    const record: SessionRecord = {
      id: `${Date.now()}`,
      startedAtISO: new Date(startTimeRef.current ?? Date.now()).toISOString(),
      durationSeconds: elapsedSeconds,
      distanceMeters,
      selectedMode: mode,
      totalDecades,
      completedDecades,
    };
    await saveSession(record);
    router.push({
      pathname: "/session-summary",
      params: {
        distanceMeters: `${record.distanceMeters}`,
        durationSeconds: `${record.durationSeconds}`,
        completedDecades: `${record.completedDecades}`,
        totalDecades: `${record.totalDecades}`,
      },
    });
  };

  const startSession = async () => {
    const hasPermission = await requestLocationPermissions();
    if (!hasPermission) {
      Alert.alert(
        "Location Required",
        "Please allow location access to track run distance."
      );
      return;
    }

    setElapsedSeconds(0);
    setDistanceMeters(0);
    setPaceSecPerKm(null);
    setCurrentDecade(0);
    setStatusText("Session in progress...");
    setIsRunning(true);
    startTimeRef.current = Date.now();

    engineRef.current = new RosaryEngine({
      mode,
      totalDecades,
      targetDistanceMeters,
    });

    timerRef.current = setInterval(() => {
      if (!startTimeRef.current) return;
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      setElapsedSeconds(elapsed);
    }, 1000);

    try {
      trackerRef.current = await startLocationTracking(async (update) => {
        setDistanceMeters(update.cumulativeDistanceMeters);
        setPaceSecPerKm(update.instantaneousPaceSecPerKm);

        if (!engineRef.current || !startTimeRef.current) return;
        const transition = engineRef.current.evaluate({
          elapsedSeconds: Math.floor((Date.now() - startTimeRef.current) / 1000),
          distanceMeters: update.cumulativeDistanceMeters,
          paceSecPerKm: update.instantaneousPaceSecPerKm,
        });

        setCurrentDecade(transition.decadeIndex);
        if (transition.advanced && transition.decadeIndex <= totalDecades) {
          const message = await playDecadeTransitionPrompt(
            transition.decadeIndex + 1
          );
          setStatusText(message);
        }

        if (transition.completed) {
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          await finishSession(transition.decadeIndex);
        }
      });
    } catch (error) {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      await stopSession();
      Alert.alert("Tracking Error", "Unable to start location updates.");
      setStatusText(
        error instanceof Error ? error.message : "Tracking initialization failed."
      );
    }
  };

  const handleStopPress = async () => {
    await stopSession();
    setStatusText("Session paused. You can start again.");
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Rosary Runner</Text>
      <Text style={styles.subtitle}>
        Pray while you run with adaptive decade pacing.
      </Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Prayer Mode</Text>
        <View style={styles.row}>
          {(["singleDecade", "fiveDecades", "custom"] as RosaryMode[]).map(
            (nextMode) => (
              <Pressable
                key={nextMode}
                style={[styles.modeChip, mode === nextMode && styles.modeChipActive]}
                onPress={() => setMode(nextMode)}
              >
                <Text style={styles.modeChipText}>{nextMode}</Text>
              </Pressable>
            )
          )}
        </View>
        {mode === "custom" && (
          <TextInput
            value={customDecadesInput}
            onChangeText={setCustomDecadesInput}
            keyboardType="numeric"
            editable={!isRunning}
            style={styles.input}
            placeholder="Custom decades"
          />
        )}
        <TextInput
          value={targetDistanceInput}
          onChangeText={setTargetDistanceInput}
          keyboardType="numeric"
          editable={!isRunning}
          style={styles.input}
          placeholder="Target distance in meters"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Live Session</Text>
        <Text style={styles.metric}>Distance: {formatDistanceKm(distanceMeters)}</Text>
        <Text style={styles.metric}>Duration: {formatDuration(elapsedSeconds)}</Text>
        <Text style={styles.metric}>Pace: {formatPace(paceSecPerKm)}</Text>
        <Text style={styles.metric}>
          Decade: {Math.min(currentDecade, totalDecades)} / {totalDecades}
        </Text>
        <Text style={styles.status}>{statusText}</Text>
      </View>

      <View style={styles.row}>
        {!isRunning ? (
          <Pressable style={styles.primaryButton} onPress={startSession}>
            <Text style={styles.buttonText}>Start</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={handleStopPress}>
            <Text style={styles.buttonText}>Stop</Text>
          </Pressable>
        )}
      </View>

      <Text style={styles.smallPrint}>
        Default settings snapshot: {mode}, {customDecades} decades, {targetDistanceMeters}m.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 15,
    color: "#4a5568",
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#d1d5db",
    padding: 14,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#d1d5db",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modeChipActive: {
    backgroundColor: "#e6f4ea",
    borderColor: "#16a34a",
  },
  modeChipText: {
    fontWeight: "500",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
  },
  metric: {
    fontSize: 16,
  },
  status: {
    marginTop: 4,
    color: "#334155",
  },
  primaryButton: {
    backgroundColor: "#166534",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  secondaryButton: {
    backgroundColor: "#9f1239",
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
  smallPrint: {
    color: "#64748b",
    fontSize: 12,
  },
});
