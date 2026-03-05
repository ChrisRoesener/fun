import { Link, useLocalSearchParams } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

function formatDistanceKm(meters: number) {
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export default function SessionSummaryScreen() {
  const params = useLocalSearchParams<{
    distanceMeters?: string;
    durationSeconds?: string;
    completedDecades?: string;
    totalDecades?: string;
  }>();

  const distanceMeters = Number(params.distanceMeters ?? "0");
  const durationSeconds = Number(params.durationSeconds ?? "0");
  const completedDecades = Number(params.completedDecades ?? "0");
  const totalDecades = Number(params.totalDecades ?? "0");

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session Summary</Text>
      <Text style={styles.metric}>Distance: {formatDistanceKm(distanceMeters)}</Text>
      <Text style={styles.metric}>Duration: {formatDuration(durationSeconds)}</Text>
      <Text style={styles.metric}>
        Rosary: {completedDecades} / {totalDecades} decades
      </Text>

      <Link href="/(tabs)" asChild>
        <Pressable style={styles.button}>
          <Text style={styles.buttonText}>Back to Run Screen</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    justifyContent: "center",
    gap: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    marginBottom: 8,
  },
  metric: {
    fontSize: 18,
  },
  button: {
    marginTop: 16,
    backgroundColor: "#0f766e",
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: "flex-start",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "600",
  },
});

