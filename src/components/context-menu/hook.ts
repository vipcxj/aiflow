import { useAppDispatch } from "@/lib/hooks";
import { DependencyList, useCallback, useEffect } from "react"
import { closeContextMenu, openContextMenu } from "@/lib/slices/context-menu-slice";
import { ContextMenuItem } from "./type";

export function getAllContextMenus(): HTMLElement[] {
  // 获取菜单根元素
  const menuRootElement = document.getElementById('context-menu-root');

  if (!menuRootElement) return [];
  return Array.from(menuRootElement.querySelectorAll('[id^="context-menu"]'));
}

export function adjustContextMenu(parentId: string, id: string, x: number, y: number, updatePosition: (position: { x: number; y: number; }, side?: 'left' | 'right', ready?: boolean) => void) {
  const menuElement = document.getElementById(id);
  if (!menuElement) return;

  // 获取父菜单元素
  const parentElement = document.getElementById(parentId);

  // 确定初始方向
  let side: 'left' | 'right' = 'right';
  if (parentElement && Array.from(parentElement.classList).some(className => className === 'left-side')) {
    side = 'left';
  }

  // 获取视口尺寸
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const menuWidth = menuElement.offsetWidth;
  const menuHeight = menuElement.offsetHeight;

  let newPosition: { x: number, y: number };

  // 没有父菜单的情况 - 直接调整位置防止超出视口
  if (!parentElement || !parentId) {
    // 检查右边界
    if (x + menuWidth > viewportWidth) {
      x = viewportWidth - menuWidth - 5;
    }

    // 检查下边界
    if (y + menuHeight > viewportHeight) {
      y = viewportHeight - menuHeight - 5;
    }

    // 确保不会出现负值
    x = Math.max(5, x);
    y = Math.max(5, y);

    newPosition = { x, y };

    updatePosition(newPosition, side, false);
  } else {
    // 有父菜单的情况
    const parentRect = parentElement.getBoundingClientRect();

    // 根据父菜单的 side 决定子菜单的初始位置
    let newX: number;
    if (side === 'right') {
      // 默认尝试将子菜单放在父菜单的右侧
      newX = parentRect.right + 5;

      // 如果放在右侧会超出视口，则尝试放在左侧
      if (newX + menuWidth > viewportWidth) {
        newX = parentRect.left - menuWidth - 5;
        side = 'left'; // 更新 side
      }
    } else {
      // 默认尝试将子菜单放在父菜单的左侧
      newX = parentRect.left - menuWidth - 5;

      // 如果放在左侧会超出视口，则尝试放在右侧
      if (newX < 5) {
        newX = parentRect.right + 5;
        side = 'right'; // 更新 side
      }
    }

    // 垂直对齐 - 尝试与点击位置对齐, 64是估算的菜单标题高度
    // 假设y是相对于点击位置的
    const clickRelativeToParent = Math.max(0, y - parentRect.top - 64);
    let newY = parentRect.top + clickRelativeToParent;

    // 检查是否会超出下边界
    if (newY + menuHeight > viewportHeight) {
      // 先尝试上移，保持在视口内
      newY = viewportHeight - menuHeight - 5;
      // 如果向上移动后会导致上边界出界，再次调整
      if (newY < 5) newY = 5;
    }

    // 最终安全检查 - 确保不超出视口（当所有尝试都失败时）
    if (newX + menuWidth > viewportWidth) {
      newX = viewportWidth - menuWidth - 5;
      side = 'left'; // 如果右侧放不下，标记为左侧
    }
    if (newX < 5) {
      newX = 5;
      side = 'right'; // 如果左侧放不下，标记为右侧
    }

    // 更新菜单位置
    newPosition = { x: newX, y: newY };
    updatePosition(newPosition, side, false);
  }
  const waitSizeStable = (oldWidth: number, oldHeight: number, adjust: boolean) => {
    const menuElement = document.getElementById(id);
    if (!menuElement) return;
    const newMenuWidth = menuElement.offsetWidth;
    const newMenuHeight = menuElement.offsetHeight;
    // 如果菜单高度发生变化，则重新调整位置
    if (newMenuWidth !== oldWidth || newMenuHeight !== oldHeight) {
      setTimeout(() => {
        waitSizeStable(newMenuWidth, newMenuHeight, true);
      }, 1);
    } else {
      if (adjust) {
        adjustContextMenu(parentId, id, x, y, updatePosition);
      } else {
        updatePosition(newPosition, side, true);
      }
    }
  };
  setTimeout(() => {
    waitSizeStable(menuWidth, menuHeight, false);
  }, 1);
}

export type ContextMenuItemsEnchancer<C> = {
  context?: C;
  enchance: (items: ContextMenuItem[], context?: C) => ContextMenuItem[];
};

export function useContextMenuItemsEnchancer<C>(enchanceFun: ContextMenuItemsEnchancer<C>['enchance'], deps: DependencyList): ContextMenuItemsEnchancer<C> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const enchance = useCallback(enchanceFun, deps);
  return { enchance };
}

function cleanContextMenuItem(item: ContextMenuItem): ContextMenuItem | undefined {
  if (item.type === 'separator') return item;
  if (!item.subMenu) {
    return !!item.onClick ? item : undefined;
  } else {
    const subMenuItems = cleanContextItems(item.subMenu.items);
    if (subMenuItems.length === 0) return undefined;
    return {
      ...item,
      subMenu: {
        ...item.subMenu,
        items: subMenuItems,
      }
    };
  }
}

function cleanContextItems(items: ContextMenuItem[]): ContextMenuItem[] {
  items = items.map(item => cleanContextMenuItem(item)).filter(item => !!item);
  if (items.length === 0) return [];
  if (items.some(item => item.type !== 'separator')) {
    return items;
  }
  return [];
}

export function useOpenContextMenu<T, C = unknown>(title: string, items: ContextMenuItem[], enchancer?: ContextMenuItemsEnchancer<C>) {
  const dispatch = useAppDispatch();
  const onContextMenu = useCallback((e: React.MouseEvent<T>) => {
    // 阻止事件冒泡和默认行为
    e.stopPropagation();
    e.preventDefault();

    // 暂存初始位置
    const x = e.pageX;
    const y = e.pageY;

    const enchancedItems = cleanContextItems(enchancer ? enchancer.enchance(items, enchancer.context) : items);
    if (enchancedItems.length === 0) return;

    const updatePosition = (position: { x: number, y: number }, side?: 'left' | 'right', ready?: boolean) => {
      dispatch(openContextMenu({ title, items: enchancedItems, position, ready: ready || false }));
    };

    const position = { x: e.pageX, y: e.pageY };
    dispatch(openContextMenu({ title, items: enchancedItems, position, ready: false }));

    // 异步调整位置 - 等待菜单元素渲染后再计算
    setTimeout(() => {
      adjustContextMenu('', 'context-menu', x, y, updatePosition);
    }, 0);
  }, [dispatch, title, items, enchancer]);
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