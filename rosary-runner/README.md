# Rosary Runner

Rosary Runner is a cross-platform Expo app that combines GPS-based run tracking with rosary prayer pacing.

## MVP Features

- Live distance, duration, and pace tracking with device GPS.
- Rosary modes: single decade, five decades, or custom decade count.
- Adaptive decade progression based on real distance covered.
- Voice and haptic prompts on decade transitions.
- Session summary and local session history.

## Tech Stack

- React Native + Expo Router
- TypeScript
- `expo-location` for GPS tracking
- `expo-av` + `expo-speech` for prayer prompts
- `expo-haptics` for tactile cues
- AsyncStorage for session persistence

## Quick Start

1. Install dependencies:
   - `npm install`
2. Start dev server:
   - `npm run start`
3. Run on a device/simulator:
   - `npm run ios`
   - `npm run android`

## Current Limitations

- Foreground tracking only in MVP.
- Voice prompts are generic and not yet prayer-text specific.
- Pace smoothing is minimal and can be tuned further for noisy GPS conditions.

