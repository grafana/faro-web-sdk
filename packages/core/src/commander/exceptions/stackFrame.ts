export interface StackFrame {
  filename: string;
  function: string;

  colno?: number;
  lineno?: number;
}
