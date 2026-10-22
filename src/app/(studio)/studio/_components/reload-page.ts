// Reloads the whole document: the studio rule for retrying a failed server response. A module of its own so DOM
// tests can mock it (jsdom will not let a test replace window.location).
export function reloadPage(): void {
  window.location.reload();
}
