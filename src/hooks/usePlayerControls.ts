import { useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import { Vector3, Plane } from 'three';
import { usePlayerStore } from '../store/playerStore';
import { snapToField } from '../utils/fieldGeometry';

export function usePlayerControls() {
  const { camera, raycaster } = useThree();
  const { selectedPlayerId, updatePlayerPosition, selectPlayer } = usePlayerStore();
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<Vector3 | null>(null);
  
  const handlePointerDown = (event: any) => {
    if (event.object && event.object.userData?.playerId) {
      const playerId = event.object.userData.playerId;
      selectPlayer(playerId);
      setIsDragging(true);
      
      // Calculate initial drag position
      const intersection = event.intersections[0];
      if (intersection) {
        dragStartRef.current = intersection.point.clone();
      }
    }
  };
  
  const handlePointerMove = (event: any) => {
    if (isDragging && selectedPlayerId && dragStartRef.current) {
      raycaster.setFromCamera(event.pointer, camera);
      
      // Intersect with ground plane (y = 0)
      const planeNormal = new Vector3(0, 1, 0);
      const planePoint = new Vector3(0, 0, 0);
      const distance = raycaster.ray.intersectPlane(
        new Plane(planeNormal, -planeNormal.dot(planePoint)),
        dragStartRef.current
      );
      
      if (distance) {
        const [x, z] = snapToField(distance.x, distance.z);
        updatePlayerPosition(selectedPlayerId, [x, 0, z]);
      }
    }
  };
  
  const handlePointerUp = () => {
    setIsDragging(false);
    dragStartRef.current = null;
  };
  
  return {
    isDragging,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
  };
}
