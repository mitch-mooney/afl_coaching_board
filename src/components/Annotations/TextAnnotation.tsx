import { useState } from 'react';
import { Text, Billboard } from '@react-three/drei';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';

interface TextAnnotationProps {
  annotation: Annotation;
}

/**
 * TextAnnotation Component
 *
 * Renders text labels on the 3D field using @react-three/drei Text component.
 * Text billboards (faces camera) for optimal readability from any angle.
 * Supports selection highlighting with visual indicator.
 */
export function TextAnnotation({ annotation }: TextAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const { selectedAnnotationId, selectAnnotation } = useAnnotationStore();
  const isSelected = selectedAnnotationId === annotation.id;

  // Validate annotation has required text and position
  if (!annotation.text || annotation.points.length < 1) {
    return null;
  }

  const [x, , z] = annotation.points[0];
  const fontSize = 2; // Base font size for visibility on field
  const textHeight = 0.5; // Height above field for visibility

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => setHovered(false);

  // Determine text color based on selection/hover state
  const textColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;
  const outlineColor = isSelected ? '#ff8800' : '#000000';
  const outlineWidth = isSelected ? 0.1 : 0.05;

  return (
    <group
      onClick={handleClick}
      onPointerOver={handlePointerOver}
      onPointerOut={handlePointerOut}
    >
      <Billboard
        position={[x, textHeight, z]}
        follow={true}
        lockX={false}
        lockY={false}
        lockZ={false}
      >
        <Text
          color={textColor}
          fontSize={fontSize}
          anchorX="center"
          anchorY="middle"
          outlineWidth={outlineWidth}
          outlineColor={outlineColor}
        >
          {annotation.text}
        </Text>
      </Billboard>

      {/* Selection indicator ring on ground */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
          <ringGeometry args={[1.5, 1.8, 16]} />
          <meshStandardMaterial color="#ffff00" emissive="#ffff00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  );
}
