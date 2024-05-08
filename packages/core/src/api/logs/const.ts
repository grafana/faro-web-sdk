import type { LogArgsSerializer } from './types';

export const defaultLogArgsSerializer: LogArgsSerializer = (args) =>
  args
    .map((arg) => {
      try {
        return String(arg);
      } catch (err) {
        return '';
      }
    })
    .join(' ');
