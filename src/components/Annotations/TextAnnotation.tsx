import { Text, Billboard } from '@react-three/drei';
import { Annotation } from '../../store/annotationStore';

interface TextAnnotationProps {
  annotation: Annotation;
}

/**
 * TextAnnotation Component
 *
 * Renders text labels on the 3D field using @react-three/drei Text component.
 * Text billboards (faces camera) for optimal readability from any angle.
 */
export function TextAnnotation({ annotation }: TextAnnotationProps) {
  // Validate annotation has required text and position
  if (!annotation.text || annotation.points.length < 1) {
    return null;
  }

  const [x, , z] = annotation.points[0];
  const fontSize = 2; // Base font size for visibility on field
  const textHeight = 0.5; // Height above field for visibility

  return (
    <Billboard
      position={[x, textHeight, z]}
      follow={true}
      lockX={false}
      lockY={false}
      lockZ={false}
    >
      <Text
        color={annotation.color}
        fontSize={fontSize}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.05}
        outlineColor="#000000"
      >
        {annotation.text}
      </Text>
    </Billboard>
  );
}
