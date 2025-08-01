import type { Faro } from '@grafana/faro-core';

declare global {
  interface Window {
    faro: Faro;
  }
}
