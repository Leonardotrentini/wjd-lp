(function () {
  /** Na Vercel usa /api/wa (Node). Em hosting só PHP, troca para "wa.php". */
  var WA_PATH = "/api/wa";
  var STORAGE_KEY = "wa_rr_client_index";

  function nextClientIndex(len) {
    var raw = localStorage.getItem(STORAGE_KEY);
    var i = parseInt(raw, 10);
    if (Number.isNaN(i) || i < 0 || i >= len) i = 0;
    localStorage.setItem(STORAGE_KEY, String((i + 1) % len));
    return i;
  }

  function onClick(e) {
    if (e.defaultPrevented) return;
    if (e.button !== 0) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;

    var a = e.currentTarget;
    if (!a || a.getAttribute("href") !== WA_PATH) return;

    e.preventDefault();

    fetch(WA_PATH + "?format=json", { cache: "no-store" })
      .then(function (r) {
        return r.json();
      })
      .then(function (data) {
        var url = data.url;
        if (data.pool === "client" && Array.isArray(data.links) && data.links.length) {
          var idx = nextClientIndex(data.links.length);
          url = data.links[idx];
        }
        window.location.assign(url);
      })
      .catch(function () {
        window.location.assign(WA_PATH);
      });
  }

  document.querySelectorAll('a[href="' + WA_PATH + '"]').forEach(function (el) {
    el.addEventListener("click", onClick);
  });
})();
