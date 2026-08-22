/* Good South — seeded RNG, hash, value-noise / FBM */
(function (g) {
  var GS = g.GS || (g.GS = {});

  function xfnv1a(str) {
    var h = 2166136261 >>> 0;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function hashInt() {
    var h = 0;
    for (var i = 0; i < arguments.length; i++) {
      h ^= arguments[i] + 0x9e3779b9 + (h << 6) + (h >> 2);
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    a = a >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngFrom(seed) {
    if (typeof seed === "string") seed = xfnv1a(seed);
    if (seed == null) seed = (Math.random() * 0xffffffff) >>> 0;
    seed = seed >>> 0;
    var rnd = mulberry32(seed);
    return {
      seed: seed,
      next: rnd,
      float: function (a, b) {
        if (a == null) return rnd();
        if (b == null) return rnd() * a;
        return a + rnd() * (b - a);
      },
      int: function (a, b) {
        if (b == null) {
          b = a;
          a = 0;
        }
        return (a + Math.floor(rnd() * (b - a))) | 0;
      },
      pick: function (arr) {
        return arr[(rnd() * arr.length) | 0];
      },
      chance: function (p) {
        return rnd() < p;
      },
      shuffle: function (arr) {
        var a = arr.slice();
        for (var i = a.length - 1; i > 0; i--) {
          var j = (rnd() * (i + 1)) | 0;
          var t = a[i];
          a[i] = a[j];
          a[j] = t;
        }
        return a;
      },
      weighted: function (pairs) {
        var sum = 0;
        for (var i = 0; i < pairs.length; i++) sum += pairs[i][1];
        var r = rnd() * sum;
        for (var j = 0; j < pairs.length; j++) {
          r -= pairs[j][1];
          if (r <= 0) return pairs[j][0];
        }
        return pairs[pairs.length - 1][0];
      },
    };
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function smooth(t) {
    return t * t * (3 - 2 * t);
  }

  function hash2(x, y, seed) {
    var n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1274126177);
    n = (n ^ (n >>> 13)) >>> 0;
    n = Math.imul(n, 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  }

  function valueNoise(x, y, seed) {
    var x0 = Math.floor(x);
    var y0 = Math.floor(y);
    var fx = x - x0;
    var fy = y - y0;
    var sx = smooth(fx);
    var sy = smooth(fy);
    var a = hash2(x0, y0, seed);
    var b = hash2(x0 + 1, y0, seed);
    var c = hash2(x0, y0 + 1, seed);
    var d = hash2(x0 + 1, y0 + 1, seed);
    return lerp(lerp(a, b, sx), lerp(c, d, sx), sy);
  }

  function fbm(x, y, seed, octaves) {
    octaves = octaves || 5;
    var v = 0;
    var a = 0.5;
    var f = 1;
    var s = 0;
    for (var i = 0; i < octaves; i++) {
      v += a * valueNoise(x * f, y * f, seed + i * 19);
      s += a;
      a *= 0.5;
      f *= 2.03;
    }
    return v / s;
  }

  GS.hashInt = hashInt;
  GS.hashStr = xfnv1a;
  GS.rng = rngFrom;
  GS.lerp = lerp;
  GS.fbm = fbm;
  GS.valueNoise = valueNoise;
})(typeof window !== "undefined" ? window : globalThis);
