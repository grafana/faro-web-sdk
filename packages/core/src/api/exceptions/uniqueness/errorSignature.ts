import type { ExceptionEvent, ExceptionStackFrame } from '../types';

export interface ErrorSignatureOptions {
  stackFrameDepth?: number;
  includeContextKeys?: boolean;
}

/**
 * Normalize an error message by replacing dynamic values with placeholders.
 *
 * @param message - error message
 * @returns Normalized message with placeholders
 */
export function normalizeErrorMessage(message: string): string {
  if (!message) {
    return '';
  }

  let normalized = message;

  // UUIDs: "123e4567-e89b-12d3-a456-426614174000" -> "<UUID>"
  normalized = normalized.replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<UUID>');

  // URLs: "https://example.com/path" -> "<URL>"
  normalized = normalized.replace(/https?:\/\/[^\s]+/g, '<URL>');

  // File paths: "/path/to/file.js" -> "<PATH>"
  normalized = normalized.replace(/\/[^\s]+\.(js|ts|jsx|tsx|css|html|json)\b/g, '<PATH>');

  // Timestamps (13 digits): "1234567890123" -> "<TIMESTAMP>"
  normalized = normalized.replace(/\b\d{13}\b/g, '<TIMESTAMP>');

  // Numeric IDs (6+ digits): "123456" -> "<ID>"
  normalized = normalized.replace(/\b\d{6,}\b/g, '<ID>');

  // Quoted strings: "foo" or 'bar' -> "<STRING>"
  normalized = normalized.replace(/'[^']+'|"[^"]+"/g, '<STRING>');

  // Truncate very long messages to prevent excessive storage
  const MAX_MESSAGE_LENGTH = 500;
  if (normalized.length > MAX_MESSAGE_LENGTH) {
    normalized = normalized.substring(0, MAX_MESSAGE_LENGTH) + '...';
  }

  return normalized;
}

/**
 * Create a stack signature from stack frames.
 * Uses top N frames with basename, function name, and line:col.
 *
 * @param frames - Stack frames from exception event
 * @param depth - Number of frames to include (default: 5)
 * @returns Stack signature string
 */
export function createStackSignature(frames: ExceptionStackFrame[] | undefined, depth: number = 5): string {
  if (!frames || frames.length === 0) {
    return '';
  }

  const topFrames = frames.slice(0, depth);
  const frameSignatures = topFrames.map((frame) => {
    const { filename, function: functionName, lineno, colno } = frame;

    const parts: string[] = [];

    // Use filename (basename only, not full path for resilience)
    // Handle both Unix (/) and Windows (\) path separators
    if (filename) {
      const basename = filename.split(/[/\\]/).pop() || filename;
      parts.push(basename);
    }

    if (functionName) {
      parts.push(functionName);
    }

    if (lineno !== undefined) {
      const lineCol = colno !== undefined ? `${lineno}:${colno}` : String(lineno);
      parts.push(lineCol);
    }

    return parts.join(':');
  });

  return frameSignatures.join('|');
}

/**
 * Create a unique signature for an error event.
 * The signature identifies errors with the same root cause.
 *
 * @param error - Exception event to create signature for
 * @param options - Signature generation options
 * @returns Signature string for hashing
 */
export function createErrorSignature(error: ExceptionEvent, options: ErrorSignatureOptions = {}): string {
  const { stackFrameDepth = 5, includeContextKeys = true } = options;
  const { type, value, stacktrace, context } = error;

  const parts: string[] = [];

  if (type) {
    parts.push(type);
  }

  const normalizedMsg = normalizeErrorMessage(value || '');
  if (normalizedMsg) {
    parts.push(normalizedMsg);
  }

  // 3. Stack signature
  const stackSig = createStackSignature(stacktrace?.frames, stackFrameDepth);
  if (stackSig) {
    parts.push(stackSig);
  }

  // 4. Context keys (optional)
  if (includeContextKeys && context) {
    const contextKeys = Object.keys(context).sort();
    if (contextKeys.length > 0) {
      parts.push(`context:${contextKeys.join(',')}`);
    }
  }

  return parts.join('::');
}
