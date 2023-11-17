export function isSampled(samplingRate: number) {
  if (Number.isNaN(samplingRate)) {
    return false;
  }

  return Math.random() < samplingRate;
}
