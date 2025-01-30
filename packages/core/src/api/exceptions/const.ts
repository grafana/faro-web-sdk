import { isObject, stringifyExternalJson } from '../../utils';

export const defaultExceptionType = 'Error';

export const defaultErrorArgsSerializer = (args: [any?, ...any[]]) => {
  return args
    .map((arg) => {
      if (isObject(arg)) {
        return stringifyExternalJson(arg);
      }

      return String(arg);
    })
    .join(' ');
};
