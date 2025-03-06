import { HTMLProps, useCallback, useEffect, useRef, useState } from "react";
import cs from 'classnames';
import { ChevronDown } from "../icons/chevron-down";
import { ChevronUp } from "../icons/chevron-up";
import { ChevronLeft } from "../icons/chevron-left";
import { ChevronRight } from "../icons/chevron-right";

export type ArrowScrollbarProps = {
  direction: 'vertical' | 'horizontal' | 'all';
} & HTMLProps<HTMLDivElement>;

export const ArrowScrollbar = ({ direction, className, style, children, ...props }: ArrowScrollbarProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(false);
  const [showTopArrow, setShowTopArrow] = useState(false);
  const [showBottomArrow, setShowBottomArrow] = useState(false);

  // 计算适当的内边距
  const paddingLeft = showLeftArrow ? '24px' : '0px';
  const paddingRight = showRightArrow ? '24px' : '0px';
  const paddingTop = showTopArrow ? '24px' : '0px';
  const paddingBottom = showBottomArrow ? '24px' : '0px';

  // 更新箭头显示状态的函数
  const updateArrowsVisibility = useCallback(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;
    const isHorizontal = direction === 'horizontal' || direction === 'all';
    const isVertical = direction === 'vertical' || direction === 'all';

    // 水平箭头显示逻辑
    if (isHorizontal) {
      // 有水平滚动条且不在最左侧
      setShowLeftArrow(container.scrollLeft > 0);
      // 有水平滚动条且不在最右侧
      setShowRightArrow(
        container.scrollWidth > container.clientWidth &&
        container.scrollLeft < container.scrollWidth - container.clientWidth - 1
      );
    }

    // 垂直箭头显示逻辑
    if (isVertical) {
      // 有垂直滚动条且不在顶部
      setShowTopArrow(container.scrollTop > 0);
      // 有垂直滚动条且不在底部
      setShowBottomArrow(
        container.scrollHeight > container.clientHeight &&
        container.scrollTop < container.scrollHeight - container.clientHeight - 1
      );
    }
  }, [direction]);

  // 滚动处理函数
  const handleScroll = () => {
    updateArrowsVisibility();
  };

  // 点击箭头滚动处理
  const scrollLeft = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: -100, behavior: 'smooth' });
  };

  const scrollRight = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ left: 100, behavior: 'smooth' });
  };

  const scrollUp = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ top: -100, behavior: 'smooth' });
  };

  const scrollDown = () => {
    if (!containerRef.current) return;
    containerRef.current.scrollBy({ top: 100, behavior: 'smooth' });
  };

  // 初始化和窗口调整时检查
  useEffect(() => {
    updateArrowsVisibility();

    const handleResize = () => {
      updateArrowsVisibility();
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [updateArrowsVisibility]);

  // 当子元素内容变化时检查
  useEffect(() => {
    // 使用MutationObserver监听子元素变化
    if (containerRef.current) {
      const observer = new MutationObserver(updateArrowsVisibility);
      observer.observe(containerRef.current, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: true
      });

      return () => {
        observer.disconnect();
      };
    }
  }, [updateArrowsVisibility]);

  return (
    <div className="relative">
      {/* 滚动容器 */}
      <div
        ref={containerRef}
        {...props}
        onScroll={handleScroll}
        style={{
          ...style,
          paddingLeft,
          paddingRight,
          paddingTop,
          paddingBottom,
          transition: 'padding 0.2s ease'
        }}
        className={cs(
          className,
          'scrollbar-hide',
          {
            'overflow-x-auto': direction === 'horizontal' || direction === 'all',
            'overflow-y-auto': direction === 'vertical' || direction === 'all',
            'overflow-x-hidden': direction !== 'horizontal' && direction !== 'all',
            'overflow-y-hidden': direction !== 'vertical' && direction !== 'all',
          },
        )}
      >
        {children}
      </div>
      {/* 左箭头 */}
      {showLeftArrow && (
        <div className="absolute left-0 top-0 h-full bg-base-100/70 shadow-right-md rounded-r-md hover:bg-base-100/80">
          <button
            className="relative top-1/2 -translate-y-1/2 pt-1 pb-1 pl-2 pr-2 cursor-pointer opacity-60 hover:bg-base-300"
            onClick={scrollLeft}
            aria-label="向左滚动"
          >
            <ChevronLeft className="h-5 w-5 stroke-2 hover:stroke-3" />
          </button>
        </div>
      )}

      {/* 右箭头 */}
      {showRightArrow && (
        <div className="absolute right-0 top-0 h-full bg-base-100/70 shadow-left-md rounded-l-md hover:bg-base-100/80">
          <button
            className="relative top-1/2 -translate-y-1/2 pt-1 pb-1 pl-2 pr-2 cursor-pointer opacity-60 hover:bg-base-300"
            onClick={scrollRight}
            aria-label="向右滚动"
          >
            <ChevronRight className="h-5 w-5 stroke-2 hover:stroke-3" />
          </button>
        </div>
      )}

      {/* 上箭头 */}
      {showTopArrow && (
        <div className="absolute top-0 left-0 w-full bg-base-100/70 shadow-down-md rounded-t-md hover:bg-base-100/80">
          <button
            className="relative left-1/2 -translate-x-1/2 pt-1 pb-1 pl-2 pr-2 cursor-pointer opacity-60 hover:bg-base-300"
            onClick={scrollUp}
            aria-label="向上滚动"
          >
            <ChevronUp className="h-5 w-5 stroke-2 hover:stroke-3" />
          </button>
        </div>
      )}

      {/* 下箭头 */}
      {showBottomArrow && (
        <div className="absolute bottom-0 left-0 w-full bg-base-100/70 shadow-up-md rounded-b-md hover:bg-base-100/80">
          <button
            className="relative left-1/2 -translate-x-1/2 pt-1 pb-1 pl-2 pr-2 cursor-pointer opacity-60 hover:bg-base-300"
            onClick={scrollDown}
            aria-label="向下滚动"
          >
            <ChevronDown className="h-5 w-5 stroke-2 hover:stroke-3" />
          </button>
        </div>
      )}
    </div>
  );
};