/* Concrete ice calculator — Sunshine Ice Industries
   Heat balance method for fresh concrete temperature (ACI 305R, SI form).
   Ice replaces an equal mass of mixing water; ice is taken at 0°C. */
(function (root) {
  'use strict';

  var SPECIFIC_HEAT = 0.22;   // cement and aggregates, relative to water
  var LATENT = 79.6;          // heat absorbed by melting ice, kcal per kg
  var MAX_SHARE = 0.75;       // practical ceiling on ice as a share of mixing water
  var SLAB_KG = 110;
  var MIN_SLABS = 10;

  function calcIce(v) {
    var heat0 = SPECIFIC_HEAT * (v.aggTemp * v.agg + v.cementTemp * v.cement) + v.waterTemp * v.water;
    var capacity = SPECIFIC_HEAT * (v.agg + v.cement) + v.water;
    var perKgIce = v.waterTemp + LATENT;
    var baseTemp = heat0 / capacity;
    var icePerM3 = Math.max(0, (heat0 - v.target * capacity) / perKgIce);
    var share = icePerM3 / v.water;
    var maxIce = MAX_SHARE * v.water;
    var lowestTemp = (heat0 - maxIce * perKgIce) / capacity;
    var totalKg = icePerM3 * v.volume;
    return {
      baseTemp: baseTemp,
      icePerM3: icePerM3,
      share: share,
      totalKg: totalKg,
      slabs: Math.ceil(totalKg / SLAB_KG - 1e-9),
      perDegree: capacity / perKgIce,
      lowestTemp: lowestTemp,
      needsIce: icePerM3 > 0,
      overLimit: share > MAX_SHARE + 1e-9
    };
  }

  if (typeof module !== 'undefined' && module.exports) { module.exports = { calcIce: calcIce }; return; }

  var form = document.getElementById('iceCalc');
  if (!form) return;

  var FIELDS = {
    volume:     { min: 1,    max: 200000 },
    target:     { min: 5,    max: 40 },
    cement:     { min: 100,  max: 800 },
    agg:        { min: 1000, max: 2600 },
    water:      { min: 80,   max: 300 },
    cementTemp: { min: 0,    max: 90 },
    aggTemp:    { min: 0,    max: 60 },
    waterTemp:  { min: 0,    max: 50 }
  };
  var $ = function (id) { return document.getElementById(id); };
  var fmt = function (n, d) { return n.toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d }); };
  var WA = 'https://wa.me/919845989815';

  function read() {
    var v = {}, ok = true;
    Object.keys(FIELDS).forEach(function (k) {
      var el = form.elements[k], n = parseFloat(el.value), f = FIELDS[k];
      var good = el.value.trim() !== '' && isFinite(n) && n >= f.min && n <= f.max;
      el.closest('.field').classList.toggle('bad', !good);
      el.setAttribute('aria-invalid', good ? 'false' : 'true');
      if (!good) ok = false;
      v[k] = n;
    });
    return ok ? v : null;
  }

  function show(big, unit, rows, note, warn, waText) {
    $('outBig').textContent = big;
    $('outUnit').textContent = unit;
    $('outPerM3').textContent = rows[0];
    $('outShare').textContent = rows[1];
    $('outSlabs').textContent = rows[2];
    $('outBase').textContent = rows[3];
    var n = $('outNote');
    n.textContent = note;
    n.hidden = !note;
    n.classList.toggle('warn', !!warn);
    $('outWa').href = waText ? WA + '?text=' + encodeURIComponent(waText) : WA;
  }

  function update() {
    var v = read();
    if (!v) {
      show('—', '', ['—', '—', '—', '—'], 'Check the highlighted values. Each one needs a number in the range shown under the box.', true, '');
      return;
    }
    var r = calcIce(v);
    var base = fmt(r.baseTemp, 1) + '°C';
    if (!r.needsIce) {
      show('0', 'tonnes', ['0 kg', '0%', '0', base],
        'This mix is already at or below your target temperature, so the estimate is no ice.', false, '');
      return;
    }
    var tonnes = r.totalKg / 1000;
    var big = tonnes >= 1 ? fmt(tonnes, 1) : fmt(Math.ceil(r.totalKg), 0);
    var unit = tonnes >= 1 ? 'tonnes' : 'kg';
    var note = '', warn = false;
    if (r.overLimit) {
      warn = true;
      note = 'This needs more than 75% of the mixing water as ice, which is above the usual limit. With ice at 75% the mix reaches about ' +
        fmt(r.lowestTemp, 1) + '°C. Reaching your target also needs cooler materials, such as chilled water or shaded aggregates.';
    } else if (r.slabs < MIN_SLABS) {
      note = 'Our minimum order is 10 slabs of 110 kg.';
    }
    var wa = 'Hello Sunshine Ice Industries. I need about ' + big + ' ' + unit + ' of ice (' + fmt(r.slabs, 0) +
      ' slabs of 110 kg) for a ' + fmt(v.volume, 0) + ' cubic metre concrete pour. Pour date: . Site location: .';
    show(big, unit, [fmt(r.icePerM3, 1) + ' kg', fmt(r.share * 100, 0) + '%', fmt(r.slabs, 0), base], note, warn, wa);
  }

  form.addEventListener('input', update);
  form.addEventListener('submit', function (e) { e.preventDefault(); update(); });
  update();
})(this);
