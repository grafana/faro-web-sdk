export function clampSamplingRate(samplingRate: number): number {
  return Math.min(1, Math.max(0, samplingRate));
}
