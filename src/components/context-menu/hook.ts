import { useAppDispatch } from "@/lib/hooks";
import { useCallback, useEffect } from "react"
import { closeContextMenu, openContextMenu } from "@/lib/slices/context-menu-slice";
import { ContextMenuItem } from "./type";

export function adjustContextMenu(parent_id: string, id: string, x: number, y: number, updatePosition: (position: { x: number; y: number; }) => void) {
  const parent = document.getElementById(parent_id);
  const menuElement = document.getElementById(id);

  if (!menuElement) return;

  // 获取视口尺寸
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const menuWidth = menuElement.offsetWidth;
  const menuHeight = menuElement.offsetHeight;

  let parentRect: DOMRect | null = null;

  // 如果有父元素，获取其位置和尺寸
  if (parent) {
    parentRect = parent.getBoundingClientRect();
  }

  // 根据父元素位置调整子菜单位置，避免重叠
  if (parentRect) {
    // 默认尝试将子菜单放在父菜单的右侧
    x = parentRect.right + 5; // 右侧偏移5px

    // 如果父菜单在右侧，导致子菜单会超出右边界，则将子菜单放在父菜单左侧
    if (x + menuWidth > viewportWidth) {
      x = parentRect.left - menuWidth - 5; // 左侧偏移5px
    }

    // 垂直对齐逻辑：首先尝试直接对齐点击位置
    // 尝试获取在父菜单中点击的菜单项的垂直位置
    const clickRelativeToParent = Math.max(0, y - parentRect.top - 64);

    // 首选：将子菜单与点击位置对齐
    y = parentRect.top + clickRelativeToParent;

    // 检查是否会超出下边界
    if (y + menuHeight > viewportHeight) {
      // 如果超出下边界，有两种策略：

      // 策略1：尝试将整个菜单上移，保持在视口内
      const adjustedY = viewportHeight - menuHeight - 5;

      // 策略2：如果父菜单高度足够，可以尝试与父菜单底部对齐
      // 取两种策略中较大的值（更靠近原始点击位置）
      y = Math.max(adjustedY, parentRect.bottom - menuHeight);
    }

    // 检查是否会超出上边界
    if (y < 5) {
      // 如果会超出上边界，设置到最小边距
      y = 5;
    }
  } else {
    // 无父元素时的常规边界检查
    // 检查右边界
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 5;
    }

    // 检查下边界
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 5;
    }
  }

  // 确保不会出现负值
  x = Math.max(5, x);
  y = Math.max(5, y);

  // 更新菜单位置
  const position = { x, y };
  updatePosition(position);
}

export function useOpenContextMenu<T>(title: string, items: ContextMenuItem[]) {
  const dispatch = useAppDispatch();
  const onContextMenu = useCallback((e: React.MouseEvent<T>) => {
    e.preventDefault();

    // 暂存初始位置
    const x = e.pageX;
    const y = e.pageY;

    const updatePosition = (position: { x: number, y: number }) => {
      dispatch(openContextMenu({ title, items, position }));
    };

    // 异步调整位置 - 等待菜单元素渲染后再计算
    setTimeout(() => {
      adjustContextMenu('', 'context-menu', x, y, updatePosition);
    }, 0);

    const position = { x: e.pageX, y: e.pageY };
    dispatch(openContextMenu({ title, items, position }));
  }, [dispatch, title, items]);
  useEffect(() => {
    // 处理点击事件，只有在点击菜单外部时关闭
    const handleClickOutside = (event: MouseEvent) => {
      // 获取菜单根元素
      const menuRootElement = document.getElementById('context-menu-root');

      if (!menuRootElement) return;

      // 检查点击是否发生在任何菜单内部
      const clickedOnMenu = Array.from(menuRootElement.querySelectorAll('[id^="context-menu"]')).some(
        menuElement => menuElement.contains(event.target as Node)
      );

      // 只有当点击不在任何菜单内部时才关闭
      if (!clickedOnMenu && !(event.target as Node).contains(menuRootElement)) {
        dispatch(closeContextMenu());
      }
    };

    // 添加全局点击事件监听器
    document.addEventListener('mousedown', handleClickOutside, true);

    // 清理函数
    return () => {
      document.removeEventListener('mousedown', handleClickOutside, true);
    };
  }, [dispatch]);
  return { onContextMenu };
};