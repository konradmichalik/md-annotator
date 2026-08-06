/**
 * Visibility helpers for the anchored comment popover.
 */

/**
 * Which side of the viewport an element has scrolled out of.
 * Returns 'above', 'below', or null while any part of it is still visible.
 */
export function getOffscreenSide(rect, viewportHeight) {
  if (!rect) {
    return null
  }
  if (rect.bottom <= 0) {
    return 'above'
  }
  if (rect.top >= viewportHeight) {
    return 'below'
  }
  return null
}
