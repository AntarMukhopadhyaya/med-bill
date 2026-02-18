import { useMemo, useState } from "react";
import type { InventoryItem } from "@/types/inventory";
import { OrderItem } from "@/components/OrderComponents";

interface UseOrderItemsOptions {
  deliveryCharge: number;
}

export const useOrderItems = ({ deliveryCharge }: UseOrderItemsOptions) => {
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);

  const calculateItemTotals = (item: OrderItem): OrderItem => {
    const subtotal = item.unit_price * item.quantity;
    const taxAmount = (subtotal * item.gst_percent) / 100;
    const totalPrice = subtotal + taxAmount;
    return {
      ...item,
      tax_amount: Number(taxAmount.toFixed(2)),
      total_price: Number(totalPrice.toFixed(2)),
    };
  };

  const addOrderItem = (inventoryItem: InventoryItem) => {
    const existingItem = orderItems.find(
      (item) => item.item_id === inventoryItem.id
    );

    if (existingItem) {
      updateOrderItemQuantity(existingItem.id, existingItem.quantity + 1);
      return;
    }

    const newItem: OrderItem = {
      id: `temp-${Date.now()}`,
      item_id: inventoryItem.id,
      item_name: inventoryItem.name,
      unit_price: Number(inventoryItem.price),
      quantity: 1,
      gst_percent: Number(inventoryItem.gst || 12),
      tax_amount: 0,
      total_price: 0,
    };

    const updatedItem = calculateItemTotals(newItem);
    setOrderItems((prev) => [...prev, updatedItem]);
  };

  const updateOrderItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeOrderItem(itemId);
      return;
    }

    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, quantity: newQuantity };
          return calculateItemTotals(updatedItem);
        }
        return item;
      })
    );
  };

  const updateOrderItemPrice = (itemId: string, newPrice: number) => {
    setOrderItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const updatedItem = { ...item, unit_price: newPrice };
          return calculateItemTotals(updatedItem);
        }
        return item;
      })
    );
  };

  const removeOrderItem = (itemId: string) => {
    setOrderItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const calculations = useMemo(() => {
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.unit_price * item.quantity,
      0
    );
    const totalTax = orderItems.reduce((sum, item) => sum + item.tax_amount, 0);
    const dc = Number(deliveryCharge) || 0;
    const total = subtotal + totalTax + dc;

    return {
      subtotal: Number(subtotal.toFixed(2)),
      totalTax: Number(totalTax.toFixed(2)),
      deliveryCharge: Number(dc.toFixed(2)),
      total: Number(total.toFixed(2)),
    };
  }, [orderItems, deliveryCharge]);

  return {
    orderItems,
    setOrderItems,
    addOrderItem,
    updateOrderItemQuantity,
    updateOrderItemPrice,
    removeOrderItem,
    calculations,
  };
};
