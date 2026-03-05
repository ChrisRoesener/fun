import * as Location from "expo-location";

export type LocationPoint = {
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number | null;
};

export type LocationUpdate = {
  nextPoint: LocationPoint;
  cumulativeDistanceMeters: number;
  instantaneousPaceSecPerKm: number | null;
};

export type LocationTracker = {
  stop: () => void;
};

const MIN_ACCURACY_METERS = 40;
const MIN_DISTANCE_METERS = 2;

function toPoint(location: Location.LocationObject): LocationPoint {
  return {
    latitude: location.coords.latitude,
    longitude: location.coords.longitude,
    timestamp: location.timestamp,
    accuracy: location.coords.accuracy,
  };
}

function haversineDistanceMeters(a: LocationPoint, b: LocationPoint): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadius = 6371000;
  const latDelta = toRad(b.latitude - a.latitude);
  const lngDelta = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const sinLat = Math.sin(latDelta / 2);
  const sinLng = Math.sin(lngDelta / 2);
  const value =
    sinLat * sinLat +
    Math.cos(lat1) * Math.cos(lat2) * sinLng * sinLng;

  return 2 * earthRadius * Math.asin(Math.sqrt(value));
}

export async function requestLocationPermissions(): Promise<boolean> {
  const foreground = await Location.requestForegroundPermissionsAsync();
  if (!foreground.granted) {
    return false;
  }
  return true;
}

export async function startLocationTracking(
  onUpdate: (update: LocationUpdate) => void
): Promise<LocationTracker> {
  let cumulativeDistanceMeters = 0;
  let previousPoint: LocationPoint | null = null;

  const subscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 1500,
      distanceInterval: 1,
      mayShowUserSettingsDialog: true,
    },
    (position) => {
      const nextPoint = toPoint(position);
      const accuracy = nextPoint.accuracy ?? 999;
      if (accuracy > MIN_ACCURACY_METERS) {
        return;
      }

      if (!previousPoint) {
        previousPoint = nextPoint;
        onUpdate({
          nextPoint,
          cumulativeDistanceMeters,
          instantaneousPaceSecPerKm: null,
        });
        return;
      }

      const segmentDistance = haversineDistanceMeters(previousPoint, nextPoint);
      if (segmentDistance < MIN_DISTANCE_METERS) {
        return;
      }

      const timeDeltaSec = Math.max(
        1,
        (nextPoint.timestamp - previousPoint.timestamp) / 1000
      );
      cumulativeDistanceMeters += segmentDistance;
      const speedMetersPerSec = segmentDistance / timeDeltaSec;
      const paceSecPerKm =
        speedMetersPerSec > 0 ? 1000 / speedMetersPerSec : null;

      previousPoint = nextPoint;

      onUpdate({
        nextPoint,
        cumulativeDistanceMeters,
        instantaneousPaceSecPerKm: paceSecPerKm,
      });
    }
  );

  return {
    stop: () => {
      subscription.remove();
    },
  };
}

