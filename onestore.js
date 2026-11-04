// 대나무 피하기 ⇄ 원스토어 웹게임: the One Store H5 Game SDK around the same page the web plays.
//
// build.mjs puts this file next to a copy of public/index.html and loads it as the first module, before the game.
// The game never imports the SDK; this file talks to it through window.JUKLIM_GAME (pause, resume, silent switch,
// back key, safe insets), which the game sets once its own script has run.
//
// What it does not do yet: ads and in-app purchases. Both need ONE store placement and product ids, and
// purchases need a server that checks the purchase token, so the platform below says "none" and the shop
// hides the skins that are sold for money.
import { createSDK } from "https://h5sdk.onestore.net/lib/v1.1.0/onestore-h5-sdk.min.js";

window.JUKLIM_PLATFORM = { name: "onestore", showBreakAd: async () => false, rewardReady: () => false, showRewardAd: async () => false,
  products: async () => null, buy: async () => false, restore: async () => null };

// The game's script comes after this one, and the SDK's answers can arrive before it has run.
const gameReady = new Promise((resolve) => {
  const look = () => { if (window.JUKLIM_GAME) resolve(window.JUKLIM_GAME); else setTimeout(look, 30); };
  look();
});
const withGame = (fn) => { if (window.JUKLIM_GAME) fn(window.JUKLIM_GAME); else gameReady.then(fn); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const bar = (p) => { const f = document.getElementById("osBootFill"); if (f) f.style.width = p + "%"; };
const done = () => document.getElementById("osBoot")?.remove();

const sdk = createSDK();

// ---- the app's events: registered before init, since they can come right after it
sdk.on("pause", () => withGame((g) => g.pause())); // background, an ad, a payment: the same pause, safe to repeat
sdk.on("resume", (e) => withGame((g) => {
  if (e && typeof e.ringerSilent === "boolean") g.silent(e.ringerSilent); // present only when the switch moved
  g.resume();
}));
sdk.on("exit", () => window.JUKLIM_GAME?.save()); // synchronous; the app finishes the exit itself
// The app waits 200 ms for this answer, so it must not wait for anything: the shop closes, else the app asks to quit.
sdk.onBackPressed(() => window.JUKLIM_GAME?.back() ?? false);

// ---- boot: init → loading progress → start
sdk.initializeAsync()
  .then(async (info) => {
    if (info.err) { done(); return; } // a plain browser: the game runs as it does on the web
    const g = await gameReady;
    if (info.safeArea) g.setInsets(info.safeArea); // inside the frame the browser's own insets read 0
    g.silent(!!info.ringerSilent);
    sdk.setLoadingProgress(20); bar(20);
    // the brush and body fonts are the only thing the first screen waits on
    await Promise.race([document.fonts?.ready, wait(4000)]);
    sdk.setLoadingProgress(80); bar(80);
    await wait(0);
    sdk.setLoadingProgress(100); bar(100);
    await sdk.startGameAsync();
    done();
  })
  .catch(done); // whatever went wrong, the game itself still plays
