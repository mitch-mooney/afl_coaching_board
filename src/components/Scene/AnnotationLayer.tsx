import { Line, Text, Billboard } from '@react-three/drei';
import { Vector3 } from 'three';
import { useAnnotationStore } from '../../store/annotationStore';
import { Annotation } from '../../store/annotationStore';

export function AnnotationLayer() {
  const annotations = useAnnotationStore((state) => state.annotations);
  const livePreview = useAnnotationStore((state) => state.livePreview);
  const selectedColor = useAnnotationStore((state) => state.selectedColor);
  const thickness = useAnnotationStore((state) => state.thickness);

  return (
    <group>
      {annotations.map((annotation) => (
        <AnnotationRenderer key={annotation.id} annotation={annotation} />
      ))}
      {livePreview && livePreview.points.length >= 2 && (
        <AnnotationRenderer
          annotation={{
            id: '__preview__',
            type: livePreview.type,
            points: livePreview.points,
            color: selectedColor,
            thickness,
            createdAt: new Date(),
          }}
          isPreview
        />
      )}
    </group>
  );
}

function AnnotationRenderer({ annotation, isPreview = false }: { annotation: Annotation; isPreview?: boolean }) {
  if (annotation.points.length < 2) return null;

  switch (annotation.type) {
    case 'line':
      return <LineAnnotation annotation={annotation} isPreview={isPreview} />;
    case 'arrow':
      return <ArrowAnnotation annotation={annotation} isPreview={isPreview} />;
    case 'circle':
      return <CircleAnnotation annotation={annotation} isPreview={isPreview} />;
    case 'rectangle':
      return <RectangleAnnotation annotation={annotation} isPreview={isPreview} />;
    case 'text':
      return <TextAnnotation annotation={annotation} />;
    case 'measure':
      return <MeasurementAnnotation annotation={annotation} isPreview={isPreview} />;
    default:
      return null;
  }
}

function LineAnnotation({ annotation, isPreview }: { annotation: Annotation; isPreview?: boolean }) {
  const points = annotation.points.map(
    (p) => new Vector3(p[0], 0.15, p[2])
  );

  return (
    <Line
      points={points}
      color={annotation.color}
      lineWidth={annotation.thickness || 3}
      transparent={isPreview}
      opacity={isPreview ? 0.6 : 1}
    />
  );
}

function ArrowAnnotation({ annotation, isPreview }: { annotation: Annotation; isPreview?: boolean }) {
  const [start, end] = annotation.points;
  const startVec = new Vector3(start[0], 0.15, start[2]);
  const endVec = new Vector3(end[0], 0.15, end[2]);

  const direction = endVec.clone().sub(startVec).normalize();
  const arrowLength = 2;
  const arrowWidth = 1;

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
        transparent={isPreview}
        opacity={isPreview ? 0.6 : 1}
      />
      <Line
        points={[arrowLeft, endVec, arrowRight]}
        color={annotation.color}
        lineWidth={annotation.thickness || 3}
        transparent={isPreview}
        opacity={isPreview ? 0.6 : 1}
      />
    </group>
  );
}

function CircleAnnotation({ annotation, isPreview }: { annotation: Annotation; isPreview?: boolean }) {
  if (annotation.points.length < 2) return null;
  const center = annotation.points[0];
  const radius = Math.sqrt(
    Math.pow(annotation.points[1][0] - center[0], 2) +
    Math.pow(annotation.points[1][2] - center[2], 2)
  );

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
      transparent={isPreview}
      opacity={isPreview ? 0.6 : 1}
    />
  );
}

function RectangleAnnotation({ annotation, isPreview }: { annotation: Annotation; isPreview?: boolean }) {
  if (annotation.points.length < 2) return null;
  const [p1, p2] = annotation.points;

  const corners = [
    new Vector3(p1[0], 0.15, p1[2]),
    new Vector3(p2[0], 0.15, p1[2]),
    new Vector3(p2[0], 0.15, p2[2]),
    new Vector3(p1[0], 0.15, p2[2]),
    new Vector3(p1[0], 0.15, p1[2]),
  ];

  return (
    <Line
      points={corners}
      color={annotation.color}
      lineWidth={annotation.thickness || 3}
      transparent={isPreview}
      opacity={isPreview ? 0.6 : 1}
    />
  );
}

function TextAnnotation({ annotation }: { annotation: Annotation }) {
  if (!annotation.text || annotation.points.length < 1) return null;
  const [x, , z] = annotation.points[0];

  return (
    <Billboard position={[x, 2, z]}>
      <Text
        font="/fonts/Inter-Bold.woff"
        fontSize={3}
        color={annotation.color}
        anchorX="center"
        anchorY="middle"
        outlineWidth={0.3}
        outlineColor="#000000"
      >
        {annotation.text}
      </Text>
    </Billboard>
  );
}

function MeasurementAnnotation({ annotation, isPreview }: { annotation: Annotation; isPreview?: boolean }) {
  if (annotation.points.length < 2) return null;
  const [p1, p2] = annotation.points;

  const startVec = new Vector3(p1[0], 0.15, p1[2]);
  const endVec = new Vector3(p2[0], 0.15, p2[2]);

  // Distance in meters (1 unit = 1 metre in this scene)
  const distanceM = Math.sqrt(
    Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[2] - p1[2], 2)
  );
  const label = `${distanceM.toFixed(1)} m`;

  // Midpoint for the label, raised a bit above the line
  const midX = (p1[0] + p2[0]) / 2;
  const midZ = (p1[2] + p2[2]) / 2;

  // Endpoint tick marks (perpendicular to the line)
  const direction = endVec.clone().sub(startVec).normalize();
  const perp = new Vector3(-direction.z, 0, direction.x);
  const tickHalf = 1.5;

  const tick1a = startVec.clone().add(perp.clone().multiplyScalar(tickHalf));
  const tick1b = startVec.clone().sub(perp.clone().multiplyScalar(tickHalf));
  const tick2a = endVec.clone().add(perp.clone().multiplyScalar(tickHalf));
  const tick2b = endVec.clone().sub(perp.clone().multiplyScalar(tickHalf));

  const opacity = isPreview ? 0.7 : 1;
  const color = annotation.color;

  return (
    <group>
      {/* Main measurement line */}
      <Line
        points={[startVec, endVec]}
        color={color}
        lineWidth={annotation.thickness || 2}
        transparent={isPreview}
        opacity={opacity}
      />

      {/* Tick marks at each end */}
      <Line points={[tick1a, tick1b]} color={color} lineWidth={annotation.thickness || 2} transparent={isPreview} opacity={opacity} />
      <Line points={[tick2a, tick2b]} color={color} lineWidth={annotation.thickness || 2} transparent={isPreview} opacity={opacity} />

      {/* Distance label */}
      <Billboard position={[midX, 3, midZ]}>
        <Text
          font="/fonts/Inter-Bold.woff"
          fontSize={4}
          color={color}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.5}
          outlineColor="#000000"
          fillOpacity={opacity}
        >
          {label}
        </Text>
      </Billboard>
    </group>
  );
}
