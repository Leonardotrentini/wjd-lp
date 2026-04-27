(function () {
  /**
   * Ordem: /api/wa (Vercel) → /wa.php (PHP) → sorteio uniforme entre os 3 (só estático).
   * Com API: rodízio exato (Redis) ou sorteio ~1/3 cada (sem Redis).
   */
  var WA_PATH = "/api/wa";
  var WA_JSON_ENDPOINTS = ["/api/wa", "/wa.php"];
  /** Espelho de api/wa.js — usado só quando não há backend. */
  var FALLBACK_LINKS = [
    "https://wa.me/5547997551198?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20em%20ATACADO!%20",
    "https://wa.me/5547997027389?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
    "https://wa.me/554799926812?text=Ol%C3%A1%2C%20quero%20comprar%20toalhas%20no%20ATACADO!",
  ];
  /** Sorteio uniforme 0..len-1 (só fallback, sem backend). */
  function pickUniform(len) {
    if (typeof crypto !== "undefined" && crypto.getRandomValues) {
      var arr = new Uint32Array(1);
      crypto.getRandomValues(arr);
      return arr[0] % len;
    }
    return Math.floor(Math.random() * len);
  }

  function fetchWaJson(base) {
    return fetch(base + "?format=json", { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("wa json " + r.status);
      return r.json();
    });
  }

  function resolveWaPayload() {
    var chain = Promise.reject(new Error("start"));
    WA_JSON_ENDPOINTS.forEach(function (base) {
      chain = chain.catch(function () {
        return fetchWaJson(base);
      });
    });
    return chain.catch(function () {
      return {
        pool: "fallback",
        url: FALLBACK_LINKS[pickUniform(FALLBACK_LINKS.length)],
      };
    });
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    var a = e.currentTarget;
    if (!a || a.getAttribute("href") !== WA_PATH) return;

    e.preventDefault();

    resolveWaPayload()
      .then(function (data) {
        if (data && data.url) window.location.assign(data.url);
      })
      .catch(function () {
        window.location.assign(FALLBACK_LINKS[pickUniform(FALLBACK_LINKS.length)]);
      });
  }

  document.querySelectorAll('a[href="' + WA_PATH + '"]').forEach(function (el) {
    el.addEventListener("click", onClick);
  });
})();
