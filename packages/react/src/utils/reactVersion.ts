import { version } from 'react';

export const reactVersion: string = version;
export const reactVersionMajor: number | null = getMajorReactVersion();
export const isReactVersionAtLeast19: boolean = isReactVersionAtLeast(19);
export const isReactVersionAtLeast18: boolean = isReactVersionAtLeast(18);
export const isReactVersionAtLeast17: boolean = isReactVersionAtLeast(17);
export const isReactVersionAtLeast16: boolean = isReactVersionAtLeast(16);

export function getMajorReactVersion(): number | null {
  const major = reactVersion.split('.');

  try {
    return major[0] ? parseInt(major[0], 10) : null;
  } catch (_err) {
    return null;
  }
}

export function isReactVersionAtLeast(version: number): boolean {
  return reactVersionMajor === null ? false : reactVersionMajor >= version;
}
