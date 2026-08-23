// js/spreadalready.js
(function () {
  'use strict';

  var COUNTRIES_URL = 'https://cdn.jsdelivr.net/gh/vasturiano/globe.gl@v2.46.2/example/datasets/ne_110m_admin_0_countries.geojson';
  var ICON_SIZE = 16;
  // Wedge points DOWN — the sharp tip at the bottom is the exact anchor for the
  // marker's lat/lng (see .marker-visual's bottom:50% positioning in the CSS).
  // Shape fills the viewBox edge-to-edge (tip at y=24, top rind at y~1) so the
  // icon's own bounding box bottom IS the tip — needed for that anchor math.
  var CHEESE_ICON = '<svg class="marker-icon" width="' + ICON_SIZE + '" height="' + ICON_SIZE + '" viewBox="0 0 24 24">' +
    '<path class="cheese-fill" d="M6,3 Q12,0.5 18,3 Q17,13.5 12,24 Q7,13.5 6,3 Z"></path>' +
    '<path class="cheese-outline" fill="none" d="M6,3 Q12,0.5 18,3 Q17,13.5 12,24 Q7,13.5 6,3 Z"></path>' +
    '<circle class="cheese-hole" cx="10.2" cy="7.5" r="1.1"></circle>' +
    '<circle class="cheese-hole" cx="14" cy="9.2" r="0.85"></circle>' +
    '</svg>';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var MOBILE_QUERY = '(max-width: 820px)';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var THEME_KEY = 'sa-theme';
  var SUN_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"></path></svg>';
  var MOON_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z"></path></svg>';

  // Theme resolution order: an explicit ?theme= link, then a saved manual choice,
  // then whatever the OS/browser prefers. The toggle button always writes a manual
  // choice, which then wins over the system preference from then on.
  var themeOverride = new URLSearchParams(location.search).get('theme');
  if (themeOverride === 'light' || themeOverride === 'dark') {
    document.documentElement.setAttribute('data-theme', themeOverride);
  } else {
    var storedTheme = getStoredTheme();
    if (storedTheme) document.documentElement.setAttribute('data-theme', storedTheme);
  }

  function getStoredTheme() {
    try { return localStorage.getItem(THEME_KEY); } catch (e) { return null; }
  }
  function setStoredTheme(theme) {
    try { localStorage.setItem(THEME_KEY, theme); } catch (e) { /* ignore */ }
  }
  function currentTheme() {
    var attr = document.documentElement.getAttribute('data-theme');
    if (attr === 'light' || attr === 'dark') return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function refreshTheme() {
    applyColors();
    var eff = currentTheme();
    themeToggle.innerHTML = eff === 'dark' ? SUN_ICON : MOON_ICON;
    themeToggle.setAttribute('aria-label', eff === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
  }

  var container = document.getElementById('globeContainer');
  var dragHint = document.getElementById('dragHint');
  var aboutBtn = document.getElementById('aboutBtn');
  var themeToggle = document.getElementById('themeToggle');
  var aboutOverlay = document.getElementById('aboutOverlay');
  var aboutClose = document.getElementById('aboutClose');
  var cardCatcher = document.getElementById('cardCatcher');
  var cardPanel = document.getElementById('cardPanel');
  var cardClose = document.getElementById('cardClose');
  var cardBody = document.getElementById('cardBody');
  var leaderLine = document.getElementById('leaderLine');
  var leaderStroke = document.getElementById('leaderLineStroke');
  var leaderDot = document.getElementById('leaderLineDot');

  var world = Globe()(container)
    .backgroundColor('rgba(0,0,0,0)')
    .showAtmosphere(true)
    .atmosphereAltitude(0.18)
    .htmlElementsData([])
    .htmlLat('lat')
    .htmlLng('lng')
    .htmlAltitude(0.012)
    .htmlElement(buildMarkerEl)
    .htmlElementVisibilityModifier(function (el, isVisible) {
      el.style.opacity = isVisible ? '1' : '0';
      el.style.pointerEvents = isVisible ? 'auto' : 'none';
      el.dataset.visible = isVisible ? '1' : '0';
    });

  var globeMaterial = world.globeMaterial();

  // Soften the directional-light highlight in light mode only — dark mode's
  // glow already reads well, but the same intensity looked glaringly bright
  // against the light theme's pale ocean color.
  var sceneLights = world.lights();
  var ambientLight = sceneLights.filter(function (l) { return l.type === 'AmbientLight'; })[0];
  var directionalLight = sceneLights.filter(function (l) { return l.type === 'DirectionalLight'; })[0];
  var baseAmbientIntensity = ambientLight ? ambientLight.intensity : null;
  var baseDirectionalIntensity = directionalLight ? directionalLight.intensity : null;

  var controls = world.controls();
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enableZoom = true;
  controls.minDistance = 130; // globe radius is 100 — don't let the camera clip into the surface
  controls.maxDistance = 380; // a bit past the default 330 framing, not unbounded
  controls.zoomSpeed = 0.6;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.autoRotate = !reduceMotion;
  controls.autoRotateSpeed = 0.35;

  function onControlsStart() {
    controls.autoRotate = false;
    dragHint.classList.add('hidden');
    controls.removeEventListener('start', onControlsStart);
  }
  controls.addEventListener('start', onControlsStart);

  world.pointOfView({ lat: 35, lng: 8, altitude: 2.3 }, 0);

  refreshTheme();
  var darkSchemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
  (darkSchemeQuery.addEventListener
    ? darkSchemeQuery.addEventListener('change', refreshTheme)
    : darkSchemeQuery.addListener(refreshTheme));

  themeToggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setStoredTheme(next);
    refreshTheme();
  });

  function cssVar(name) {
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  }

  function applyColors() {
    globeMaterial.color.set(cssVar('--globe-ocean'));
    world.atmosphereColor(cssVar('--atmosphere'));
    world.polygonCapColor(function () { return cssVar('--globe-land-fill'); });
    world.polygonSideColor(function () { return 'rgba(0,0,0,0)'; });
    world.polygonStrokeColor(function () { return cssVar('--globe-land-stroke'); });

    var isLight = currentTheme() === 'light';
    if (ambientLight && baseAmbientIntensity != null) {
      ambientLight.intensity = isLight ? baseAmbientIntensity * 0.85 : baseAmbientIntensity;
    }
    if (directionalLight && baseDirectionalIntensity != null) {
      directionalLight.intensity = isLight ? baseDirectionalIntensity * 0.7 : baseDirectionalIntensity;
    }
  }

  function resizeGlobe() {
    world.width(container.clientWidth).height(container.clientHeight);
  }
  resizeGlobe();
  window.addEventListener('resize', resizeGlobe);
  window.addEventListener('orientationchange', resizeGlobe);

  fetch(COUNTRIES_URL)
    .then(function (res) { return res.json(); })
    .then(function (countries) {
      var features = countries.features.filter(function (f) {
        return f.properties && f.properties.ISO_A2 !== 'AQ';
      });
      world.polygonsData(features).polygonAltitude(0.006);
    })
    .catch(function (err) { console.error('Could not load country outlines', err); });

  var currentLocation = null;
  var currentMarkerEl = null;
  var cardAnchor = { x: 0, y: 0 };

  fetch('data/cheeses.json')
    .then(function (res) { return res.json(); })
    .then(function (cheeses) {
      var locations = groupByLocation(cheeses);
      world.htmlElementsData(locations);
    })
    .catch(function (err) {
      console.error('Could not load cheese data', err);
    });

  function groupByLocation(cheeses) {
    var map = {};
    var order = [];
    cheeses.forEach(function (cheese) {
      var key = cheese.latitude.toFixed(2) + ',' + cheese.longitude.toFixed(2);
      if (!map[key]) {
        map[key] = { lat: cheese.latitude, lng: cheese.longitude, cheeses: [] };
        order.push(key);
      }
      map[key].cheeses.push(cheese);
    });
    return order.map(function (key) { return map[key]; });
  }

  function buildMarkerEl(loc) {
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'globe-marker';

    var label = loc.cheeses.length > 1
      ? (loc.cheeses.length + ' cheeses near ' + loc.cheeses[0].region)
      : loc.cheeses[0].name;
    btn.setAttribute('aria-label', label);

    // btn is a plain symmetric hit target that three-globe centers on the lat/lng
    // point; .marker-visual is absolutely positioned within it so the icon's tip
    // (not the icon's own middle) lands on that center — see the CSS.
    var visual = document.createElement('span');
    visual.className = 'marker-visual';
    visual.innerHTML = CHEESE_ICON;

    var labelEl = document.createElement('span');
    labelEl.className = 'marker-label';
    labelEl.textContent = loc.cheeses.length > 1 ? (loc.cheeses.length + ' cheeses') : loc.cheeses[0].name;
    visual.appendChild(labelEl);

    btn.appendChild(visual);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      selectLocation(loc, btn);
    });

    return btn;
  }

  function isMobileLayout() {
    return window.matchMedia(MOBILE_QUERY).matches;
  }

  // getScreenCoords() returns coordinates relative to the globe's own canvas,
  // not the page viewport, so the container's offset has to be added back in.
  function markerScreenPos(lat, lng) {
    var rect = container.getBoundingClientRect();
    var pos = world.getScreenCoords(lat, lng, 0.012);
    return { x: rect.left + pos.x, y: rect.top + pos.y };
  }

  function selectLocation(loc, markerEl) {
    currentLocation = loc;
    currentMarkerEl = markerEl;

    if (loc.cheeses.length > 1) {
      renderList(loc);
    } else {
      renderCheese(loc.cheeses[0]);
    }

    var screenPos = markerScreenPos(loc.lat, loc.lng);
    if (!isMobileLayout()) {
      positionCard(screenPos.x, screenPos.y);
      leaderLine.classList.remove('hidden');
    }

    openCard();

    var dur = reduceMotion ? 0 : 900;
    world.pointOfView({ lat: loc.lat, lng: loc.lng }, dur);
  }

  function positionCard(markerX, markerY) {
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var cardW = 340;
    var cardMaxH = vh * 0.7;
    var left, edgeX;

    if (markerX > vw / 2) {
      left = Math.max(24, vw * 0.08);
      edgeX = left + cardW;
    } else {
      left = Math.min(vw - cardW - 24, vw * 0.92 - cardW);
      edgeX = left;
    }

    var top = Math.min(Math.max(markerY - 140, 24), Math.max(24, vh - cardMaxH - 24));

    cardPanel.style.left = left + 'px';
    cardPanel.style.top = top + 'px';

    cardAnchor = { x: edgeX, y: top + 90 };
  }

  function renderList(loc) {
    cardBody.innerHTML = '';

    var heading = document.createElement('p');
    heading.className = 'card-list-heading';
    heading.textContent = loc.cheeses.length + ' cheeses here';
    cardBody.appendChild(heading);

    loc.cheeses.forEach(function (cheese) {
      var item = document.createElement('button');
      item.type = 'button';
      item.className = 'card-list-item';

      var nameSpan = document.createElement('span');
      nameSpan.textContent = cheese.name;
      var regionSpan = document.createElement('span');
      regionSpan.className = 'card-list-region';
      regionSpan.textContent = cheese.region;

      item.appendChild(nameSpan);
      item.appendChild(regionSpan);
      item.addEventListener('click', function () { renderCheese(cheese); });
      cardBody.appendChild(item);
    });
  }

  function renderCheese(cheese) {
    cardBody.innerHTML = '';

    if (cheese.image) {
      var img = document.createElement('img');
      img.className = 'card-photo';
      img.src = cheese.image;
      img.alt = cheese.name;
      img.loading = 'lazy';
      cardBody.appendChild(img);
    }

    var name = document.createElement('h2');
    name.className = 'card-name';
    name.textContent = cheese.name;
    cardBody.appendChild(name);

    var meta = document.createElement('div');
    meta.className = 'card-meta';
    var metaParts = [cheese.region, formatDate(cheese.dateTasted)].filter(Boolean);
    meta.textContent = metaParts.join(' · ');
    cardBody.appendChild(meta);

    var notes = document.createElement('div');
    notes.className = 'card-notes';
    (cheese.notes || []).forEach(function (note) {
      var p = document.createElement('p');
      p.textContent = note;
      notes.appendChild(p);
    });
    cardBody.appendChild(notes);

    cardPanel.setAttribute('aria-label', cheese.name);
  }

  function formatDate(iso) {
    if (!iso) return '';
    var parts = iso.split('-');
    var y = Number(parts[0]), m = Number(parts[1]), d = Number(parts[2]);
    if (!y || !m || !d) return iso;
    return (d < 10 ? '0' + d : d) + ' ' + MONTHS[m - 1] + ' ' + y;
  }

  function openCard() {
    cardCatcher.hidden = false;
    cardPanel.hidden = false;
    dragHint.classList.add('hidden');
  }

  function closeCard() {
    cardCatcher.hidden = true;
    cardPanel.hidden = true;
    leaderLine.classList.add('hidden');
    currentLocation = null;
    if (currentMarkerEl) {
      currentMarkerEl.focus({ preventScroll: true });
    }
    currentMarkerEl = null;
  }

  cardCatcher.addEventListener('click', closeCard);
  cardClose.addEventListener('click', closeCard);

  function tick() {
    if (currentLocation && !cardPanel.hidden && !isMobileLayout()) {
      var stillVisible = !currentMarkerEl || currentMarkerEl.dataset.visible !== '0';
      if (!stillVisible) {
        closeCard();
      } else {
        var pos = markerScreenPos(currentLocation.lat, currentLocation.lng);
        leaderStroke.setAttribute('x1', pos.x);
        leaderStroke.setAttribute('y1', pos.y);
        leaderStroke.setAttribute('x2', cardAnchor.x);
        leaderStroke.setAttribute('y2', cardAnchor.y);
        leaderDot.setAttribute('cx', pos.x);
        leaderDot.setAttribute('cy', pos.y);
      }
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);

  function openAbout() {
    closeCard();
    aboutOverlay.hidden = false;
    aboutClose.focus();
  }
  function closeAbout() {
    aboutOverlay.hidden = true;
    aboutBtn.focus();
  }

  aboutBtn.addEventListener('click', openAbout);
  aboutClose.addEventListener('click', closeAbout);
  aboutOverlay.addEventListener('click', function (e) {
    if (e.target === aboutOverlay) closeAbout();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (!aboutOverlay.hidden) closeAbout();
    if (!cardPanel.hidden) closeCard();
  });
})();
