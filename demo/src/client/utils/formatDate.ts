const formatter = new Intl.DateTimeFormat('en-US', { timeStyle: 'long' });

export function formatDate(input: number): string {
  return formatter.format(input);
}
