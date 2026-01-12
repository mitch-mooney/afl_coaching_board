import { useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Text, Billboard } from '@react-three/drei';
import { Vector3, Plane } from 'three';
import { Annotation, useAnnotationStore } from '../../store/annotationStore';
import { snapToField } from '../../utils/fieldGeometry';

interface TextAnnotationProps {
  annotation: Annotation;
}

/**
 * TextAnnotation Component
 *
 * Renders text labels on the 3D field using @react-three/drei Text component.
 * Text billboards (faces camera) for optimal readability from any angle.
 * Supports selection highlighting with visual indicator.
 * When selected, the entire text can be dragged to a new position.
 */
export function TextAnnotation({ annotation }: TextAnnotationProps) {
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const { selectedAnnotationId, selectAnnotation, updateAnnotationPoint } = useAnnotationStore();
  const { camera, raycaster } = useThree();
  const isSelected = selectedAnnotationId === annotation.id;

  // Validate annotation has required text and position
  if (!annotation.text || annotation.points.length < 1) {
    return null;
  }

  const [x, y, z] = annotation.points[0];
  const fontSize = 2; // Base font size for visibility on field
  const textHeight = 0.5; // Height above field for visibility

  // Handle dragging with global pointer events in useFrame
  useFrame((state) => {
    if (isDragging && isSelected) {
      raycaster.setFromCamera(state.pointer, camera);
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );

      if (intersection) {
        const [newX, newZ] = snapToField(intersection.x, intersection.z);
        updateAnnotationPoint(annotation.id, 0, [newX, y || 0, newZ]);
      }
    }
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
  };

  const handlePointerDown = (e: any) => {
    e.stopPropagation();
    selectAnnotation(annotation.id);
    setIsDragging(true);
  };

  const handlePointerMove = (e: any) => {
    // Movement is handled in useFrame for smoother dragging
    if (isDragging) {
      e.stopPropagation();
    }
  };

  const handlePointerUp = (e: any) => {
    e.stopPropagation();
    setIsDragging(false);
  };

  const handlePointerOver = () => setHovered(true);
  const handlePointerOut = () => {
    setHovered(false);
    setIsDragging(false);
  };

  // Determine text color based on selection/hover state
  const textColor = isSelected ? '#ffff00' : hovered ? '#ffffff' : annotation.color;
  const outlineColor = isSelected ? '#ff8800' : '#000000';
  const outlineWidth = isSelected ? 0.1 : 0.05;

  return (
    <group
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
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

      {/* Selection indicator ring on ground - serves as drag handle */}
      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[x, 0.03, z]}>
          <ringGeometry args={[1.5, 1.8, 16]} />
          <meshStandardMaterial
            color="#ffff00"
            emissive="#ffff00"
            emissiveIntensity={isDragging ? 0.8 : 0.5}
          />
        </mesh>
      )}
    </group>
  );
}
