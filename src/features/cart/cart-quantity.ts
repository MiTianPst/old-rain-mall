export function getCartQuantityControls({ quantity, stock }: { quantity: number; stock: number }) {
  const max = Math.min(99, Math.max(1, stock));
  return {
    previous: quantity > 1 ? quantity - 1 : null,
    next: quantity < max ? quantity + 1 : null,
    max,
  };
}
