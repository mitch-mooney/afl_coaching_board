import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import { useAnnotationStore } from '../store/annotationStore';
import { snapToField } from '../utils/fieldGeometry';

export function useAnnotationInteraction() {
  const { camera, raycaster, gl } = useThree();
  const { selectedTool, selectedColor, thickness, addAnnotation } = useAnnotationStore();
  const isDrawingRef = useRef(false);
  const startPointRef = useRef<Vector3 | null>(null);
  const currentPointsRef = useRef<number[][]>([]);
  
  useEffect(() => {
    if (!selectedTool) return;
    
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return; // Only left mouse button
      
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera({ x, y } as any, camera);
      
      // Intersect with ground plane
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );
      
      if (intersection) {
        const [x, z] = snapToField(intersection.x, intersection.z);
        const point = [x, 0, z];
        startPointRef.current = intersection.clone();
        currentPointsRef.current = [point];
        isDrawingRef.current = true;
      }
    };
    
    const handlePointerMove = (event: PointerEvent) => {
      if (!isDrawingRef.current || !startPointRef.current) return;
      
      const rect = gl.domElement.getBoundingClientRect();
      const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      raycaster.setFromCamera({ x, y } as any, camera);
      
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const intersection = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        new Vector3()
      );
      
      if (intersection) {
        const [x, z] = snapToField(intersection.x, intersection.z);
        const point = [x, 0, z];
        
        if (selectedTool === 'line' || selectedTool === 'arrow') {
          currentPointsRef.current = [currentPointsRef.current[0], point];
        } else {
          currentPointsRef.current = [currentPointsRef.current[0], point];
        }
      }
    };
    
    const handlePointerUp = () => {
      if (isDrawingRef.current && currentPointsRef.current.length >= 2) {
        addAnnotation({
          type: selectedTool!,
          points: currentPointsRef.current,
          color: selectedColor,
          thickness,
        });
      }
      
      isDrawingRef.current = false;
      startPointRef.current = null;
      currentPointsRef.current = [];
    };
    
    gl.domElement.addEventListener('pointerdown', handlePointerDown);
    gl.domElement.addEventListener('pointermove', handlePointerMove);
    gl.domElement.addEventListener('pointerup', handlePointerUp);
    
    return () => {
      gl.domElement.removeEventListener('pointerdown', handlePointerDown);
      gl.domElement.removeEventListener('pointermove', handlePointerMove);
      gl.domElement.removeEventListener('pointerup', handlePointerUp);
    };
  }, [selectedTool, selectedColor, thickness, camera, raycaster, gl, addAnnotation]);
  
  return null;
}
