/**
 * Output type returned by PanelProperties.calculate().
 */
class PanelPropertiesType {
    constructor() {
        /** @type {CLTLayerPropertiesType[]} */
        this.layers = [];           // per-layer computed data

        this.totalThickness = 0;    // mm — sum of all layer thicknesses
        this.EI_eff = 0;            // N·mm²/mm — effective bending stiffness
        this.GA_eff = 0;            // N/mm — effective shear stiffness (Shear Analogy only)
        this.method = '';           // 'ShearAnalogy' | 'Gamma'
    }
}