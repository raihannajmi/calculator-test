/**
 * Represents a complete CLT layup — an ordered stack of CLTLayerType.
 * Layers are ordered top to bottom.
 */
class CLTLayupType {
    constructor() {
        this.name = 'CLT Layup';
        /** @type {CLTLayerType[]} */
        this.layers = [];
    }

    addLayer(layer) {
        this.layers.push(layer);
    }

    getLayers() {
        return this.layers;
    }

    get totalThickness() {
        return this.layers.reduce((sum, l) => sum + l.thickness, 0);
    }

    /** Returns true if layup is symmetric (required for Shear Analogy). */
    isSymmetric() {
        const n = this.layers.length;
        for (let i = 0; i < Math.floor(n / 2); i++) {
            const top = this.layers[i];
            const bot = this.layers[n - 1 - i];
            if (top.thickness !== bot.thickness || top.orientation !== bot.orientation) return false;
        }
        return true;
    }
}