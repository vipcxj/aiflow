'use client';

import { useRef, useState, useEffect } from 'react';

type TruncateTextProps = {
  text: string;
} & React.HTMLAttributes<HTMLSpanElement>;

export const TruncateText: React.FC<TruncateTextProps> = ({ text, ...props }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  useEffect(() => {
    const checkOverflow = () => {
      if (textRef.current) {
        const { offsetWidth, scrollWidth } = textRef.current;
        setIsOverflowing(scrollWidth > offsetWidth);
      }
    };

    // 检测初始状态
    checkOverflow();

    // 当窗口大小改变时重新检测
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [text]);

  return (
    <span 
      ref={textRef}
      {...props}
      title={isOverflowing ? text : undefined}
    >
      {text}
    </span>
  );
};