import type { AnomalyLevel } from '../types/bill.types';

export function getAnomalyLevel(score: number): AnomalyLevel {
  if (score <= 10) return 'low';
  if (score <= 40) return 'medium';
  return 'high';
}

export function getAnomalyLabel(percentAbove: number | null): string {
  if (percentAbove === null) return 'No benchmark data';
  if (percentAbove <= 0) return 'Within regional range';
  return `${Math.round(percentAbove)}% above regional average`;
}

export function getBillRiskLevel(
  items: { anomalyScore: number; anomalyFlag: boolean }[]
): AnomalyLevel {
  const flagged = items.filter((i) => i.anomalyFlag);
  if (flagged.length === 0) return 'none';
  const maxScore = Math.max(...flagged.map((i) => i.anomalyScore));
  return getAnomalyLevel(maxScore);
}
