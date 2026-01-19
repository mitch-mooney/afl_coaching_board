import { Line } from '@react-three/drei';
import { Vector3 } from 'three';
import { useAnnotationStore } from '../../store/annotationStore';
import { Annotation } from '../../store/annotationStore';

export function AnnotationLayer() {
  const annotations = useAnnotationStore((state) => state.annotations);

  return (
    <group>
      {annotations.map((annotation) => (
        <AnnotationRenderer key={annotation.id} annotation={annotation} />
      ))}
    </group>
  );
}

function AnnotationRenderer({ annotation }: { annotation: Annotation }) {
  if (annotation.points.length < 2) return null;

  switch (annotation.type) {
    case 'line':
      return <LineAnnotation annotation={annotation} />;
    case 'arrow':
      return <ArrowAnnotation annotation={annotation} />;
    case 'circle':
      return <CircleAnnotation annotation={annotation} />;
    case 'rectangle':
      return <RectangleAnnotation annotation={annotation} />;
    case 'text':
      return <TextAnnotation annotation={annotation} />;
    default:
      return null;
  }
}

function LineAnnotation({ annotation }: { annotation: Annotation }) {
  // Raise the line slightly above the field to prevent z-fighting
  const points = annotation.points.map(
    (p) => new Vector3(p[0], 0.15, p[2])
  );

  return (
    <Line
      points={points}
      color={annotation.color}
      lineWidth={annotation.thickness || 3}
    />
  );
}

function ArrowAnnotation({ annotation }: { annotation: Annotation }) {
  const [start, end] = annotation.points;
  const startVec = new Vector3(start[0], 0.15, start[2]);
  const endVec = new Vector3(end[0], 0.15, end[2]);

  // Calculate arrow head points
  const direction = endVec.clone().sub(startVec).normalize();
  const arrowLength = 2;
  const arrowWidth = 1;

  // Perpendicular vector for arrow head
  const perpendicular = new Vector3(-direction.z, 0, direction.x);

  const arrowBase = endVec.clone().sub(direction.clone().multiplyScalar(arrowLength));
  const arrowLeft = arrowBase.clone().add(perpendicular.clone().multiplyScalar(arrowWidth));
  const arrowRight = arrowBase.clone().sub(perpendicular.clone().multiplyScalar(arrowWidth));

  return (
    <group>
      <Line
        points={[startVec, endVec]}
        color={annotation.color}
        lineWidth={annotation.thickness || 3}
      />
      {/* Arrow head */}
      <Line
        points={[arrowLeft, endVec, arrowRight]}
        color={annotation.color}
        lineWidth={annotation.thickness || 3}
      />
    </group>
  );
}

function CircleAnnotation({ annotation }: { annotation: Annotation }) {
  if (annotation.points.length < 2) return null;
  const center = annotation.points[0];
  const radius = Math.sqrt(
    Math.pow(annotation.points[1][0] - center[0], 2) +
    Math.pow(annotation.points[1][2] - center[2], 2)
  );

  // Generate circle points
  const segments = 32;
  const circlePoints: Vector3[] = [];
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    circlePoints.push(
      new Vector3(
        center[0] + Math.cos(angle) * radius,
        0.15,
        center[2] + Math.sin(angle) * radius
      )
    );
  }

  return (
    <Line
      points={circlePoints}
      color={annotation.color}
      lineWidth={annotation.thickness || 3}
    />
  );
}

function RectangleAnnotation({ annotation }: { annotation: Annotation }) {
  if (annotation.points.length < 2) return null;
  const [p1, p2] = annotation.points;

  const corners = [
    new Vector3(p1[0], 0.15, p1[2]),
    new Vector3(p2[0], 0.15, p1[2]),
    new Vector3(p2[0], 0.15, p2[2]),
    new Vector3(p1[0], 0.15, p2[2]),
    new Vector3(p1[0], 0.15, p1[2]), // close the rectangle
  ];

  return (
    <Line
      points={corners}
      color={annotation.color}
      lineWidth={annotation.thickness || 3}
    />
  );
}

function TextAnnotation({ annotation }: { annotation: Annotation }) {
  if (!annotation.text || annotation.points.length < 1) return null;
  const [x, _y, z] = annotation.points[0];
  
  return (
    <mesh position={[x, 1, z]}>
      <planeGeometry args={[2, 0.5]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}
