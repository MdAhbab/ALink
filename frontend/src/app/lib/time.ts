import { formatDistanceToNow } from "date-fns";

export function timeAgo(value: string | number | Date): string {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (isNaN(date.getTime())) return "";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "";
  }
}
