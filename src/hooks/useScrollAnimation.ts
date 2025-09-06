
import { useState, useEffect, RefObject } from 'react';

export function useScrollAnimation(ref: RefObject<HTMLElement | null>) {
  const [style, setStyle] = useState({});

  useEffect(() => {
    function handleScroll() {
      if (ref.current) {
        const scrollY = window.scrollY;
        const slowDown = 2;
        const scaleAmount = Math.max(1 - scrollY / 1000, 0.9);

        setStyle({
          transform: `translateY(${-(scrollY / slowDown)}px) scale(${scaleAmount})`,
          transition: 'transform 0.1s ease-out',
        });
      }
    }

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [ref]);

  return style;
}
