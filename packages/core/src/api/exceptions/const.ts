import { stringifyExternalJson } from "../../utils";

export const defaultExceptionType = 'Error';

function tryParseJSONObject (jsonString: string) {
  try {
    const o = JSON.parse(jsonString);

    // Handle non-exception-throwing cases:
    // Neither JSON.parse(false) or JSON.parse(1234) throw errors, hence the type-checking,
    // but... JSON.parse(null) returns null, and typeof null === "object",
    // so we must check for that, too. Thankfully, null is falsey, so this suffices:
    if (o && typeof o === "object") {
      return o;
    }
  }
  catch (e) { }

  return false;
};

export const defaultErrorArgsSerializer = (args: [any?, ...any[]]) => {
  return args.map((arg) => {
    if (tryParseJSONObject(arg)) {
      return stringifyExternalJson(arg);
    }

    return String(arg);
  }).join(' ');
}
