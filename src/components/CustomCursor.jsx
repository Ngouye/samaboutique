import React, { useEffect, useState } from 'react';
import { motion, useSpring } from 'framer-motion';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isPointer, setIsPointer] = useState(false);
  const [isHidden, setIsHidden] = useState(false);

  // Smooth springs for the outer circle
  const springConfig = { damping: 25, stiffness: 400, mass: 0.5 };
  const cursorX = useSpring(0, springConfig);
  const cursorY = useSpring(0, springConfig);

  useEffect(() => {
    // Disable on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) {
      setIsHidden(true);
      return;
    }

    const onMouseMove = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
    };

    const onMouseOver = (e) => {
      const target = e.target;
      if (
        window.getComputedStyle(target).cursor === 'pointer' ||
        target.tagName.toLowerCase() === 'a' ||
        target.tagName.toLowerCase() === 'button' ||
        target.closest('button') || target.closest('a')
      ) {
        setIsPointer(true);
      } else {
        setIsPointer(false);
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseover', onMouseOver);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseover', onMouseOver);
    };
  }, [cursorX, cursorY]);

  if (isHidden) return null;

  return (
    <>
      {/* Inner Dot - Instant Follow */}
      <motion.div 
        className="fixed top-0 left-0 w-3 h-3 bg-orange-500 rounded-full pointer-events-none z-[9999] shadow-[0_0_10px_rgba(249,115,22,0.8)]"
        style={{
          x: position.x - 6,
          y: position.y - 6,
        }}
        animate={{
          scale: isPointer ? 0 : 1,
          opacity: isPointer ? 0 : 1,
        }}
        transition={{ duration: 0.15 }}
      />
      
      {/* Outer Ring - Spring Follow */}
      <motion.div 
        className="fixed top-0 left-0 pointer-events-none z-[9998] flex items-center justify-center border-2 border-orange-500/50 rounded-full shadow-[0_0_20px_rgba(249,115,22,0.4)]"
        style={{ 
          x: cursorX,
          y: cursorY,
          translateX: "-50%",
          translateY: "-50%"
        }}
        animate={{
          width: isPointer ? 64 : 40,
          height: isPointer ? 64 : 40,
          backgroundColor: isPointer ? "rgba(249, 115, 22, 0.1)" : "rgba(249, 115, 22, 0)",
          borderColor: isPointer ? "rgba(249, 115, 22, 0)" : "rgba(249, 115, 22, 0.6)",
          backdropFilter: isPointer ? "blur(4px)" : "blur(0px)",
        }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      />
    </>
  );
}
