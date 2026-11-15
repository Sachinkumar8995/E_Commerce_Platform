import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiShoppingBag, FiTrash2 } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CartItem from '../components/CartItem';
import Loader from '../components/Loader';
import Message from '../components/Message';

/**
 * CartPage – list of cart items with order summary sidebar.
 * Tax = 10%, shipping = $5.99 flat (free over $100).
 */
const CartPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCart = useCallback(async () => {
    if (!user) {
      setItems([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const { data } = await api.get('/cart');
      setItems(data.items || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  const handleUpdateQty = async (itemId, qty) => {
    if (qty < 1) return;
    try {
      await api.put(`/cart/${itemId}`, { qty });
      // Update local state immediately
      setItems((prev) =>
        prev.map((item) => (item._id === itemId ? { ...item, qty } : item))
      );
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update quantity');
    }
  };

  const handleRemove = async (itemId) => {
    try {
      await api.delete(`/cart/${itemId}`);
      setItems((prev) => prev.filter((item) => item._id !== itemId));
      toast.success('Item removed from cart');
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to remove item');
    }
  };

  const handleClearCart = async () => {
    try {
      await api.delete('/cart');
      setItems([]);
      toast.success('Cart cleared');
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to clear cart');
    }
  };

  // Calculations
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = items.reduce((sum, item) => {
    const price = item.product?.price || item.price || 0;
    return sum + price * item.qty;
  }, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal >= 100 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  if (loading) return <Loader />;

  if (!user) {
    return (
      <div className="container page">
        <Message variant="info">
          Please <Link to="/login">login</Link> to view your cart.
        </Message>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container page">
        <Message variant="error">{error}</Message>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="empty-state">
          <FiShoppingBag size={64} className="empty-icon" />
          <h2>Your cart is empty</h2>
          <p>Looks like you haven't added any products yet.</p>
          <Link to="/products" className="btn btn-primary">
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          {/* Cart items */}
          <div className="cart-items">
            <div className="cart-items-header">
              <span>{itemCount} item{itemCount !== 1 ? 's' : ''} in cart</span>
              <button className="btn btn-sm btn-danger-outline" onClick={handleClearCart}>
                <FiTrash2 /> Clear Cart
              </button>
            </div>
            {items.map((item) => (
              <CartItem
                key={item._id}
                item={item}
                onUpdateQty={handleUpdateQty}
                onRemove={handleRemove}
              />
            ))}
          </div>

          {/* Order summary */}
          <div className="order-summary">
            <h3>Order Summary</h3>
            <div className="summary-row">
              <span>Items ({itemCount})</span>
              <span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (10%)</span>
              <span>${tax.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            {subtotal < 100 && subtotal > 0 && (
              <p className="summary-hint">
                Add ${(100.01 - subtotal).toFixed(2)} more for free shipping!
              </p>
            )}
            <div className="summary-row summary-total">
              <span>Total</span>
              <span>${total.toFixed(2)}</span>
            </div>
            <button
              className="btn btn-primary btn-block"
              onClick={() => navigate('/checkout')}
              disabled={items.length === 0}
            >
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CartPage;
