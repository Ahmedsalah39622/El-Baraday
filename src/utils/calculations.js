import { DISCOUNT_TYPES } from './constants';

export const calculateSubtotal = (items) => {
  if (!Array.isArray(items)) return 0;
  return items.reduce((total, item) => {
    const price = Number(item.price) || 0;
    const quantity = Number(item.quantity) || 1;
    return total + (price * quantity);
  }, 0);
};

export const calculateDiscount = (subtotal, discountType, discountValue) => {
  const value = Number(discountValue) || 0;
  const sub = Number(subtotal) || 0;
  
  if (value <= 0) return 0;
  
  if (discountType === DISCOUNT_TYPES.PERCENTAGE) {
    return (sub * value) / 100;
  }
  
  if (discountType === DISCOUNT_TYPES.AMOUNT) {
    return value > sub ? sub : value;
  }
  
  return 0;
};

export const calculateTotal = (subtotal, discount) => {
  const sub = Number(subtotal) || 0;
  const disc = Number(discount) || 0;
  const total = sub - disc;
  return total > 0 ? total : 0;
};

export const calculateChange = (total, paid) => {
  const t = Number(total) || 0;
  const p = Number(paid) || 0;
  const change = p - t;
  return change > 0 ? change : 0;
};
