import { valueTypeRegex } from './const';

export function getValueAndTypeFromMessage(message: string): [string, string] {
  const groups = message.match(valueTypeRegex);

  const type = groups?.[1] ?? 'Error';
  const value = groups?.[2] ?? message;

  return [value, type];
}
