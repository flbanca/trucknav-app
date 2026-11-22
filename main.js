(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var fine = window.matchMedia("(pointer: fine)").matches;
  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var easeInOut = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  var it = function (n, d) { return n.toFixed(d).replace(".", ","); };

  /* ---------- Elementi ---------- */
  var nav = document.getElementById("nav");
  var stretch = document.querySelector("[data-stretch]");
  var track = document.querySelector(".story-track");
  var truck = document.getElementById("st-truck");
  var count = document.getElementById("st-count");
  var rows = document.querySelectorAll(".mq-row");

  /* ---------- Ciclo legato allo scorrimento ---------- */
  var lastY = window.scrollY;
  var velocity = 0;
  var ticking = false;

  function frame() {
    var y = window.scrollY;
    var vh = window.innerHeight;

    nav.classList.toggle("glassy", y > 20);

    // "bilico." si allunga come un rimorchio mentre scorri
    if (stretch && !reduce) {
      var s = clamp(y / (vh * 0.55), 0, 1);
      stretch.style.fontStretch = lerp(72, 125, easeInOut(s)).toFixed(1) + "%";
    }

    // storia del sottopasso
    if (track) {
      var r = track.getBoundingClientRect();
      var total = r.height - vh;
      var p = clamp(-r.top / total, 0, 1);
      var drive = easeInOut(clamp(p / 0.55, 0, 1));
      truck.setAttribute("transform", "translate(" + lerp(-80, 300, drive).toFixed(1) + " 0)");
      var step = p < 0.34 ? 0 : p < 0.67 ? 1 : 2;
      if (track.dataset.step !== String(step)) {
        track.dataset.step = String(step);
        count.textContent = "0" + (step + 1);
      }
    }

    // le scritte del nastro si inclinano con la velocità
    velocity += ((y - lastY) - velocity) * 0.18;
    lastY = y;
    if (!reduce) {
      var skew = clamp(velocity * -0.25, -10, 10).toFixed(2) + "deg";
      rows.forEach(function (row) { row.style.setProperty("--skew", skew); });
    }

    if (Math.abs(velocity) > 0.05) {
      requestAnimationFrame(frame);
    } else {
      velocity = 0;
      rows.forEach(function (row) { row.style.setProperty("--skew", "0deg"); });
      ticking = false;
    }
  }
  function kick() { if (!ticking) { ticking = true; requestAnimationFrame(frame); } }
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  kick();

  /* ---------- Comparse allo scorrimento ---------- */
  if ("IntersectionObserver" in window) {
    var reveal = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        var el = e.target;
        if (el.hasAttribute("data-reveal")) el.classList.add("play");
        else el.classList.add("in");
        reveal.unobserve(el);
      });
    }, { threshold: 0.35 });
    document.querySelectorAll("[data-reveal], [data-fill], #ring").forEach(function (el) { reveal.observe(el); });
  } else {
    document.querySelectorAll("[data-fill], #ring").forEach(function (el) { el.classList.add("in"); });
  }

  /* ---------- Bottoni magnetici ---------- */
  if (fine && !reduce) {
    document.querySelectorAll("[data-magnetic]").forEach(function (btn) {
      btn.addEventListener("pointermove", function (ev) {
        var b = btn.getBoundingClientRect();
        var dx = ev.clientX - (b.left + b.width / 2);
        var dy = ev.clientY - (b.top + b.height / 2);
        btn.style.transform = "translate(" + (dx * 0.22).toFixed(1) + "px," + (dy * 0.32).toFixed(1) + "px)";
      });
      btn.addEventListener("pointerleave", function () { btn.style.transform = ""; });
    });
  }

  /* ---------- Configuratore del mezzo ---------- */
  var S = 40;          // pixel per metro nel disegno
  var GROUND = 230;
  var X0 = 60;
  var inputs = {
    h: document.getElementById("h"),
    wd: document.getElementById("wd"),
    ln: document.getElementById("ln"),
    ms: document.getElementById("ms")
  };
  if (!inputs.h) return;

  var outs = {
    h: document.getElementById("h-out"),
    wd: document.getElementById("wd-out"),
    ln: document.getElementById("ln-out"),
    ms: document.getElementById("ms-out")
  };
  var trailer = document.getElementById("cfg-trailer");
  var cab = document.getElementById("cfg-cab");
  var chassis = document.getElementById("cfg-chassis");
  var wheels = document.getElementById("cfg-wheels");
  var lenLabel = document.getElementById("cfg-len");
  var readout = document.getElementById("cfg-readout");
  var lim38 = document.getElementById("lim-38");
  var lim43 = document.getElementById("lim-43");
  var items = document.querySelectorAll("#obstacles li");
  var sum = document.getElementById("cfg-sum");
  var SVGNS = "http://www.w3.org/2000/svg";

  function wheel(cx) {
    var c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", cx.toFixed(1));
    c.setAttribute("cy", "212");
    c.setAttribute("r", "15");
    return c;
  }

  function update() {
    var v = {
      h: parseFloat(inputs.h.value),
      wd: parseFloat(inputs.wd.value),
      ln: parseFloat(inputs.ln.value),
      ms: parseFloat(inputs.ms.value)
    };

    Object.keys(inputs).forEach(function (k) {
      var el = inputs[k];
      var pct = (v[k] - parseFloat(el.min)) / (parseFloat(el.max) - parseFloat(el.min)) * 100;
      el.style.setProperty("--p", pct.toFixed(1) + "%");
    });
    outs.h.textContent = it(v.h, 2) + " m";
    outs.wd.textContent = it(v.wd, 2) + " m";
    outs.ln.textContent = it(v.ln, 2) + " m";
    outs.ms.textContent = (v.ms % 1 ? it(v.ms, 1) : String(v.ms)) + " t";

    // disegno di profilo
    var end = X0 + v.ln * S;
    var cabLen = 2.4 * S;
    var cabX = end - cabLen;
    var top = GROUND - v.h * S;
    var floor = GROUND - 1.25 * S;
    var trailerW = Math.max(40, cabX - 8 - X0);
    trailer.setAttribute("y", top.toFixed(1));
    trailer.setAttribute("height", (floor - top).toFixed(1));
    trailer.setAttribute("width", trailerW.toFixed(1));

    var cabTop = GROUND - Math.min(v.h, 3.0) * S;
    cab.setAttribute("d",
      "M" + cabX + " " + cabTop +
      "H" + (cabX + 62) +
      "Q" + (cabX + 80) + " " + cabTop + " " + (cabX + 86) + " " + (cabTop + 18) +
      "L" + (cabX + 96) + " " + (cabTop + 52) +
      "V204H" + cabX + "Z");
    chassis.setAttribute("width", (end - X0 - 4).toFixed(1));

    while (wheels.firstChild) wheels.removeChild(wheels.firstChild);
    var axles = v.ln >= 12 ? [44, 82, 120] : v.ln >= 9 ? [44, 82] : [44];
    axles.forEach(function (dx) { wheels.appendChild(wheel(X0 + dx)); });
    wheels.appendChild(wheel(end - 74));
    wheels.appendChild(wheel(end - 24));

    lenLabel.textContent = "← " + it(v.ln, 2) + " m →";
    lenLabel.setAttribute("x", (X0 + (end - X0) / 2 - 50).toFixed(0));

    lim38.classList.toggle("hit", v.h > 3.8);
    lim43.classList.toggle("hit", v.h > 4.3);

    readout.textContent = it(v.h, 2) + " m × " + it(v.wd, 2) + " m × " + it(v.ln, 2) + " m · " + (v.ms % 1 ? it(v.ms, 1) : v.ms) + " t";

    var avoided = 0;
    items.forEach(function (li) {
      var lim = parseFloat(li.dataset.lim);
      var ok = v[li.dataset.k] <= lim;
      var em = li.querySelector("em");
      em.textContent = ok ? "Passi" : "Evitato";
      em.className = ok ? "pass" : "avoid";
      if (!ok) avoided++;
    });
    sum.innerHTML = avoided === 0
      ? "Percorso diretto.<br><span class=\"amber\">Nessun ostacolo per questo mezzo.</span>"
      : "Percorso ricalcolato.<br><span class=\"amber\">" + avoided + (avoided === 1 ? " ostacolo evitato." : " ostacoli evitati.") + "</span>";
  }

  Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener("input", update); });
  update();
})();
