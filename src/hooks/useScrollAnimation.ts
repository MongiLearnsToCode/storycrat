import { useState, useEffect, RefObject } from 'react';

export function useScrollAnimation(ref: RefObject<HTMLElement | null>) {
  const [style, setStyle] = useState({
    opacity: 0,
    transform: 'translateY(20px)',
    transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStyle({
            opacity: 1,
            transform: 'translateY(0px)',
            transition: 'opacity 0.5s ease-out, transform 0.5s ease-out',
          });
        }
      },
      {
        threshold: 0.1,
      }
    );

    const currentRef = ref.current;

    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [ref]);

  return style;
}