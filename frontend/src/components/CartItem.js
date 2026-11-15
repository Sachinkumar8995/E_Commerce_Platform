import React from 'react';
import { FiTrash2, FiMinus, FiPlus } from 'react-icons/fi';

/**
 * CartItem – renders a single row in the cart.
 * Shows image, name, price, qty selector, remove button, and line total.
 */
const CartItem = ({ item, onUpdateQty, onRemove }) => {
  const product = item.product || {};
  const name = product.name || item.name || 'Product';
  const price = product.price || item.price || 0;
  const image = product.image || item.image || 'https://via.placeholder.com/80';
  const maxQty = Math.min(product.countInStock || 10, 10);

  return (
    <div className="cart-item">
      <img src={image} alt={name} className="cart-item-image" />
      <div className="cart-item-details">
        <h4 className="cart-item-name">{name}</h4>
        <p className="cart-item-price">${Number(price).toFixed(2)}</p>
      </div>
      <div className="cart-item-qty">
        <button
          className="qty-btn"
          onClick={() => onUpdateQty(item._id, item.qty - 1)}
          disabled={item.qty <= 1}
          aria-label="Decrease quantity"
        >
          <FiMinus />
        </button>
        <span className="qty-value">{item.qty}</span>
        <button
          className="qty-btn"
          onClick={() => onUpdateQty(item._id, item.qty + 1)}
          disabled={item.qty >= maxQty}
          aria-label="Increase quantity"
        >
          <FiPlus />
        </button>
      </div>
      <div className="cart-item-total">
        ${(Number(price) * item.qty).toFixed(2)}
      </div>
      <button
        className="btn btn-icon btn-danger-outline"
        onClick={() => onRemove(item._id)}
        aria-label="Remove item"
      >
        <FiTrash2 />
      </button>
    </div>
  );
};

export default CartItem;
