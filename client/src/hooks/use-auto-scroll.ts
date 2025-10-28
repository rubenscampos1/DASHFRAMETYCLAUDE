import { useEffect, useRef } from "react";

interface UseAutoScrollOptions {
  enabled: boolean;
  scrollSpeed?: number;
  edgeSize?: number;
}

export function useAutoScroll({
  enabled,
  scrollSpeed = 10,
  edgeSize = 100,
}: UseAutoScrollOptions) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const mousePositionRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!enabled || !scrollContainerRef.current) {
      return;
    }

    const container = scrollContainerRef.current;
    let isScrolling = false;

    const handleMouseMove = (e: MouseEvent) => {
      mousePositionRef.current = { x: e.clientX, y: e.clientY };

      if (!isScrolling) {
        isScrolling = true;
        startAutoScroll();
      }
    };

    const startAutoScroll = () => {
      const scroll = () => {
        if (!container || !enabled) {
          isScrolling = false;
          return;
        }

        const rect = container.getBoundingClientRect();
        const { x } = mousePositionRef.current;

        // Calcular distância das bordas
        const distanceFromLeft = x - rect.left;
        const distanceFromRight = rect.right - x;

        let scrollAmount = 0;

        // Scroll para a esquerda
        if (distanceFromLeft < edgeSize && distanceFromLeft > 0) {
          const intensity = 1 - distanceFromLeft / edgeSize;
          scrollAmount = -scrollSpeed * intensity;
        }
        // Scroll para a direita
        else if (distanceFromRight < edgeSize && distanceFromRight > 0) {
          const intensity = 1 - distanceFromRight / edgeSize;
          scrollAmount = scrollSpeed * intensity;
        }

        if (scrollAmount !== 0) {
          container.scrollLeft += scrollAmount;
          animationFrameRef.current = requestAnimationFrame(scroll);
        } else {
          isScrolling = false;
        }
      };

      animationFrameRef.current = requestAnimationFrame(scroll);
    };

    const handleMouseUp = () => {
      isScrolling = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("dragend", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("dragend", handleMouseUp);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, scrollSpeed, edgeSize]);

  return scrollContainerRef;
}
