/* Good South — WebAudio beeps, no assets required */
(function (g) {
  var GS = g.GS || (g.GS = {});
  var ctx = null;
  var muted = false;
  var master = 0.12;

  function ac() {
    if (!ctx) {
      var AC = g.AudioContext || g.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function beep(freq, dur, type, vol, slide) {
    if (muted) return;
    var c = ac();
    if (!c) return;
    var o = c.createOscillator();
    var g2 = c.createGain();
    o.type = type || "square";
    o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), c.currentTime + dur);
    g2.gain.setValueAtTime(0.0001, c.currentTime);
    g2.gain.exponentialRampToValueAtTime(vol || master, c.currentTime + 0.01);
    g2.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g2);
    g2.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  GS.audio = {
    unlock: function () { ac(); },
    toggle: function () { muted = !muted; return muted; },
    muted: function () { return muted; },
    horn: function () { beep(140, 0.45, "sawtooth", 0.1, 90); setTimeout(function () { beep(180, 0.35, "sawtooth", 0.08); }, 120); },
    ship: function () { beep(90, 0.4, "triangle", 0.08, 60); },
    bow: function () { beep(640, 0.06, "square", 0.05, 320); },
    hit: function () { beep(180, 0.07, "square", 0.07); },
    die: function () { beep(220, 0.2, "sawtooth", 0.08, 70); },
    fire: function () { beep(120, 0.5, "sawtooth", 0.09, 50); },
    win: function () { beep(523, 0.15, "square", 0.08); setTimeout(function () { beep(659, 0.15, "square", 0.08); }, 140); setTimeout(function () { beep(784, 0.28, "square", 0.09); }, 280); },
    lose: function () { beep(196, 0.4, "triangle", 0.1, 80); },
    ui: function () { beep(440, 0.04, "square", 0.04); },
    coin: function () { beep(880, 0.08, "square", 0.06); },
  };
})(typeof window !== "undefined" ? window : globalThis);
