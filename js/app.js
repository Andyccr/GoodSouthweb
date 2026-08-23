/* Good South — bootstrap */
(function (g) {
  var GS = g.GS || (g.GS = {});

  GS.boot = function () {
    if (GS.app) return GS.app;
    GS.app = new GS.Game();
    return GS.app;
  };

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () { GS.boot(); });
    } else {
      // scripts at end of body — boot immediately if GS.boot called from HTML
    }
  }
})(typeof window !== "undefined" ? window : globalThis);
