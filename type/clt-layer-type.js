/**
 * Represents a single layer in a CLT panel.
 * orientation: 0  → longitudinal (parallel to span)
 * orientation: 90 → transverse (perpendicular to span)
 */
class CLTLayerType {
    /**
     * @param {number} thickness  - Layer thickness in mm
     * @param {number} orientation - 0 or 90 (degrees)
     * @param {MaterialGrade} grade - Material grade
     */
    constructor(thickness, orientation, grade) {
        this.thickness = thickness;     // mm
        this.orientation = orientation; // 0 or 90
        this.grade = grade;
    }

    /** Effective MOE for this layer (0° uses E0, 90° uses E90) */
    get E() {
        return this.orientation === 0 ? this.grade.E0 : this.grade.E90;
    }

    /** Shear modulus for this layer */
    get G() {
        return this.orientation === 0 ? this.grade.G : this.grade.Gr;
    }
}