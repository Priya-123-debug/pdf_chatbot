// Single source of truth for the app's visual language.
// Previously styles.js defined a *light* card (surface: '#FFFFFF') while
// Sidebar/ChatPanel/App were all hard-coded with *dark* fallback colors
// (#111827, #1f2937, etc). That mismatch is why the UI looked inconsistent.
// This version makes the whole app one coherent warm-dark theme, so the
// fallback values components already use and the real token values agree.

export const tokens = {
  ink: '#0C0A08',          // page background
  inkElevated: '#1A1611',  // inputs, message bubbles, recessed panels
  surface: '#171310',      // cards, sidebar, header
  surfaceHi: '#211A14',    // hovered/active rows
  border: '#2B2319',
  borderHi: '#3D3223',

  text: '#F5EFE6',
  textMuted: '#B7A996',
  textFaint: '#8C7F6D',

  brass: '#D9A15B',
  brassSoft: 'rgba(217, 161, 91, 0.14)',

  teal: '#E8763A',         // primary accent (kept the name "teal" so nothing
  tealSoft: 'rgba(232, 118, 58, 0.14)', // else in the codebase needs renaming)

  paper: '#171310',
  paperInk: '#F5EFE6',
  paperMuted: '#B7A996',

  danger: '#E5484D',
  dangerSoft: 'rgba(229, 72, 77, 0.14)',
  success: '#3DD68C',
  successSoft: 'rgba(61, 214, 140, 0.14)',

  radius: 10,
  radiusLg: 14,
};

export const breakpoints = {
  mobile: 768,
  narrow: 480,
};