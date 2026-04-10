import { atString, safariExtensionString, safariWebExtensionString } from './const';

export function getDataFromSafariExtensions(
  func: string | undefined,
  filename: string | undefined
): [string | undefined, string | undefined] {
  const isSafariExtension = func?.includes(safariExtensionString);
  const isSafariWebExtension = !isSafariExtension && func?.includes(safariWebExtensionString);

  if (!isSafariExtension && !isSafariWebExtension) {
    return [func, filename];
  }

  return [
    func?.includes(atString) ? func.split(atString)[0] : func,
    isSafariExtension ? `${safariExtensionString}:${filename}` : `${safariWebExtensionString}:${filename}`,
  ];
}
