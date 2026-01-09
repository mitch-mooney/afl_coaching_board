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
    case 'arrow':
      return <LineAnnotation annotation={annotation} />;
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
  const points = annotation.points.map((p) => new Float32Array(p));
  
  return (
    <line>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={points.length}
          array={new Float32Array(points.flat())}
          itemSize={3}
        />
      </bufferGeometry>
      <lineBasicMaterial color={annotation.color} linewidth={annotation.thickness || 2} />
    </line>
  );
}

function CircleAnnotation({ annotation }: { annotation: Annotation }) {
  if (annotation.points.length < 2) return null;
  const center = annotation.points[0];
  const radius = Math.sqrt(
    Math.pow(annotation.points[1][0] - center[0], 2) +
    Math.pow(annotation.points[1][2] - center[2], 2)
  );
  
  return (
    <mesh position={[center[0], 0.02, center[2]]} rotation={[-Math.PI / 2, 0, 0]}>
      <ringGeometry args={[radius - 0.1, radius, 32]} />
      <meshStandardMaterial color={annotation.color} />
    </mesh>
  );
}

function RectangleAnnotation({ annotation }: { annotation: Annotation }) {
  if (annotation.points.length < 2) return null;
  const [p1, p2] = annotation.points;
  const width = Math.abs(p2[0] - p1[0]);
  const height = Math.abs(p2[2] - p1[2]);
  const centerX = (p1[0] + p2[0]) / 2;
  const centerZ = (p1[2] + p2[2]) / 2;
  
  return (
    <mesh position={[centerX, 0.02, centerZ]} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial color={annotation.color} opacity={0.3} transparent />
    </mesh>
  );
}

function TextAnnotation({ annotation }: { annotation: Annotation }) {
  if (!annotation.text || annotation.points.length < 1) return null;
  const [x, y, z] = annotation.points[0];
  
  return (
    <mesh position={[x, 1, z]}>
      <planeGeometry args={[2, 0.5]} />
      <meshStandardMaterial color="#ffffff" />
    </mesh>
  );
}
