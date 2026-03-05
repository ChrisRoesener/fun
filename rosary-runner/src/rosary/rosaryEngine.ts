export type RosaryMode = "singleDecade" | "fiveDecades" | "custom";

export type RosaryConfig = {
  mode: RosaryMode;
  totalDecades: number;
  targetDistanceMeters: number;
};

export type RosaryProgressInput = {
  elapsedSeconds: number;
  distanceMeters: number;
  paceSecPerKm: number | null;
};

export type RosaryTransition = {
  advanced: boolean;
  decadeIndex: number;
  completed: boolean;
  distanceToNextDecadeMeters: number;
  estimatedTimeRemainingSec: number | null;
};

export class RosaryEngine {
  private readonly config: RosaryConfig;
  private currentDecadeIndex = 0;

  constructor(config: RosaryConfig) {
    this.config = {
      ...config,
      totalDecades: Math.max(1, config.totalDecades),
      targetDistanceMeters: Math.max(100, config.targetDistanceMeters),
    };
  }

  getDecadeDistanceMeters(): number {
    return this.config.targetDistanceMeters / this.config.totalDecades;
  }

  evaluate(input: RosaryProgressInput): RosaryTransition {
    const decadeDistance = this.getDecadeDistanceMeters();
    const expectedDecade = Math.min(
      this.config.totalDecades,
      Math.floor(input.distanceMeters / decadeDistance)
    );

    const previous = this.currentDecadeIndex;
    this.currentDecadeIndex = Math.max(this.currentDecadeIndex, expectedDecade);

    const completed = this.currentDecadeIndex >= this.config.totalDecades;
    const nextTriggerDistance = Math.min(
      this.config.targetDistanceMeters,
      (this.currentDecadeIndex + 1) * decadeDistance
    );
    const distanceToNextDecadeMeters = Math.max(
      0,
      nextTriggerDistance - input.distanceMeters
    );

    const pace = input.paceSecPerKm;
    const estimatedTimeRemainingSec =
      pace && pace > 0
        ? ((this.config.targetDistanceMeters - input.distanceMeters) / 1000) *
          pace
        : null;

    return {
      advanced: this.currentDecadeIndex > previous,
      decadeIndex: this.currentDecadeIndex,
      completed,
      distanceToNextDecadeMeters,
      estimatedTimeRemainingSec,
    };
  }
}

export function decadesFromMode(mode: RosaryMode, customDecades: number): number {
  if (mode === "singleDecade") return 1;
  if (mode === "fiveDecades") return 5;
  return Math.max(1, customDecades);
}

