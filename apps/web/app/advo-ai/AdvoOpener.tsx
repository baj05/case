'use client';

/**
 * Opens the floating Advo AI launcher that lives on every page. Kept as a
 * one-line client component so the surrounding page can stay a server
 * component and preserve its metadata/SSR.
 */
export function AdvoOpener() {
  return (
    <button
      type="button"
      className="btn btn-primary btn-pill btn-lg"
      onClick={() => document.querySelector<HTMLButtonElement>('.advo-fab')?.click()}
    >
      Start the chat
    </button>
  );
}
