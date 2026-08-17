// Draws the Feebas tile highlights on top of assets/lake.webp

const TILE = 16;              // world units per tile, from the original 3D scene
const SECTION_TILES = 32;     // each section is a 32x32 tile grid
const SECTION_SPAN = TILE * SECTION_TILES; // 512

// Lake bounds in world coordinates
const WATER_X_MIN = -112, WATER_X_MAX = 176;
const WATER_Z_MIN = 32, WATER_Z_MAX = 576;

const CANDIDATE_COLORS = ["#b388ff", "#69f0ae"]; // purple, green

// A tile's [x, y] grid index (from feebas_seed.js) -> world-space center.
function tileToWorldCenter(x, y) {
  return [x * TILE - SECTION_SPAN / 2 + TILE / 2, y * TILE - SECTION_SPAN / 2 + TILE / 2];
}

// World-space point -> fraction of the way across lake.webp (0-1, 0-1).
function worldToImageFraction(worldX, worldZ) {
  return [
    (worldX - WATER_X_MIN) / (WATER_X_MAX - WATER_X_MIN),
    (worldZ - WATER_Z_MIN) / (WATER_Z_MAX - WATER_Z_MIN),
  ];
}

// One tile's width/height as an image fraction, for sizing highlight divs.
const TILE_FRAC_W = TILE / (WATER_X_MAX - WATER_X_MIN);
const TILE_FRAC_H = TILE / (WATER_Z_MAX - WATER_Z_MIN);

let highlightLayer = null;

export function clearHighlights() {
  if (highlightLayer) highlightLayer.replaceChildren();
}

export function drawHighlights(results) {
  clearHighlights();
  if (!highlightLayer) return;

  const owners = new Map(); // "x,y" -> candidateIndex[]
  results.forEach((result, candidateIndex) => {
    for (const [x, y] of result.tiles) {
      const key = `${x},${y}`;
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(candidateIndex);
    }
  });

  for (const [key, candidateIndices] of owners) {
    const [x, y] = key.split(",").map(Number);
    const [wx, wz] = tileToWorldCenter(x, y);
    const [fx, fy] = worldToImageFraction(wx, wz);
    const left = fx - TILE_FRAC_W / 2;
    const top = fy - TILE_FRAC_H / 2;
    const stripFracW = TILE_FRAC_W / candidateIndices.length;

    candidateIndices.forEach((candidateIndex, i) => {
      const div = document.createElement("div");
      div.style.position = "absolute";
      div.style.left = `${(left + stripFracW * i) * 100}%`;
      div.style.top = `${top * 100}%`;
      div.style.width = `${stripFracW * 100}%`;
      div.style.height = `${TILE_FRAC_H * 100}%`;
      div.style.background = CANDIDATE_COLORS[candidateIndex % CANDIDATE_COLORS.length];
      div.style.opacity = "0.85";
      highlightLayer.appendChild(div);
    });
  }
}

export function initLake(container, { onStatus } = {}) {
  const img = container.querySelector("#lakeImg");
  const overlay = container.querySelector("#lakeOverlay");
  highlightLayer = container.querySelector("#highlightLayer");

  function syncOverlay() {
    overlay.style.left = `${img.offsetLeft}px`;
    overlay.style.top = `${img.offsetTop}px`;
    overlay.style.width = `${img.offsetWidth}px`;
    overlay.style.height = `${img.offsetHeight}px`;
  }
  new ResizeObserver(syncOverlay).observe(container);
  window.addEventListener("resize", syncOverlay);
  window.addEventListener("load", () => setTimeout(syncOverlay, 100));

  if (onStatus) onStatus("Loading…");
  return new Promise((resolve, reject) => {
    const finish = () => {
      syncOverlay();
      if (onStatus) onStatus("");
      resolve();
    };
    if (img.complete && img.naturalWidth > 0) {
      finish();
      return;
    }
    img.addEventListener("load", finish, { once: true });
    img.addEventListener("error", () => {
      if (onStatus) onStatus("ERROR loading lake image");
      reject(new Error("lake image failed to load"));
    }, { once: true });
  });
}
