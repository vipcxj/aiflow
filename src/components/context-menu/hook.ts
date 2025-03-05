import { useAppDispatch } from "@/lib/hooks";
import { useCallback, useEffect } from "react"
import { closeContextMenu, openContextMenu } from "@/lib/slices/context-menu-slice";
import { ContextMenuItem } from "./type";

export function useOpenContextMenu<T>(title: string, items: ContextMenuItem[]) {
    const dispatch = useAppDispatch();
    const onContextMenu = useCallback((e: React.MouseEvent<T>) => {
        e.preventDefault();
        const position = { x: e.pageX, y: e.pageY };
        dispatch(openContextMenu({ title, items, position }));
    }, [dispatch, title, items]);
    useEffect(() => {
        // 处理点击事件，只有在点击菜单外部时关闭
        const handleClickOutside = (event: MouseEvent) => {
            // 获取菜单元素
            const menuElement = document.getElementById('context-menu');
            
            // 只有当菜单存在且点击不在菜单内部时才关闭
            if (menuElement && !menuElement.contains(event.target as Node)) {
                dispatch(closeContextMenu());
            }
        };
        
        // 添加全局点击事件监听器
        document.addEventListener('mousedown', handleClickOutside);
        
        // 清理函数
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [dispatch]);
    return { onContextMenu };
};