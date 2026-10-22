// Ages on the home dashboard (spec 0012, Value sourcing): whole minutes, then hours, then days, from the request time.

export function ageLabel(from: Date, now: Date): string {
  const minutes = Math.floor(Math.max(0, now.getTime() - from.getTime()) / 60000);
  if (minutes < 1) {
    return "just now";
  }
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h`;
  }
  return `${Math.floor(hours / 24)}d`;
}

// Retention rows: how long ago a record fell due.
export function dueLabel(dueAt: Date, now: Date): string {
  const age = ageLabel(dueAt, now);
  return age === "just now" ? "due just now" : `due ${age} ago`;
}
