'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { RetailCartItem } from '@/lib/retail/types';

const STORAGE_KEY = 'keryx-retail-cart-v1';

interface RetailCartContextValue {
  items: RetailCartItem[];
  itemCount: number;
  subtotalKrw: number;
  hydrated: boolean;
  addItem: (item: RetailCartItem) => { ok: boolean; message?: string };
  updateQuantity: (productId: string, variantLabel: string, quantity: number) => void;
  removeItem: (productId: string, variantLabel: string) => void;
  clearCart: () => void;
}

const RetailCartContext = createContext<RetailCartContextValue | null>(null);

function isStoredCartItem(value: unknown): value is RetailCartItem {
  if (!value || typeof value !== 'object') return false;
  const item = value as Record<string, unknown>;
  return typeof item.productId === 'string'
    && typeof item.quantity === 'number'
    && typeof item.variantLabel === 'string'
    && typeof item.name === 'string'
    && typeof item.imageUrl === 'string'
    && typeof item.unitPriceKrw === 'number'
    && typeof item.availableStockQty === 'number';
}

export function RetailCartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<RetailCartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isStoredCartItem));
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addItem = useCallback((item: RetailCartItem) => {
    if (item.availableStockQty < 1) return { ok: false, message: '현재 판매 가능한 재고가 없습니다.' };

    let result: { ok: boolean; message?: string } = { ok: true };
    setItems((current) => {
      const index = current.findIndex(
        (saved) => saved.productId === item.productId && saved.variantLabel === item.variantLabel,
      );

      if (index === -1) return [...current, { ...item, quantity: 1 }];

      const existing = current[index];
      const nextQuantity = existing.quantity + 1;
      if (nextQuantity > item.availableStockQty) {
        result = { ok: false, message: '판매 가능한 재고 수량을 초과했습니다.' };
        return current;
      }

      return current.map((saved, savedIndex) => (
        savedIndex === index
          ? { ...saved, quantity: nextQuantity, availableStockQty: item.availableStockQty, unitPriceKrw: item.unitPriceKrw }
          : saved
      ));
    });
    return result;
  }, []);

  const updateQuantity = useCallback((productId: string, variantLabel: string, quantity: number) => {
    setItems((current) => current.flatMap((item) => {
      if (item.productId !== productId || item.variantLabel !== variantLabel) return [item];
      if (quantity < 1) return [];
      return [{ ...item, quantity: Math.min(quantity, item.availableStockQty) }];
    }));
  }, []);

  const removeItem = useCallback((productId: string, variantLabel: string) => {
    setItems((current) => current.filter(
      (item) => item.productId !== productId || item.variantLabel !== variantLabel,
    ));
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<RetailCartContextValue>(() => ({
    items,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
    subtotalKrw: items.reduce((sum, item) => sum + item.quantity * item.unitPriceKrw, 0),
    hydrated,
    addItem,
    updateQuantity,
    removeItem,
    clearCart,
  }), [items, hydrated, addItem, updateQuantity, removeItem, clearCart]);

  return <RetailCartContext.Provider value={value}>{children}</RetailCartContext.Provider>;
}

export function useRetailCart() {
  const context = useContext(RetailCartContext);
  if (!context) throw new Error('useRetailCart must be used within RetailCartProvider');
  return context;
}
