import { version } from 'react';

export const reactVersion = version;
export const reactVersionMajor = getMajorReactVersion();
export const isReactVersionAtLeast18 = isReactVersionAtLeast(18);
export const isReactVersionAtLeast17 = isReactVersionAtLeast(17);
export const isReactVersionAtLeast16 = isReactVersionAtLeast(16);

export function getMajorReactVersion(): number | null {
  const major = reactVersion.split('.');

  try {
    return major[0] ? parseInt(major[0], 10) : null;
  } catch (err) {
    return null;
  }
}

export function isReactVersionAtLeast(version: number): boolean {
  return reactVersionMajor === null ? false : reactVersionMajor >= version;
}
