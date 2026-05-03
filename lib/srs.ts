/**
 * 间隔重复算法 — 基于 SM-2（SuperMemo-2）的记忆调度
 *
 * 根据学生每次翻译的正确率，动态调整复习间隔。
 * 核心思想：回答得越好，下次复习间隔越长；
 * 回答得越差，回退到更短的间隔。
 *
 * 参考：Piotr Wozniak 的 SuperMemo SM-2 算法
 */

/**
 * 计算下一次复习时间
 *
 * @param quality  本次回答质量 (0-5)，0=全错 5=完美
 * @param current  当前的学习状态
 * @returns        更新后的状态（重复次数、难度系数、间隔天数、下次复习日期）
 */
export function calculateNextReview(
  quality: number,
  current: {
    repetitionCount: number;  // 已成功复习的次数
    easeFactor: number;       // 难度系数（默认 2.5，越小越难）
    intervalDays: number;     // 当前间隔天数
  }
): { repetitionCount: number; easeFactor: number; intervalDays: number; nextReviewDate: string } {
  let { repetitionCount, easeFactor, intervalDays } = current;

  // 根据回答质量调整难度系数
  // 质量越好，easeFactor 越大 → 间隔增长越快
  easeFactor = Math.max(
    1.3,  // easeFactor 最低 1.3，防止间隔永不增长
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  );

  if (quality < 3) {
    // 回答不合格 → 重置重复次数，从第 1 天重新开始
    repetitionCount = 0;
    intervalDays = 1;
  } else {
    // 回答合格 → 增加重复次数，按阶梯增长间隔
    repetitionCount += 1;
    if (repetitionCount === 1) {
      intervalDays = 1;   // 第1次成功：1天后复习
    } else if (repetitionCount === 2) {
      intervalDays = 3;   // 第2次成功：3天后复习
    } else {
      // 第3次及以后：间隔 × 难度系数
      intervalDays = Math.round(intervalDays * easeFactor);
    }
  }

  // 最长间隔不超过 365 天
  intervalDays = Math.min(intervalDays, 365);

  // 计算具体的下次复习日期
  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + intervalDays);

  return {
    repetitionCount,
    easeFactor: Math.round(easeFactor * 100) / 100,  // 保留两位小数
    intervalDays,
    nextReviewDate: nextReviewDate.toISOString(),
  };
}

/**
 * 将正确率 (0-1) 映射为 SM-2 回答质量 (0-5)
 *
 * 映射表：
 * ≥95% → 5（完美）
 * ≥85% → 4（优秀）
 * ≥60% → 3（合格）
 * ≥30% → 2（较差）
 * ≥10% → 1（很差）
 *  <10% → 0（完全忘记）
 */
export function qualityFromAccuracy(accuracy: number): number {
  if (accuracy >= 0.95) return 5;
  if (accuracy >= 0.85) return 4;
  if (accuracy >= 0.60) return 3;
  if (accuracy >= 0.30) return 2;
  if (accuracy >= 0.10) return 1;
  return 0;
}

/** 获取当前日期字符串 (YYYY-MM-DD)，用于日志记录 */
export function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}
