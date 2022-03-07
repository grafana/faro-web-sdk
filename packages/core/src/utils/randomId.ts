function getTracingIdGenerator(bytes: number): () => string {
  return () => {
    const charCodes = new Array(bytes * 2).fill(undefined).map(() => {
      // The char code should be a random number between 48 and 57 (numbers) or 97-122 (lowercase letters).
      let charCode = Math.floor(Math.random() * 16) + 48;
      charCode += charCode >= 58 ? 39 : 0;
      return charCode;
    });

    return String.fromCharCode(...charCodes);
  };
}

export const getRandomTraceId = getTracingIdGenerator(16);

export const getRandomSpanId = getTracingIdGenerator(8);
