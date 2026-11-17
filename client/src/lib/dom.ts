/** After a failed validation, move keyboard focus to the first field marked aria-invalid. */
export function focusFirstInvalid(form: HTMLFormElement | null) {
  // Wait for React to commit the error state before querying the DOM.
  setTimeout(() => form?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0);
}

export const firstName = (fullName: string) => fullName.trim().split(/\s+/)[0] ?? fullName;

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });

export const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
