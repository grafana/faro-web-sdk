declare module '@rrweb/packer' {
  import type { eventWithTime } from '@rrweb/types';
  export function pack(event: eventWithTime): string;
  export function unpack(raw: string): eventWithTime;
}
