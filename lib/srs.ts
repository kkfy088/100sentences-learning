export function calculateNextReview(
  quality: number,
  current: {
    repetitionCount: number;
    easeFactor: number;
    intervalDays: number;
  }
): { repetitionCount: number; easeFactor: number; intervalDays: number; nextReviewDate: string } {
  let { repetitionCount, easeFactor, intervalDays } = current;

  easeFactor = Math.max(1.3, easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));

  if (quality < 3) {
    repetitionCount = 0;
    intervalDays = 1;
  } else {
    repetitionCount += 1;
    if (repetitionCount === 1) {
      intervalDays = 1;
    } else if (repetitionCount === 2) {
      intervalDays = 3;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  intervalDays = Math.min(intervalDays, 365);

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    repetitionCount,
    easeFactor: Math.round(easeFactor * 100) / 100,
    intervalDays,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

export function qualityFromAccuracy(accuracy: number): number {
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.85) return 4;
  if (accuracy >= 0.60) return 3;
  if (accuracy >= 0.30) return 2;
  if (accuracy >= 0.10) return 1;
  return 0;
}

export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}
