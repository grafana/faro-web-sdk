// @ts-ignore
export const NODE_ENV = process.env.NODE_ENV ?? 'development';

const prod = NODE_ENV === 'production';
const test = !prod && NODE_ENV === 'test';
const dev = !prod && !test;
export const env = { prod, test, dev };

export const clientPackageName = '@grafana/agent-demo-client';
export const serverPackageName = '@grafana/agent-demo-server';
export const packageVersion = '0.0.1';
