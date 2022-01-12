export interface Commands {
  pushException: (value: string, type?: string, stackFrames?: any[]) => void;
}
