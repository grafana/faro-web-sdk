import { defaultExceptionType } from '@grafana/faro-core';

import { valueTypeRegex } from './const';

export function getValueAndTypeFromMessage(message: string): [string, string] {
  const groups = message.match(valueTypeRegex);

  const type = groups?.[1] ?? defaultExceptionType;
  const value = groups?.[2] ?? message;

  return [value, type];
}
