import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { v4 as uuidv4 } from 'uuid';
import { useRef } from 'react';
import { FiCheck, FiMapPin, FiShoppingBag, FiCreditCard } from 'react-icons/fi';
import api from '../services/api';
import Loader from '../components/Loader';
import Message from '../components/Message';

/**
 * CheckoutPage – three-step checkout flow:
 *   Step 1: Select / add shipping address
 *   Step 2: Review order items and totals
 *   Step 3: Place order (with idempotency key)
 */
const CheckoutPage = () => {
  const idempotencyKey = useRef(uuidv4());
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Data
  const [addresses, setAddresses] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState('');
  const [cartItems, setCartItems] = useState([]);

  // New address form
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [addressForm, setAddressForm] = useState({
    address: '',
    city: '',
    postalCode: '',
    country: '',
    isDefault: false,
  });
  const [addressErrors, setAddressErrors] = useState({});

  // Fetch profile (addresses) and cart
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [profileRes, cartRes] = await Promise.all([
          api.get('/auth/profile'),
          api.get('/cart'),
        ]);
        const addrs = profileRes.data.addresses || [];
        setAddresses(addrs);
        // Pre-select default address
        const defaultAddr = addrs.find((a) => a.isDefault) || addrs[0];
        if (defaultAddr) setSelectedAddressId(defaultAddr._id);

        setCartItems(cartRes.data.items || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load checkout data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Calculations
  const subtotal = cartItems.reduce((sum, item) => {
    const price = item.product?.price || item.price || 0;
    return sum + price * item.qty;
  }, 0);
  const tax = subtotal * 0.1;
  const shipping = subtotal >= 100 ? 0 : 5.99;
  const total = subtotal + tax + shipping;

  // Address form validation
  const validateAddress = () => {
    const errs = {};
    if (!addressForm.address.trim()) errs.address = 'Address is required';
    if (!addressForm.city.trim()) errs.city = 'City is required';
    if (!addressForm.postalCode.trim()) errs.postalCode = 'Postal code is required';
    if (!addressForm.country.trim()) errs.country = 'Country is required';
    setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleAddAddress = async (e) => {
    e.preventDefault();
    if (!validateAddress()) return;
    try {
      const { data } = await api.put('/auth/address', addressForm);
      const addrs = data.addresses || [];
      setAddresses(addrs);
      const newAddr = addrs[addrs.length - 1];
      if (newAddr) setSelectedAddressId(newAddr._id);
      setShowAddressForm(false);
      setAddressForm({ address: '', city: '', postalCode: '', country: '', isDefault: false });
      toast.success('Address added!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add address');
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      toast.error('Please select a shipping address');
      setStep(1);
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    const selectedAddress = addresses.find((a) => a._id === selectedAddressId);
    if (!selectedAddress) {
      toast.error('Invalid address selected');
      return;
    }

    try {
      setSubmitting(true);
      const { data } = await api.post(
        '/orders',
        {
          shippingAddress: {
            address: selectedAddress.address,
            city: selectedAddress.city,
            postalCode: selectedAddress.postalCode,
            country: selectedAddress.country,
          },
        },
        {
          headers: { 'X-Idempotency-Key': idempotencyKey.current },
        }
      );
      toast.success('Order placed successfully!');
      window.dispatchEvent(new Event('cart-updated'));
      navigate(`/orders/${data._id}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="container page"><Message variant="error">{error}</Message></div>;

  if (cartItems.length === 0) {
    return (
      <div className="container page">
        <Message variant="info">Your cart is empty. Add some products before checking out.</Message>
      </div>
    );
  }

  return (
    <div className="container page">
      <h1 className="page-title">Checkout</h1>

      {/* Step indicator */}
      <div className="checkout-steps">
        <div className={`checkout-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
          <div className="step-number">{step > 1 ? <FiCheck /> : 1}</div>
          <span>Shipping</span>
        </div>
        <div className="step-line" />
        <div className={`checkout-step ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
          <div className="step-number">{step > 2 ? <FiCheck /> : 2}</div>
          <span>Review</span>
        </div>
        <div className="step-line" />
        <div className={`checkout-step ${step >= 3 ? 'active' : ''}`}>
          <div className="step-number">3</div>
          <span>Payment</span>
        </div>
      </div>

      {/* Step 1: Shipping Address */}
      {step === 1 && (
        <div className="checkout-section">
          <h2><FiMapPin /> Select Shipping Address</h2>

          {addresses.length === 0 && !showAddressForm && (
            <Message variant="info">No addresses found. Please add one.</Message>
          )}

          <div className="address-list">
            {addresses.map((addr) => (
              <label key={addr._id} className={`address-card ${selectedAddressId === addr._id ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="address"
                  checked={selectedAddressId === addr._id}
                  onChange={() => setSelectedAddressId(addr._id)}
                />
                <div className="address-card-body">
                  <p>{addr.address}</p>
                  <p>{addr.city}, {addr.postalCode}</p>
                  <p>{addr.country}</p>
                  {addr.isDefault && <span className="badge-default">Default</span>}
                </div>
              </label>
            ))}
          </div>

          <button
            className="btn btn-outline btn-sm mt-1"
            onClick={() => setShowAddressForm(!showAddressForm)}
          >
            {showAddressForm ? 'Cancel' : '+ Add New Address'}
          </button>

          {showAddressForm && (
            <form className="address-form mt-1" onSubmit={handleAddAddress}>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  className={`form-input ${addressErrors.address ? 'input-error' : ''}`}
                  value={addressForm.address}
                  onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
                />
                {addressErrors.address && <span className="error-text">{addressErrors.address}</span>}
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>City</label>
                  <input
                    type="text"
                    className={`form-input ${addressErrors.city ? 'input-error' : ''}`}
                    value={addressForm.city}
                    onChange={(e) => setAddressForm({ ...addressForm, city: e.target.value })}
                  />
                  {addressErrors.city && <span className="error-text">{addressErrors.city}</span>}
                </div>
                <div className="form-group">
                  <label>Postal Code</label>
                  <input
                    type="text"
                    className={`form-input ${addressErrors.postalCode ? 'input-error' : ''}`}
                    value={addressForm.postalCode}
                    onChange={(e) => setAddressForm({ ...addressForm, postalCode: e.target.value })}
                  />
                  {addressErrors.postalCode && <span className="error-text">{addressErrors.postalCode}</span>}
                </div>
              </div>
              <div className="form-group">
                <label>Country</label>
                <input
                  type="text"
                  className={`form-input ${addressErrors.country ? 'input-error' : ''}`}
                  value={addressForm.country}
                  onChange={(e) => setAddressForm({ ...addressForm, country: e.target.value })}
                />
                {addressErrors.country && <span className="error-text">{addressErrors.country}</span>}
              </div>
              <label className="filter-checkbox">
                <input
                  type="checkbox"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                />
                <span>Set as default</span>
              </label>
              <button type="submit" className="btn btn-primary btn-sm mt-1">
                Save Address
              </button>
            </form>
          )}

          <div className="checkout-nav mt-2">
            <button
              className="btn btn-primary"
              onClick={() => setStep(2)}
              disabled={!selectedAddressId}
            >
              Continue to Review
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Review Order */}
      {step === 2 && (
        <div className="checkout-section">
          <h2><FiShoppingBag /> Review Your Order</h2>

          {/* Shipping address summary */}
          <div className="review-address">
            <h4>Shipping Address</h4>
            {(() => {
              const addr = addresses.find((a) => a._id === selectedAddressId);
              return addr ? (
                <p>{addr.address}, {addr.city}, {addr.postalCode}, {addr.country}</p>
              ) : (
                <p>No address selected</p>
              );
            })()}
          </div>

          {/* Items */}
          <div className="review-items">
            <h4>Order Items</h4>
            {cartItems.map((item) => {
              const product = item.product || {};
              return (
                <div key={item._id} className="review-item">
                  <img
                    src={product.image || 'https://via.placeholder.com/60'}
                    alt={product.name || 'Product'}
                    className="review-item-image"
                  />
                  <div className="review-item-info">
                    <span>{product.name || 'Product'}</span>
                    <span className="text-muted">Qty: {item.qty}</span>
                  </div>
                  <span className="review-item-price">
                    ${((product.price || 0) * item.qty).toFixed(2)}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Totals */}
          <div className="review-totals">
            <div className="summary-row">
              <span>Subtotal</span><span>${subtotal.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Tax (10%)</span><span>${tax.toFixed(2)}</span>
            </div>
            <div className="summary-row">
              <span>Shipping</span><span>{shipping === 0 ? 'FREE' : `$${shipping.toFixed(2)}`}</span>
            </div>
            <div className="summary-row summary-total">
              <span>Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="checkout-nav mt-2">
            <button className="btn btn-outline" onClick={() => setStep(1)}>
              Back
            </button>
            <button className="btn btn-primary" onClick={() => setStep(3)}>
              Continue to Payment
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Place Order */}
      {step === 3 && (
        <div className="checkout-section">
          <h2><FiCreditCard /> Confirm & Pay</h2>
          <p className="text-muted">
            Review your order one last time and click the button below to place it.
            Payment will be simulated.
          </p>

          <div className="review-totals">
            <div className="summary-row summary-total">
              <span>Order Total</span><span>${total.toFixed(2)}</span>
            </div>
          </div>

          <div className="checkout-nav mt-2">
            <button className="btn btn-outline" onClick={() => setStep(2)}>
              Back
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handlePlaceOrder}
              disabled={submitting}
            >
              {submitting ? 'Placing Order…' : 'Place Order'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CheckoutPage;
