/* eslint-disable @typescript-eslint/no-explicit-any */
import '@react-three/fiber';

// Extend JSX IntrinsicElements to include Three.js line primitive
declare global {
  namespace JSX {
    interface IntrinsicElements {
      line: any;
      lineBasicMaterial: any;
      bufferAttribute: any;
    }
  }
}

export {};
