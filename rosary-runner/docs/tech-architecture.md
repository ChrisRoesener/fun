# Technical Architecture (MVP)

## Overview

The app uses a lightweight, client-only architecture optimized for rapid iteration on mobile devices.

## Runtime Modules

- `app/(tabs)/index.tsx`
  - Main run session UI.
  - Orchestrates tracking lifecycle and rosary state transitions.
- `src/services/locationService.ts`
  - GPS permission requests and watch subscription management.
  - Filters noisy points and computes cumulative distance/instant pace.
- `src/rosary/rosaryEngine.ts`
  - Converts distance progress into decade transitions.
  - Maintains current decade and completion detection.
- `src/services/promptService.ts`
  - Delivers voice + haptic cues on transitions and completion.
- `src/state/sessionStore.ts`
  - Persists settings and session history to AsyncStorage.

## Data Model

- `SessionRecord`
  - Session identity, timing, distance, chosen mode, and decade completion.
- `UserSettings`
  - Preferred mode, target distance, custom decade count, and prompt toggles.

## Constraints and Risks

- GPS accuracy can vary significantly by environment and hardware.
- Continuous location + voice prompts can affect battery life.
- Background tracking is not enabled in MVP and requires extra platform setup.

## Next Technical Milestones

1. Add background tracking with explicit user opt-in and policy-safe permissions.
2. Improve pace smoothing and adaptive transition heuristics.
3. Add configurable prayer content and stronger audio controls.
4. Add tests for `rosaryEngine` and location filtering logic.

