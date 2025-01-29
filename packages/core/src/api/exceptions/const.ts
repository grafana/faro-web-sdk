import { stringifyExternalJson } from "../../utils";

export const defaultExceptionType = 'Error';

export const defaultErrorArgsSerializer = (args: [any?, ...any[]]) => {
  return args.map((arg) => {
    if (typeof arg === 'object') {
      return stringifyExternalJson(arg);
    }

    return String(arg);
  }).join(' ');
}
