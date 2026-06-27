/**
 * Calculator UI controller for CLT Floor Panel Properties.
 * Wires DOM inputs → CLTLayupType → PanelProperties → rendered output.
 */

// ── Constants ─────────────────────────────────────────────────────────────────
const MIN_LAYERS = 3;
const MAX_LAYERS_SA = 9;
const GAMMA_ALLOWED = [3, 5];

// ── State ─────────────────────────────────────────────────────────────────────
let layerCount = 5;
let currentMethod = 'ShearAnalogy'; // 'ShearAnalogy' | 'Gamma'

// ── Helpers ───────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const fmt = (v, d = 2) => (typeof v === 'number' ? v.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d }) : '—');
const fmtSci = v => (typeof v === 'number' ? v.toExponential(3) : '—');

function getGrades() {
    return Object.keys(MaterialGrade.GRADES);
}

// ── Layer input row builder ───────────────────────────────────────────────────
function buildLayerRow(index, defaultOrientation) {
    const grades = getGrades();
    return `
    <div class="layer-row" id="layer-row-${index}" data-index="${index}">
      <div class="layer-badge">L${index}</div>
      <div class="field-group">
        <label>Thickness (mm)</label>
        <input type="number" id="t-${index}" class="field-input" value="35" min="1" max="500" step="1">
      </div>
      <div class="field-group">
        <label>Orientation</label>
        <select id="ori-${index}" class="field-select">
          <option value="0" ${defaultOrientation === 0 ? 'selected' : ''}>0° (Longitudinal)</option>
          <option value="90" ${defaultOrientation === 90 ? 'selected' : ''}>90° (Transverse)</option>
        </select>
      </div>
      <div class="field-group">
        <label>Grade</label>
        <select id="grade-${index}" class="field-select">
          ${grades.map(g => `<option value="${g}">${g}</option>`).join('')}
        </select>
      </div>
    </div>`;
}

function defaultOrientation(idx, total) {
    // Alternating 0/90/0/90... — odd index → 0°, even index → 90°
    return idx % 2 === 1 ? 0 : 90;
}

// ── Render layer inputs ───────────────────────────────────────────────────────
function renderLayers() {
    const container = $('layer-inputs');
    container.innerHTML = '';
    for (let i = 1; i <= layerCount; i++) {
        container.insertAdjacentHTML('beforeend', buildLayerRow(i, defaultOrientation(i, layerCount)));
    }
    updateLayerCounter();
}

function updateLayerCounter() {
    $('layer-count-display').textContent = layerCount;
}

// ── Layer count controls ──────────────────────────────────────────────────────
function addLayer() {
    const max = currentMethod === 'ShearAnalogy' ? MAX_LAYERS_SA : 5;
    if (layerCount >= max) return;
    layerCount++;
    renderLayers();
}

function removeLayer() {
    if (layerCount <= MIN_LAYERS) return;
    layerCount--;
    // Gamma: only 3 or 5 allowed
    if (currentMethod === 'Gamma' && !GAMMA_ALLOWED.includes(layerCount)) {
        layerCount--;
    }
    if (layerCount < MIN_LAYERS) layerCount = MIN_LAYERS;
    renderLayers();
}

// ── Build layup from DOM ──────────────────────────────────────────────────────
function buildLayup() {
    const layup = new CLTLayupType();
    layup.name = $('layup-name').value || 'CLT Layup';
    for (let i = 1; i <= layerCount; i++) {
        const t = parseFloat($(`t-${i}`).value);
        const ori = parseInt($(`ori-${i}`).value);
        const gradeName = $(`grade-${i}`).value;
        const grade = MaterialGrade.GRADES[gradeName];
        layup.addLayer(new CLTLayerType(t, ori, grade));
    }
    return layup;
}

