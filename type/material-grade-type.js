/**
 * Material grade constants for CLT layers.
 * E values in N/mm², G values in N/mm².
 * Longitudinal (0°) layers use E0 and G.
 * Transverse (90°) layers use E90 and G_rolling (rolling shear).
 */
class MaterialGrade {
    /**
     * @param {string} name
     * @param {number} E0   - MOE parallel to grain (N/mm²)
     * @param {number} E90  - MOE perpendicular to grain (N/mm²)
     * @param {number} G    - Shear modulus (N/mm²)
     * @param {number} Gr   - Rolling shear modulus (N/mm²)
     */
    constructor(name, E0, E90, G, Gr) {
        this.name = name;
        this.E0 = E0;
        this.E90 = E90;
        this.G = G;
        this.Gr = Gr;
    }

    static get GRADES() {
        return {
            'C24': new MaterialGrade('C24', 11000, 370, 690, 50),
            'C16': new MaterialGrade('C16', 8000, 270, 500, 40),
            'GL24h': new MaterialGrade('GL24h', 11500, 300, 650, 65),
            'GL28h': new MaterialGrade('GL28h', 12600, 390, 780, 70),
            'GL32h': new MaterialGrade('GL32h', 13700, 460, 850, 80),
        };
    }
}