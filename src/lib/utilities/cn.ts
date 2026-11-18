/** Joins class names, skipping falsy values. No conflict merging, so avoid passing two classes for the same property. */
export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}
