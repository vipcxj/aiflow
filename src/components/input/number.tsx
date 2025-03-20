"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import classNames from 'classnames';

export interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  isInteger?: boolean;
  min?: number;
  max?: number;
  step?: number;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

const SizeClass = {
  'xs': 'input-xs',
  'sm': 'input-sm',
  'md': '',
  'lg': 'input-lg'
};

export const NumberInput: React.FC<NumberInputProps> = ({
  value,
  onChange,
  isInteger = false,
  min,
  max,
  step = isInteger ? 1 : 0.1,
  className,
  placeholder = '0',
  disabled = false,
  size = 'md',
}) => {
  // 内部状态用于编辑时的临时值
  const [internalValue, setInternalValue] = useState<string>(value?.toString() || '');
  // 是否正在编辑
  const [editing, setEditing] = useState<boolean>(false);

  // 期望要提交的值。当且仅当该值与当前内部值相同时，才会提交。用于延迟提交
  const [expectedValue, setExpectedValue] = useState<string>('');
  // 用于延迟提交的定时器
  const expectedTimerRef = useRef<NodeJS.Timeout | null>(null);
  const delaySubmit = useCallback((expectedValue: string) => {
    if (expectedTimerRef.current) clearTimeout(expectedTimerRef.current);
    expectedTimerRef.current = setTimeout(() => {
      setExpectedValue(expectedValue);
    }, 500);
  }, []);

  // 用于自动重复的定时器和计数器
  const incrementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const decrementTimerRef = useRef<NodeJS.Timeout | null>(null);
  const incrementCountRef = useRef<number>(0);
  const decrementCountRef = useRef<number>(0);

  // 当外部值变化且不在编辑状态时，更新内部值
  useEffect(() => {
    if (!editing) {
      setInternalValue(value?.toString() || '');
    }
  }, [value, editing]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (expectedTimerRef.current) clearTimeout(expectedTimerRef.current);
      if (incrementTimerRef.current) clearTimeout(incrementTimerRef.current);
      if (decrementTimerRef.current) clearTimeout(decrementTimerRef.current);
    };
  }, []);

  // 验证并提交数值
  const commitValue = useCallback(() => {
    let newValue = internalValue === '' ? 0 : isInteger
      ? parseInt(internalValue, 10)
      : parseFloat(internalValue);

    // 处理无效输入
    if (isNaN(newValue)) {
      newValue = 0;
    }

    // 范围限制
    if (min !== undefined && newValue < min) {
      newValue = min;
    }
    if (max !== undefined && newValue > max) {
      newValue = max;
    }

    // 设置内部值为格式化后的值
    setInternalValue(newValue.toString());
    // 结束编辑状态
    setEditing(false);

    // 只有当值实际变化时才触发onChange
    if (newValue !== value) {
      onChange(newValue);
    }
  }, [internalValue, isInteger, min, max, value, onChange]);

  // 当期望值与内部值相同时，提交值
  useEffect(() => {
    if (expectedValue !== '' && internalValue === expectedValue) {
      setExpectedValue('');
      commitValue();
    }
  }, [expectedValue, internalValue, commitValue]);

  // 处理输入变化
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // 验证输入是否符合规则
    if (inputValue === '' || inputValue === '-' || inputValue === '+' || inputValue === '.') {
      setInternalValue(inputValue);
      setEditing(true);
      return;
    }

    const regex = isInteger ? /^[+-]?\d*$/ : /^[+-]?\d*\.?\d*$/;
    if (regex.test(inputValue)) {
      setInternalValue(inputValue);
      setEditing(true);
    }
  }, [isInteger]);

  // 处理按键事件
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitValue();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      // 取消编辑，恢复为原始值
      setInternalValue(value?.toString() || '');
      setEditing(false);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const currentValue = internalValue === '' ? 0 : Number(internalValue);
      const newValue = isInteger ?
        Math.floor(currentValue + step) :
        parseFloat((currentValue + step).toFixed(10));
      setInternalValue(newValue.toString());
      setEditing(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const currentValue = internalValue === '' ? 0 : Number(internalValue);
      const newValue = isInteger ?
        Math.floor(currentValue - step) :
        parseFloat((currentValue - step).toFixed(10));
      setInternalValue(newValue.toString());
      setEditing(true);
    }
  }, [internalValue, isInteger, step, value, commitValue]);

  const calcCurrentValue = useCallback(() => {
    const currentValue = internalValue === '' ? 0 : Number(internalValue);
    return isInteger ? Math.floor(currentValue) : currentValue;
  }, [internalValue, isInteger]);

  // 增加值的函数
  const incrementValue = useCallback((value: number, step: number, max?: number) => {
    let newValue = value + step;
    // 范围检查
    if (max !== undefined && newValue > max) {
      return value; // 如果超出最大值，不做任何改变
    }
    if (!Number.isInteger(step)) {
      newValue = parseFloat(newValue.toFixed(10));
    }
    const expectedValue = newValue.toString();
    setInternalValue(expectedValue);
    setEditing(true);
    delaySubmit(expectedValue);
    return newValue;
  }, [delaySubmit]);

  // 减少值的函数
  const decrementValue = useCallback((value: number, step: number, min?: number) => {
    let newValue = value - step;
    // 范围检查
    if (min !== undefined && newValue < min) {
      return value; // 如果超出最小值，不做任何改变
    }
    if (!Number.isInteger(step)) {
      newValue = parseFloat(newValue.toFixed(10));
    }
    const expectedValue = newValue.toString();
    setInternalValue(expectedValue);
    setEditing(true);
    delaySubmit(expectedValue);
    return newValue;
  }, [delaySubmit]);

  // 计算当前递增/递减的延迟时间（随着按住时间越长，速度越快）
  const calculateDelay = useCallback((count: number): number => {
    if (count < 5) return 300;      // 初始慢速：300ms
    if (count < 15) return 150;     // 中等速度：150ms
    if (count < 30) return 80;      // 快速：80ms
    if (count < 50) return 50;      // 更快：50ms
    return 30;                      // 最快：30ms
  }, []);

  // 按下按钮时启动自动递增
  const startIncrement = useCallback(() => {
    incrementCountRef.current = 0;
    let value = calcCurrentValue();

    const repeatIncrement = () => {
      value = incrementValue(value, step, max);
      incrementCountRef.current += 1;

      // 计算下一次间隔
      const delay = calculateDelay(incrementCountRef.current);
      incrementTimerRef.current = setTimeout(repeatIncrement, delay);
    };

    // 立即执行一次
    value = incrementValue(value, step, max);
    incrementCountRef.current += 1;

    // 然后开始重复
    incrementTimerRef.current = setTimeout(repeatIncrement, 500); // 初始延迟较长
  }, [calcCurrentValue, incrementValue, calculateDelay, max, step]);

  // 按下按钮时启动自动递减
  const startDecrement = useCallback(() => {
    decrementCountRef.current = 0;
    let value = calcCurrentValue();

    const repeatDecrement = () => {
      value = decrementValue(value, step, min);
      decrementCountRef.current += 1;

      // 计算下一次间隔
      const delay = calculateDelay(decrementCountRef.current);
      decrementTimerRef.current = setTimeout(repeatDecrement, delay);
    };

    // 立即执行一次
    value = decrementValue(value, step, min);
    decrementCountRef.current += 1;

    // 然后开始重复
    decrementTimerRef.current = setTimeout(repeatDecrement, 500); // 初始延迟较长
  }, [calcCurrentValue, decrementValue, calculateDelay, min, step]);

  // 停止自动递增/递减
  const stopIncrement = useCallback(() => {
    if (incrementTimerRef.current) {
      clearTimeout(incrementTimerRef.current);
      incrementTimerRef.current = null;
    }
  }, []);

  const stopDecrement = useCallback(() => {
    if (decrementTimerRef.current) {
      clearTimeout(decrementTimerRef.current);
      decrementTimerRef.current = null;
    }
  }, []);

  // 获取输入框尺寸类名
  const sizeClass = SizeClass[size];

  return (
    <div className="join">
      <button
        type="button"
        className={classNames("btn join-item", {
          'btn-xs': size === 'xs',
          'btn-sm': size === 'sm',
          'btn-md': size === 'md',
          'btn-lg': size === 'lg',
          'btn-disabled': disabled
        })}
        onMouseDown={startDecrement}
        onMouseUp={stopDecrement}
        onMouseLeave={stopDecrement}
        onTouchStart={startDecrement}
        onTouchEnd={stopDecrement}
        disabled={disabled}
      >
        -
      </button>
      <input
        type="text"
        className={classNames("input join-item text-center", sizeClass, className)}
        value={internalValue}
        onChange={handleInputChange}
        onBlur={commitValue}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{ minWidth: '3rem' }}
      />
      <button
        type="button"
        className={classNames("btn join-item", {
          'btn-xs': size === 'xs',
          'btn-sm': size === 'sm',
          'btn-md': size === 'md',
          'btn-lg': size === 'lg',
          'btn-disabled': disabled
        })}
        onMouseDown={startIncrement}
        onMouseUp={stopIncrement}
        onMouseLeave={stopIncrement}
        onTouchStart={startIncrement}
        onTouchEnd={stopIncrement}
        disabled={disabled}
      >
        +
      </button>
    </div>
  );
};

export default NumberInput;