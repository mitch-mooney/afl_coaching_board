import {
  Annotation,
  TextAnnotation,
  ArrowAnnotation,
  ZoneAnnotation,
  DrawingAnnotation,
  Position3D,
  isTextAnnotation,
  isArrowAnnotation,
  isZoneAnnotation,
  isDrawingAnnotation,
} from '../types/annotations';

// Helper functions for annotation validation

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Create a successful validation result
 */
function validResult(): ValidationResult {
  return { valid: true, errors: [] };
}

/**
 * Create a failed validation result
 */
function invalidResult(errors: string[]): ValidationResult {
  return { valid: false, errors };
}

/**
 * Check if a Position3D array contains valid numbers
 */
function isValidPosition(position: Position3D): boolean {
  return (
    Array.isArray(position) &&
    position.length === 3 &&
    position.every((coord) => typeof coord === 'number' && isFinite(coord))
  );
}

/**
 * Calculate the distance between two 3D points
 */
function getDistance(p1: Position3D, p2: Position3D): number {
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const dz = p2[2] - p1[2];
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

// ============================================================================
// Type-specific Validators
// ============================================================================

/**
 * Validate a text annotation
 * Requirements:
 * - Text must be non-empty (after trimming)
 * - Position must be valid coordinates
 */
export function validateTextAnnotation(annotation: TextAnnotation): ValidationResult {
  const errors: string[] = [];

  // Check for valid position
  if (!isValidPosition(annotation.position)) {
    errors.push('Invalid position coordinates');
  }

  // Check for non-empty text
  if (!annotation.text || annotation.text.trim().length === 0) {
    errors.push('Text content cannot be empty');
  }

  // Check font size if provided
  if (annotation.fontSize !== undefined && annotation.fontSize <= 0) {
    errors.push('Font size must be positive');
  }

  return errors.length === 0 ? validResult() : invalidResult(errors);
}

/**
 * Validate an arrow annotation
 * Requirements:
 * - Arrow must have non-zero length (start and end points must be different)
 * - Both start and end points must be valid coordinates
 */
export function validateArrowAnnotation(annotation: ArrowAnnotation): ValidationResult {
  const errors: string[] = [];

  // Check for valid start point
  if (!isValidPosition(annotation.startPoint)) {
    errors.push('Invalid start point coordinates');
  }

  // Check for valid end point
  if (!isValidPosition(annotation.endPoint)) {
    errors.push('Invalid end point coordinates');
  }

  // Check for non-zero length
  if (isValidPosition(annotation.startPoint) && isValidPosition(annotation.endPoint)) {
    const length = getDistance(annotation.startPoint, annotation.endPoint);
    if (length < 0.01) {
      errors.push('Arrow must have non-zero length');
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(errors);
}

/**
 * Validate a zone annotation
 * Requirements:
 * - Zone must have non-zero area
 * - Center must be valid coordinates
 * - Size array must be valid based on shape type
 */
export function validateZoneAnnotation(annotation: ZoneAnnotation): ValidationResult {
  const errors: string[] = [];

  // Check for valid center position
  if (!isValidPosition(annotation.center)) {
    errors.push('Invalid center coordinates');
  }

  // Check for valid shape type
  if (annotation.shape !== 'circle' && annotation.shape !== 'rectangle') {
    errors.push('Invalid zone shape type');
  }

  // Validate size based on shape
  if (annotation.shape === 'circle') {
    // Circle needs [radius]
    if (!Array.isArray(annotation.size) || annotation.size.length < 1) {
      errors.push('Circle zone requires radius');
    } else if (annotation.size[0] <= 0) {
      errors.push('Circle radius must be positive');
    }
  } else if (annotation.shape === 'rectangle') {
    // Rectangle needs [width, height]
    if (!Array.isArray(annotation.size) || annotation.size.length < 2) {
      errors.push('Rectangle zone requires width and height');
    } else {
      const [width, height] = annotation.size as [number, number];
      if (width <= 0 || height <= 0) {
        errors.push('Rectangle dimensions must be positive');
      }
    }
  }

  // Check opacity if provided
  if (annotation.opacity !== undefined) {
    if (annotation.opacity < 0 || annotation.opacity > 1) {
      errors.push('Opacity must be between 0 and 1');
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(errors);
}

/**
 * Minimum number of points required for a valid drawing
 */
const MIN_DRAWING_POINTS = 2;

/**
 * Validate a drawing annotation
 * Requirements:
 * - Drawing must have at least 2 points to form a path
 * - All points must be valid coordinates
 */
export function validateDrawingAnnotation(annotation: DrawingAnnotation): ValidationResult {
  const errors: string[] = [];

  // Check for sufficient points
  if (!Array.isArray(annotation.points)) {
    errors.push('Points must be an array');
  } else if (annotation.points.length < MIN_DRAWING_POINTS) {
    errors.push(`Drawing must have at least ${MIN_DRAWING_POINTS} points`);
  } else {
    // Check all points are valid
    const invalidPointIndices = annotation.points
      .map((point, index) => (isValidPosition(point) ? -1 : index))
      .filter((index) => index !== -1);

    if (invalidPointIndices.length > 0) {
      errors.push(`Invalid coordinates at point indices: ${invalidPointIndices.join(', ')}`);
    }
  }

  return errors.length === 0 ? validResult() : invalidResult(errors);
}

// ============================================================================
// Generic Validators
// ============================================================================

/**
 * Validate base annotation properties common to all types
 */
export function validateBaseAnnotation(annotation: Annotation): ValidationResult {
  const errors: string[] = [];

  // Check for valid id
  if (!annotation.id || typeof annotation.id !== 'string' || annotation.id.trim().length === 0) {
    errors.push('Annotation must have a valid id');
  }

  // Check for valid color
  if (!annotation.color || typeof annotation.color !== 'string') {
    errors.push('Annotation must have a valid color');
  }

  // Check for valid thickness
  if (typeof annotation.thickness !== 'number' || annotation.thickness <= 0) {
    errors.push('Annotation must have a positive thickness');
  }

  // Check for valid createdAt date
  if (!(annotation.createdAt instanceof Date) || isNaN(annotation.createdAt.getTime())) {
    errors.push('Annotation must have a valid createdAt date');
  }

  return errors.length === 0 ? validResult() : invalidResult(errors);
}

/**
 * Validate any annotation type
 * Performs both base validation and type-specific validation
 */
export function validateAnnotation(annotation: Annotation): ValidationResult {
  const allErrors: string[] = [];

  // Validate base properties
  const baseResult = validateBaseAnnotation(annotation);
  if (!baseResult.valid) {
    allErrors.push(...baseResult.errors);
  }

  // Validate type-specific properties
  let typeResult: ValidationResult;

  if (isTextAnnotation(annotation)) {
    typeResult = validateTextAnnotation(annotation);
  } else if (isArrowAnnotation(annotation)) {
    typeResult = validateArrowAnnotation(annotation);
  } else if (isZoneAnnotation(annotation)) {
    typeResult = validateZoneAnnotation(annotation);
  } else if (isDrawingAnnotation(annotation)) {
    typeResult = validateDrawingAnnotation(annotation);
  } else {
    return invalidResult(['Unknown annotation type']);
  }

  if (!typeResult.valid) {
    allErrors.push(...typeResult.errors);
  }

  return allErrors.length === 0 ? validResult() : invalidResult(allErrors);
}

/**
 * Check if an annotation is valid (quick boolean check)
 */
export function isValidAnnotation(annotation: Annotation): boolean {
  return validateAnnotation(annotation).valid;
}

/**
 * Validate an array of annotations
 * Returns validation results indexed by annotation id
 */
export function validateAnnotations(
  annotations: Annotation[]
): Map<string, ValidationResult> {
  const results = new Map<string, ValidationResult>();

  for (const annotation of annotations) {
    results.set(annotation.id, validateAnnotation(annotation));
  }

  return results;
}

/**
 * Filter out invalid annotations from an array
 * Returns only annotations that pass validation
 */
export function filterValidAnnotations(annotations: Annotation[]): Annotation[] {
  return annotations.filter(isValidAnnotation);
}

/**
 * Get all invalid annotations from an array
 * Returns annotations that fail validation along with their errors
 */
export function getInvalidAnnotations(
  annotations: Annotation[]
): Array<{ annotation: Annotation; errors: string[] }> {
  const invalid: Array<{ annotation: Annotation; errors: string[] }> = [];

  for (const annotation of annotations) {
    const result = validateAnnotation(annotation);
    if (!result.valid) {
      invalid.push({ annotation, errors: result.errors });
    }
  }

  return invalid;
}
