import { useAnnotationStore } from '../../store/annotationStore';
import { Annotation } from '../../store/annotationStore';
import { TextAnnotation } from '../Annotations/TextAnnotation';
import { ArrowAnnotation } from '../Annotations/ArrowAnnotation';
import { ZoneAnnotation } from '../Annotations/ZoneAnnotation';
import { DrawingAnnotation } from '../Annotations/DrawingAnnotation';

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
  // Text only requires 1 point, others require 2+
  if (annotation.type === 'text') {
    if (annotation.points.length < 1) return null;
    return <TextAnnotation annotation={annotation} />;
  }

  if (annotation.points.length < 2) return null;

  switch (annotation.type) {
    case 'line':
      return <DrawingAnnotation annotation={annotation} />;
    case 'arrow':
      return <ArrowAnnotation annotation={annotation} />;
    case 'circle':
    case 'rectangle':
      return <ZoneAnnotation annotation={annotation} />;
    default:
      return null;
  }
}
