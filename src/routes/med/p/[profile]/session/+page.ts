// Disable SSR for this page since it relies heavily on browser APIs
// - localStorage for session persistence
// - microphone access for audio recording
// - real-time SSE connections
// - DOM manipulation for audio visualizations
export const ssr = false;

// Enable client-side routing
export const csr = true;

// Prerender is not needed for this dynamic page
export const prerender = false;
