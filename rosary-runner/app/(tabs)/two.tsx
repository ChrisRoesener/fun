import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { FlatList, StyleSheet, Text, View } from "react-native";
import { loadSessions, type SessionRecord } from "@/src/state/sessionStore";

const formatDistanceKm = (meters: number) => `${(meters / 1000).toFixed(2)} km`;

export default function HistoryScreen() {
  const [sessions, setSessions] = useState<SessionRecord[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadSessions().then(setSessions).catch(() => setSessions([]));
    }, [])
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Session History</Text>
      {sessions.length === 0 ? (
        <Text style={styles.empty}>No sessions yet. Start your first rosary run.</Text>
      ) : (
        <FlatList
          data={sessions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>
                {new Date(item.startedAtISO).toLocaleString()}
              </Text>
              <Text>
                {formatDistanceKm(item.distanceMeters)} in {Math.round(item.durationSeconds / 60)}m
              </Text>
              <Text>
                Decades: {item.completedDecades}/{item.totalDecades}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 12,
  },
  empty: {
    color: "#64748b",
  },
  card: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    gap: 4,
  },
  cardTitle: {
    fontWeight: "600",
  },
});
