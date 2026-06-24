export function log(step: string, detail?: string): void {
  const prefix = `[QA]`;
  if (detail) {
    console.log(`${prefix} ${step} — ${detail}`);
  } else {
    console.log(`${prefix} ${step}`);
  }
}
