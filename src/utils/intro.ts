// The logo loading screen + snake reveal play once per page load: on first
// entry or a refresh, never when navigating back to the index inside the app.
// Module state survives client-side navigation and resets on reload.
//
// Reading and marking are separate on purpose: StrictMode runs useState
// initializers twice in dev, so a read-and-set "claim" would see the intro as
// already played on its second call. Read in the initializer, mark in an effect.
let played = false;

export const introPending = () => !played;

export const markIntroPlayed = () => {
  played = true;
};
