import React, { createContext, useContext, useState, useEffect } from 'react';

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalCost: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

function readStoredCart(barId: string): CartItem[] {
  const key = `cart:${barId}`;
  const savedCart = localStorage.getItem(key);
  if (!savedCart) return [];
  try {
    return JSON.parse(savedCart) as CartItem[];
  } catch {
    return [];
  }
}

export function CartProvider({
  children,
  barId,
}: {
  children: React.ReactNode;
  barId: string;
}) {
  const [items, setItems] = useState<CartItem[]>(() => readStoredCart(barId));

  useEffect(() => {
    setItems(readStoredCart(barId));
  }, [barId]);

  useEffect(() => {
    localStorage.setItem(`cart:${barId}`, JSON.stringify(items));
  }, [items, barId]);

  const addToCart = (item: CartItem) => {
    setItems(currentItems => {
      const existingItem = currentItems.find(i => i.id === item.id);
      if (existingItem) {
        return currentItems.map(i =>
          i.id === item.id
            ? { ...i, quantity: i.quantity + item.quantity }
            : i
        );
      }
      return [...currentItems, item];
    });
  };

  const removeFromCart = (id: string) => {
    setItems(currentItems => currentItems.filter(item => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) return;
    setItems(currentItems =>
      currentItems.map(item =>
        item.id === id ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCost = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalCost,
        totalItems,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}

export type { CartItem };
