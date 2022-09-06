// @ts-ignore
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

const prod = NODE_ENV === 'production';
const test = !prod && NODE_ENV === 'test';
const dev = !prod && !test;
export const env = { prod, test, dev };
