import { useEffect, useState } from 'react';

const QUERY = '(pointer: coarse)';
const supported = () => typeof window !== 'undefined' && typeof window.matchMedia === 'function';

/** True when the primary pointer is coarse (touch). Subscribes to changes. */
export function usePointerCoarse(): boolean {
  const [coarse, setCoarse] = useState(() => (supported() ? window.matchMedia(QUERY).matches : false));
  useEffect(() => {
    if (!supported()) return;
    const mq = window.matchMedia(QUERY);
    const handler = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener('change', handler);
    setCoarse(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return coarse;
}
