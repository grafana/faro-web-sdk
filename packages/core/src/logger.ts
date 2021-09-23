export interface Logger {
  event: (...args: unknown[]) => void;
}

export const logger: Logger = {
  event: (...args: unknown[]) => console.log(...args),
};
