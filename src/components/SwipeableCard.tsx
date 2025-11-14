import { useSwipeable } from "react-swipeable";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SwipeableCardProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
}

export function SwipeableCard({ 
  children, 
  onSwipeLeft, 
  onSwipeRight,
  className 
}: SwipeableCardProps) {
  const handlers = useSwipeable({
    onSwipedLeft: () => onSwipeLeft?.(),
    onSwipedRight: () => onSwipeRight?.(),
    trackMouse: false,
    trackTouch: true,
    delta: 50,
  });

  return (
    <div 
      {...handlers} 
      className={cn(
        "touch-pan-y select-none transition-transform active:scale-[0.98]",
        className
      )}
    >
      {children}
    </div>
  );
}
