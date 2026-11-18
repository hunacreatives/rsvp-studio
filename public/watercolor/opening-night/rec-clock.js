// Filming only (?rec=1): the page gets a clock it doesn't own. Nothing moves until the recorder calls
// __step(ms): timers due in that span run in order, every CSS/Web animation moves on by exactly ms, and
// one animation frame is drawn. Between steps the page is perfectly still, so a screenshot can take as
// long as it likes and every frame of the film is exactly 1/30 s apart. Loaded before everything else.
(() => {
  if (!new URLSearchParams(location.search).has("rec")) return;
  let vnow = 0, tid = 1;
  const timers = [];
  let rafs = [];
  performance.now = () => vnow;
  Date.now = () => 1.79e12 + vnow;
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.push({ id, at: vnow + Math.max(0, +ms || 0), fn: () => fn(...a) }); return id; };
  window.clearTimeout = (id) => { const i = timers.findIndex((t) => t.id === id); if (i >= 0) timers.splice(i, 1); };
  window.setInterval = (fn, ms = 0, ...a) => { const id = tid++; const rep = () => { timers.push({ id, at: vnow + Math.max(1, +ms || 1), fn: () => { fn(...a); rep(); } }); }; rep(); return id; };
  window.clearInterval = window.clearTimeout;
  window.requestAnimationFrame = (fn) => { const id = tid++; rafs.push({ id, fn }); return id; };
  window.cancelAnimationFrame = (id) => { rafs = rafs.filter((r) => r.id !== id); };
  const own = (a) => a._cue;                        // the scene clock's own paused cues: left alone
  const hold = () => { for (const a of document.getAnimations()) if (!own(a) && a.playState === "running") { a._vt = true; a.pause(); } };
  window.__step = (ms) => {
    const end = vnow + ms;
    for (;;) {
      timers.sort((x, y) => x.at - y.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift(); vnow = Math.max(vnow, t.at);
      try { t.fn(); } catch (e) { console.error(e); }
      hold();
    }
    vnow = end;
    for (const a of document.getAnimations()) {
      if (own(a) || !a._vt) continue;
      const ef = a.effect && a.effect.getComputedTiming();
      a.currentTime = (a.currentTime || 0) + ms;
      if (ef && isFinite(ef.endTime) && a.currentTime >= ef.endTime) { a._vt = false; a.finish(); }
    }
    const list = rafs; rafs = [];
    for (const r of list) { try { r.fn(vnow); } catch (e) { console.error(e); } }
    hold();
    return vnow;
  };
  // CSS animations and transitions start on their own: catch them as they appear
  new MutationObserver(hold).observe(document.documentElement, { subtree: true, attributes: true, childList: true });
})();
