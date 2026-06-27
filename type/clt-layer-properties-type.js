/**
 * Computed properties for a single layer, used internally during calculation.
 */
class CLTLayerPropertiesType {
    constructor() {
        this.index = 0;         // layer index (1-based)
        this.thickness = 0;     // mm
        this.orientation = 0;   // degrees
        this.E = 0;             // effective MOE (N/mm²)
        this.G = 0;             // shear modulus (N/mm²)
        this.z = 0;             // centroid distance from panel neutral axis (mm)
        this.A = 0;             // area per unit width (mm²/mm = mm)
        this.I = 0;             // self moment of inertia per unit width (mm⁴/mm = mm³)
        this.EI_self = 0;       // E × I_self (N·mm²/mm)
        this.EI_steiner = 0;    // E × A × z² (N·mm²/mm)
        this.EI_total = 0;      // EI_self + EI_steiner (N·mm²/mm)
    }
}