// ── Calculation ───────────────────────────────────────────────────────────────
function calculate() {
    clearError();
    try {
        const layup = buildLayup();
        let result;
        if (currentMethod === 'ShearAnalogy') {
            result = new ShearAnalogyMethod().calculate(layup);
        } else {
            const span = parseFloat($('span-input').value) || 3000;
            result = new GammaMethod().calculate(layup, span);
        }
        renderResult(result);
        $('output-section').classList.remove('hidden');
        $('output-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
        showError(e.message);
    }
}

// ── Result renderer ───────────────────────────────────────────────────────────
function renderResult(result) {
    // Summary cards
    $('res-method').textContent = result.method === 'ShearAnalogy' ? 'Shear Analogy' : 'Gamma (γ)';
    $('res-layers').textContent = result.layers.length;
    $('res-thickness').textContent = fmt(result.totalThickness, 0) + ' mm';
    $('res-EI').textContent = fmtSci(result.EI_eff) + ' N·mm²/mm';
    $('res-GA').textContent = result.GA_eff !== null ? fmtSci(result.GA_eff) + ' N/mm' : 'N/A (Gamma)';

    // Layer table
    const tbody = $('layer-table-body');
    tbody.innerHTML = '';
    const isGamma = result.method === 'Gamma';

    for (const lp of result.layers) {
        const gammaCell = isGamma
            ? `<td class="tbl-val">${fmt(lp.gamma, 4)}</td>`
            : '';
        tbody.insertAdjacentHTML('beforeend', `
          <tr>
            <td><span class="layer-pill">${lp.index}</span></td>
            <td class="tbl-val">${lp.thickness} mm</td>
            <td class="tbl-val">
              <span class="ori-badge ${lp.orientation === 0 ? 'ori-0' : 'ori-90'}">
                ${lp.orientation}°
              </span>
            </td>
            <td class="tbl-val">${fmt(lp.E, 0)}</td>
            <td class="tbl-val">${fmt(lp.G, 0)}</td>
            <td class="tbl-val">${fmt(lp.z, 2)}</td>
            ${gammaCell}
            <td class="tbl-val">${fmtSci(lp.EI_self)}</td>
            <td class="tbl-val">${fmtSci(lp.EI_steiner)}</td>
            <td class="tbl-val highlight-col">${fmtSci(lp.EI_total)}</td>
          </tr>`);
    }

    // Show/hide gamma column header
    $('gamma-col-header').style.display = isGamma ? '' : 'none';
    document.querySelectorAll('.gamma-col').forEach(el => {
        el.style.display = isGamma ? '' : 'none';
    });

    // Visual cross-section
    renderCrossSection(result);
}

// ── SVG cross-section visualiser ─────────────────────────────────────────────
function renderCrossSection(result) {
    const canvas = $('cross-section-canvas');
    const W = canvas.clientWidth || 320;
    const totalT = result.totalThickness;
    const scale = Math.min(220, W * 0.6) / totalT;
    const panelW = Math.min(280, W * 0.75);
    const panelH = totalT * scale;
    const offsetX = (W - panelW) / 2;
    const offsetY = 20;

    const colors = { 0: '#e8a84f', 90: '#a0c4a0' };
    let rects = '';
    let labels = '';
    let y = offsetY;
    for (const lp of result.layers) {
        const h = lp.thickness * scale;
        const fill = colors[lp.orientation];
        const stroke = lp.orientation === 0 ? '#c0853a' : '#6a9f6a';
        rects += `<rect x="${offsetX}" y="${y}" width="${panelW}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="1.5" rx="2"/>`;
        // grain lines
        if (lp.orientation === 0) {
            for (let gx = offsetX + 15; gx < offsetX + panelW - 10; gx += 25) {
                rects += `<line x1="${gx}" y1="${y + 4}" x2="${gx}" y2="${y + h - 4}" stroke="#d4954480" stroke-width="1"/>`;
            }
        } else {
            for (let gy = y + 8; gy < y + h - 4; gy += 10) {
                rects += `<line x1="${offsetX + 4}" y1="${gy}" x2="${offsetX + panelW - 4}" y2="${gy}" stroke="#6a9f6a80" stroke-width="1"/>`;
            }
        }
        labels += `<text x="${offsetX - 8}" y="${y + h / 2 + 4}" text-anchor="end" fill="#c0c8e0" font-size="11" font-family="Inter,sans-serif">L${lp.index} ${lp.orientation}°</text>`;
        // thickness annotation
        labels += `<text x="${offsetX + panelW + 8}" y="${y + h / 2 + 4}" text-anchor="start" fill="#8892aa" font-size="10" font-family="Inter,sans-serif">${lp.thickness} mm</text>`;
        y += h;
    }

    // total thickness brace
    const braceX = offsetX + panelW + 50;
    const svg = `
    <svg width="${W}" height="${panelH + offsetY * 2 + 20}" xmlns="http://www.w3.org/2000/svg">
      ${rects}
      ${labels}
      <line x1="${braceX}" y1="${offsetY}" x2="${braceX}" y2="${offsetY + panelH}" stroke="#5a6588" stroke-width="1.5"/>
      <line x1="${braceX - 5}" y1="${offsetY}" x2="${braceX + 5}" y2="${offsetY}" stroke="#5a6588" stroke-width="1.5"/>
      <line x1="${braceX - 5}" y1="${offsetY + panelH}" x2="${braceX + 5}" y2="${offsetY + panelH}" stroke="#5a6588" stroke-width="1.5"/>
      <text x="${braceX + 8}" y="${offsetY + panelH / 2 + 4}" fill="#8892aa" font-size="10" font-family="Inter,sans-serif">${fmt(totalT, 0)} mm</text>
    </svg>`;
    canvas.innerHTML = svg;
}

// ── Error handling ────────────────────────────────────────────────────────────
function showError(msg) {
    const el = $('error-msg');
    el.textContent = '⚠ ' + msg;
    el.classList.remove('hidden');
    $('output-section').classList.add('hidden');
}
function clearError() {
    $('error-msg').classList.add('hidden');
}

// ── Method toggle ─────────────────────────────────────────────────────────────
function setMethod(method) {
    currentMethod = method;
    $('btn-sa').classList.toggle('active', method === 'ShearAnalogy');
    $('btn-gamma').classList.toggle('active', method === 'Gamma');
    $('sa-info').classList.toggle('hidden', method !== 'ShearAnalogy');
    $('gamma-info').classList.toggle('hidden', method !== 'Gamma');
    $('span-row').classList.toggle('hidden', method !== 'Gamma');

    // Clamp layer count to method limits
    if (method === 'Gamma') {
        // Force to nearest allowed Gamma count
        if (!GAMMA_ALLOWED.includes(layerCount)) {
            layerCount = layerCount > 4 ? 5 : 3;
        }
    }
    renderLayers();
    clearError();
    $('output-section').classList.add('hidden');
}

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    renderLayers();
    setMethod('ShearAnalogy');

    $('btn-sa').addEventListener('click', () => setMethod('ShearAnalogy'));
    $('btn-gamma').addEventListener('click', () => setMethod('Gamma'));
    $('btn-add-layer').addEventListener('click', addLayer);
    $('btn-remove-layer').addEventListener('click', removeLayer);
    $('btn-calculate').addEventListener('click', calculate);
    $('btn-reset').addEventListener('click', () => {
        layerCount = 5;
        setMethod(currentMethod);
        $('output-section').classList.add('hidden');
        clearError();
    });
});