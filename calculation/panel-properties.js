/**
 * Class Panel Properties is used to calculate the properties of panel CLT Layup.
 *
 * How to use:
 *   const result = new ShearAnalogyMethod().calculate(layup);  // → PanelPropertiesType
 *   const result = new GammaMethod().calculate(layup, span);   // → PanelPropertiesType
 *
 * Shear Analogy: 3–9 layers, symmetric layup required.
 * Gamma Method : 3 or 5 layers only.
 *
 * All values are per unit width (1 mm strip).
 */

// ─── Base ──────────────────────────────────────────────────────────────────────
class PanelProperties {
    /**
     * @param {CLTLayupType} cltLayup
     * @returns {PanelPropertiesType}
     */
    calculate(cltLayup) {
        throw new Error('calculate() must be implemented by subclass');
    }

    /**
     * Computes the z-coordinate (distance from panel neutral axis) for each layer.
     * The neutral axis is at the mid-thickness of the panel for a symmetric layup.
     * @param {CLTLayerType[]} layers
     * @returns {number[]}  z values (mm), positive upward from panel centre
     */
    _computeZCoordinates(layers) {
        const total = layers.reduce((s, l) => s + l.thickness, 0);
        const z = [];
        let pos = 0;  // running top-surface position
        for (const l of layers) {
            const centroid = pos + l.thickness / 2;
            z.push(total / 2 - centroid);  // distance from panel mid-plane
            pos += l.thickness;
        }
        return z;
    }
}

// ─── Shear Analogy Method ──────────────────────────────────────────────────────
class ShearAnalogyMethod extends PanelProperties {
    /**
     * Validates and calculates using Shear Analogy method.
     * - Supports 3–9 layers
     * - Layup must be symmetric top-to-bottom
     *
     * @param {CLTLayupType} cltLayup
     * @returns {PanelPropertiesType}
     */
    calculate(cltLayup) {
        const layers = cltLayup.getLayers();
        const n = layers.length;

        if (n < 3 || n > 9) throw new Error(`Shear Analogy supports 3–9 layers. Got ${n}.`);
        if (!cltLayup.isSymmetric()) throw new Error('Shear Analogy requires a symmetric layup.');

        const zCoords = this._computeZCoordinates(layers);
        const result = new PanelPropertiesType();
        result.method = 'ShearAnalogy';
        result.totalThickness = cltLayup.totalThickness;

        // ── EI_eff: Σ (E·I_self + E·A·z²) per unit width ──────────────────────
        let EI_eff = 0;
        for (let i = 0; i < n; i++) {
            const l = layers[i];
            const t = l.thickness;
            const E = l.E;
            const z = zCoords[i];

            const A = t;               // per unit width
            const I = (t ** 3) / 12;  // per unit width
            const EI_self = E * I;
            const EI_steiner = E * A * z ** 2;
            const EI_total = EI_self + EI_steiner;

            EI_eff += EI_total;

            const lp = new CLTLayerPropertiesType();
            lp.index = i + 1;
            lp.thickness = t;
            lp.orientation = l.orientation;
            lp.E = E;
            lp.G = l.G;
            lp.z = z;
            lp.A = A;
            lp.I = I;
            lp.EI_self = EI_self;
            lp.EI_steiner = EI_steiner;
            lp.EI_total = EI_total;
            result.layers.push(lp);
        }
        result.EI_eff = EI_eff;

        // ── GA_eff: a² / Σ(αᵢ·tᵢ / Gᵢ) per unit width ────────────────────────
        // a = distance between centroids of outermost layers
        const a = Math.abs(zCoords[0] - zCoords[n - 1]);

        let denom = 0;
        for (let i = 0; i < n; i++) {
            const alpha = (i === 0 || i === n - 1) ? 0.5 : 1;
            denom += (alpha * layers[i].thickness) / layers[i].G;
        }
        result.GA_eff = (a ** 2) / denom;

        return result;
    }
}

// ─── Gamma Method ──────────────────────────────────────────────────────────────
class GammaMethod extends PanelProperties {
    /**
     * Validates and calculates using Gamma (γ) method.
     * - Only 3 or 5 layers
     *
     * @param {CLTLayupType} cltLayup
     * @param {number} span - Span length in mm (required for γ factor)
     * @returns {PanelPropertiesType}
     */
    calculate(cltLayup, span = 3000) {
        const layers = cltLayup.getLayers();
        const n = layers.length;

        if (n !== 3 && n !== 5) throw new Error(`Gamma Method supports only 3 or 5 layers. Got ${n}.`);

        const zCoords = this._computeZCoordinates(layers);
        const result = new PanelPropertiesType();
        result.method = 'Gamma';
        result.totalThickness = cltLayup.totalThickness;

        // Identify longitudinal (0°) layers and cross (90°) connector layers
        // For 3-layer: indices 0, 2 are longitudinal; index 1 is cross
        // For 5-layer: indices 0, 2, 4 are longitudinal; indices 1, 3 are cross

        // γᵢ factor for each layer: outer longitudinal → 1, middle long → computed, cross → 0 (connectors)
        const gamma = new Array(n).fill(0);

        // Assign γ = 1 for outer longitudinal layers
        gamma[0] = 1;
        gamma[n - 1] = 1;

        // For inner longitudinal layers (5-layer: index 2), compute γ
        if (n === 5) {
            // γ₂ = 1 / (1 + π²·E₂·A₂·s / (L²·G_cross·b))  per unit width (b=1)
            const l_cross1 = layers[1]; // cross layer above centre
            const l_centre = layers[2]; // centre longitudinal
            const s = Math.abs(zCoords[0] - zCoords[2]);  // distance top-long to centre-long
            const G_cross = l_cross1.G;  // rolling shear of cross layer
            const E_centre = l_centre.E;
            const A_centre = l_centre.thickness;
            gamma[2] = 1 / (1 + (Math.PI ** 2 * E_centre * A_centre * s) / (span ** 2 * G_cross));
        }

        // ── EI_eff: Σ (γᵢ·Eᵢ·Aᵢ·zᵢ² + Eᵢ·Iᵢ) for longitudinal layers only ──
        let EI_eff = 0;
        for (let i = 0; i < n; i++) {
            const l = layers[i];
            const t = l.thickness;
            const E = l.E;
            const z = zCoords[i];

            const A = t;
            const I = (t ** 3) / 12;

            // Cross layers: only self-stiffness (E90 × I is tiny but included)
            const g = gamma[i];
            const EI_self = E * I;
            const EI_steiner = g * E * A * z ** 2;
            const EI_total = EI_self + EI_steiner;

            EI_eff += EI_total;

            const lp = new CLTLayerPropertiesType();
            lp.index = i + 1;
            lp.thickness = t;
            lp.orientation = l.orientation;
            lp.E = E;
            lp.G = l.G;
            lp.z = z;
            lp.A = A;
            lp.I = I;
            lp.gamma = g;
            lp.EI_self = EI_self;
            lp.EI_steiner = EI_steiner;
            lp.EI_total = EI_total;
            result.layers.push(lp);
        }
        result.EI_eff = EI_eff;
        // GA_eff not applicable for Gamma method
        result.GA_eff = null;

        return result;
    }
}
