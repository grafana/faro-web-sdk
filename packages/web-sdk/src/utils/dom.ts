export function isClickableElement(target: HTMLElement): boolean {
  return (
    ['A', 'BUTTON'].includes(target.tagName) ||
    target.hasAttribute('onclick') ||
    target.getAttribute('role') === 'button'
  );
}
