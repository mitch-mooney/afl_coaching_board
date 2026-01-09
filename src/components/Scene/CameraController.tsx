import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useCameraStore } from '../../store/cameraStore';
import * as THREE from 'three';

export function CameraController() {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);
  const { position, target, zoom } = useCameraStore();
  
  useEffect(() => {
    // Update camera position when store changes
    camera.position.set(...position);
    camera.lookAt(...target);
    camera.zoom = zoom;
    camera.updateProjectionMatrix();
    
    if (controlsRef.current) {
      controlsRef.current.target.set(...target);
      controlsRef.current.update();
    }
  }, [camera, position, target, zoom]);
  
  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={10}
      maxDistance={500}
      minPolarAngle={0}
      maxPolarAngle={Math.PI / 2}
      enablePan
      panSpeed={0.5}
    />
  );
}
