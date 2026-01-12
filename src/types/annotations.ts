/**
 * Annotation Type Definitions
 *
 * Uses TypeScript discriminated unions for type-safe annotation handling.
 * Each annotation type has a `type` field as the discriminator.
 */

// Position type for 3D coordinates
export type Position3D = [number, number, number]; // [x, y, z]

// Base annotation properties shared by all annotation types
export interface BaseAnnotation {
  id: string;
  color: string;
  thickness: number;
  createdAt: Date;
}

/**
 * Text Label Annotation
 * Displays text at a specific 3D position on the field
 */
export interface TextAnnotation extends BaseAnnotation {
  type: 'text';
  position: Position3D; // Single position where text is anchored
  text: string;
  fontSize?: number; // Optional custom font size
}

/**
 * Arrow Annotation
 * Directional arrow between two points on the field
 */
export interface ArrowAnnotation extends BaseAnnotation {
  type: 'arrow';
  startPoint: Position3D;
  endPoint: Position3D;
}

/**
 * Zone shape types for highlighting areas
 */
export type ZoneShape = 'circle' | 'rectangle';

/**
 * Zone Annotation
 * Semi-transparent shape for highlighting areas of the field
 */
export interface ZoneAnnotation extends BaseAnnotation {
  type: 'zone';
  shape: ZoneShape;
  center: Position3D;
  // For circle: [radius], For rectangle: [width, height]
  size: [number] | [number, number];
  opacity?: number; // Default 0.3
}

/**
 * Drawing Annotation
 * Free-hand path created by continuous mouse movement
 */
export interface DrawingAnnotation extends BaseAnnotation {
  type: 'drawing';
  points: Position3D[]; // Array of points forming the path
}

/**
 * Union type of all annotation types
 * Use this when you need to handle any annotation
 */
export type Annotation = TextAnnotation | ArrowAnnotation | ZoneAnnotation | DrawingAnnotation;

/**
 * Type for the annotation type discriminator
 */
export type AnnotationType = Annotation['type'];

/**
 * All possible annotation types as a const array
 */
export const ANNOTATION_TYPES = ['text', 'arrow', 'zone', 'drawing'] as const;

/**
 * Default values for annotation properties
 */
export const DEFAULT_ANNOTATION_VALUES = {
  color: '#ffff00', // Yellow
  thickness: 2,
  fontSize: 14,
  zoneOpacity: 0.3,
} as const;

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Type guard to check if an annotation is a TextAnnotation
 */
export function isTextAnnotation(annotation: Annotation): annotation is TextAnnotation {
  return annotation.type === 'text';
}

/**
 * Type guard to check if an annotation is an ArrowAnnotation
 */
export function isArrowAnnotation(annotation: Annotation): annotation is ArrowAnnotation {
  return annotation.type === 'arrow';
}

/**
 * Type guard to check if an annotation is a ZoneAnnotation
 */
export function isZoneAnnotation(annotation: Annotation): annotation is ZoneAnnotation {
  return annotation.type === 'zone';
}

/**
 * Type guard to check if an annotation is a DrawingAnnotation
 */
export function isDrawingAnnotation(annotation: Annotation): annotation is DrawingAnnotation {
  return annotation.type === 'drawing';
}

// ============================================================================
// Factory Types (for creating new annotations)
// ============================================================================

/**
 * Input type for creating a new text annotation (without generated fields)
 */
export type CreateTextAnnotation = Omit<TextAnnotation, 'id' | 'createdAt'>;

/**
 * Input type for creating a new arrow annotation (without generated fields)
 */
export type CreateArrowAnnotation = Omit<ArrowAnnotation, 'id' | 'createdAt'>;

/**
 * Input type for creating a new zone annotation (without generated fields)
 */
export type CreateZoneAnnotation = Omit<ZoneAnnotation, 'id' | 'createdAt'>;

/**
 * Input type for creating a new drawing annotation (without generated fields)
 */
export type CreateDrawingAnnotation = Omit<DrawingAnnotation, 'id' | 'createdAt'>;

/**
 * Union type for creating any annotation type
 */
export type CreateAnnotation =
  | CreateTextAnnotation
  | CreateArrowAnnotation
  | CreateZoneAnnotation
  | CreateDrawingAnnotation;

// ============================================================================
// Update Types (for partial updates)
// ============================================================================

/**
 * Partial update type for text annotations
 */
export type UpdateTextAnnotation = Partial<Omit<TextAnnotation, 'id' | 'type' | 'createdAt'>>;

/**
 * Partial update type for arrow annotations
 */
export type UpdateArrowAnnotation = Partial<Omit<ArrowAnnotation, 'id' | 'type' | 'createdAt'>>;

/**
 * Partial update type for zone annotations
 */
export type UpdateZoneAnnotation = Partial<Omit<ZoneAnnotation, 'id' | 'type' | 'createdAt'>>;

/**
 * Partial update type for drawing annotations
 */
export type UpdateDrawingAnnotation = Partial<Omit<DrawingAnnotation, 'id' | 'type' | 'createdAt'>>;

/**
 * Union type for updating any annotation type
 */
export type UpdateAnnotation =
  | UpdateTextAnnotation
  | UpdateArrowAnnotation
  | UpdateZoneAnnotation
  | UpdateDrawingAnnotation;

// ============================================================================
// Serialization Types (for persistence)
// ============================================================================

/**
 * Serialized annotation for JSON storage
 * Converts Date to ISO string for persistence
 */
export interface SerializedAnnotation {
  id: string;
  type: AnnotationType;
  color: string;
  thickness: number;
  createdAt: string; // ISO date string
  // Type-specific fields
  position?: Position3D;
  text?: string;
  fontSize?: number;
  startPoint?: Position3D;
  endPoint?: Position3D;
  shape?: ZoneShape;
  center?: Position3D;
  size?: [number] | [number, number];
  opacity?: number;
  points?: Position3D[];
}

/**
 * Serialize an annotation for JSON storage
 */
export function serializeAnnotation(annotation: Annotation): SerializedAnnotation {
  return {
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
  } as SerializedAnnotation;
}

/**
 * Deserialize an annotation from JSON storage
 */
export function deserializeAnnotation(data: SerializedAnnotation): Annotation {
  const base = {
    id: data.id,
    color: data.color,
    thickness: data.thickness,
    createdAt: new Date(data.createdAt),
  };

  switch (data.type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        position: data.position!,
        text: data.text!,
        fontSize: data.fontSize,
      } as TextAnnotation;

    case 'arrow':
      return {
        ...base,
        type: 'arrow',
        startPoint: data.startPoint!,
        endPoint: data.endPoint!,
      } as ArrowAnnotation;

    case 'zone':
      return {
        ...base,
        type: 'zone',
        shape: data.shape!,
        center: data.center!,
        size: data.size!,
        opacity: data.opacity,
      } as ZoneAnnotation;

    case 'drawing':
      return {
        ...base,
        type: 'drawing',
        points: data.points!,
      } as DrawingAnnotation;

    default:
      throw new Error(`Unknown annotation type: ${(data as SerializedAnnotation).type}`);
  }
}

/**
 * Serialize an array of annotations
 */
export function serializeAnnotations(annotations: Annotation[]): SerializedAnnotation[] {
  return annotations.map(serializeAnnotation);
}

/**
 * Deserialize an array of annotations
 */
export function deserializeAnnotations(data: SerializedAnnotation[]): Annotation[] {
  return data.map(deserializeAnnotation);
}
