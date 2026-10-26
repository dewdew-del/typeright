/** True inside the Tauri desktop app (Tauri v2 puts this on window before the page loads). */
export const IS_DESKTOP = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
