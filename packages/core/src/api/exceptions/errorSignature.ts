/**
 * Error signature generation for uniqueness tracking.
 * Creates normalized fingerprints from error events.
 */

import type { ExceptionEvent, ExceptionStackFrame } from '@grafana/faro-core';

export interface ErrorSignatureOptions {
  /** Number of stack frames to include in signature (default: 5) */
  stackFrameDepth?: number;
  /** Include context keys in signature (default: true) */
  includeContextKeys?: boolean;
}

/**
 * Normalize an error message by replacing dynamic values with placeholders.
 * This ensures errors with similar structure but different values get the same signature.
 *
 * @param message - Original error message
 * @returns Normalized message with placeholders
 */
export function normalizeMessage(message: string): string {
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
    const parts: string[] = [];

    // Use filename (basename only, not full path for resilience)
    // Handle both Unix (/) and Windows (\) path separators
    if (frame.filename) {
      const basename = frame.filename.split(/[/\\]/).pop() || frame.filename;
      parts.push(basename);
    }

    // Add function name if available
    if (frame.function) {
      parts.push(frame.function);
    }

    // Add line and column if available
    if (frame.lineno !== undefined) {
      const lineCol = frame.colno !== undefined ? `${frame.lineno}:${frame.colno}` : String(frame.lineno);
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
 * @param event - Exception event to create signature for
 * @param options - Signature generation options
 * @returns Signature string for hashing
 */
export function createErrorSignature(event: ExceptionEvent, options: ErrorSignatureOptions = {}): string {
  const { stackFrameDepth = 5, includeContextKeys = true } = options;

  const parts: string[] = [];

  // 1. Error type (if available)
  if (event.type) {
    parts.push(event.type);
  }

  // 2. Normalized message
  const normalizedMsg = normalizeMessage(event.value || '');
  if (normalizedMsg) {
    parts.push(normalizedMsg);
  }

  // 3. Stack signature
  const stackSig = createStackSignature(event.stacktrace?.frames, stackFrameDepth);
  if (stackSig) {
    parts.push(stackSig);
  }

  // 4. Context keys (optional)
  if (includeContextKeys && event.context) {
    const contextKeys = Object.keys(event.context).sort();
    if (contextKeys.length > 0) {
      parts.push(`context:${contextKeys.join(',')}`);
    }
  }

  return parts.join('::');
}
