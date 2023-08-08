// @ts-expect-error
export const Event = (typeof Event !== 'undefined' ? Event : undefined) as unknown as typeof globalThis.Event;
