const PANE_VAR = '--AttorneyMessagesPane-slideIn';

export function openMessagesPane() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.setProperty(PANE_VAR, '1');
}

export function closeMessagesPane() {
  if (typeof document === 'undefined') return;
  document.documentElement.style.removeProperty(PANE_VAR);
}

export function toggleMessagesPane() {
  if (typeof document === 'undefined') return;
  const value = document.documentElement.style.getPropertyValue(PANE_VAR);
  if (value) closeMessagesPane();
  else openMessagesPane();
}
