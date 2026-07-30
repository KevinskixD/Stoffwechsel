/**
 * A row click should only toggle selection when it doesn't land on something already interactive
 * (an edit trigger, link, button, select, or native checkbox) — those already have their own click
 * behavior and would otherwise also flip the row's selection as the click bubbles up.
 */
export function isInteractiveClickTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('a, button, input, select, textarea, [data-no-row-select]') !== null
}
