import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';
import Loader from '../components/Loader';
import Message from '../components/Message';
import OrderStatusBadge from '../components/OrderStatusBadge';

const OrderDetailPage = () => {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const loadOrder = async () => {
    try {
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load this order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrder(); }, [id]);

  const pay = async (success) => {
    try {
      setBusy(true);
      const { data } = await api.put(`/orders/${id}/pay`, { success });
      setOrder(data);
      toast.success('Sandbox payment completed');
    } catch (err) {
      if (err.response?.data?.message) toast.error(err.response.data.message);
      else toast.error('Payment request failed');
      await loadOrder();
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    try {
      setBusy(true);
      const { data } = await api.put(`/orders/${id}/cancel`);
      setOrder(data);
      toast.success('Order cancelled and stock released');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not cancel order');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Loader />;
  if (error || !order) return <div className="container page"><Message variant="error">{error || 'Order not found'}</Message></div>;

  return (
    <div className="container page">
      <div className="section-header"><div><p className="eyebrow">ORDER #{order._id.slice(-8).toUpperCase()}</p><h1 className="page-title">Order details</h1></div><OrderStatusBadge status={order.status} /></div>
      <div className="order-detail-layout">
        <section className="panel">
          <h2>Items</h2>
          {order.orderItems.map((item) => <div className="review-item" key={item._id || item.product}>
            <img className="review-item-image" src={item.image || 'https://placehold.co/72x72?text=Item'} alt={item.name} />
            <div className="review-item-info"><strong>{item.name}</strong><span className="text-muted">Qty: {item.qty}</span></div>
            <strong>${(item.price * item.qty).toFixed(2)}</strong>
          </div>)}
          <h2 className="mt-2">Shipping address</h2>
          <p>{order.shippingAddress.address}, {order.shippingAddress.city}, {order.shippingAddress.postalCode}, {order.shippingAddress.country}</p>
        </section>
        <aside className="order-summary">
          <h2>Payment summary</h2>
          <div className="summary-row"><span>Subtotal</span><span>${order.itemsPrice.toFixed(2)}</span></div>
          <div className="summary-row"><span>Tax</span><span>${order.taxPrice.toFixed(2)}</span></div>
          <div className="summary-row"><span>Shipping</span><span>${order.shippingPrice.toFixed(2)}</span></div>
          <div className="summary-row summary-total"><span>Total</span><span>${order.totalPrice.toFixed(2)}</span></div>
          {order.paymentResult?.status === 'FAILED' && <Message variant="error">Last simulated payment failed. You may retry or cancel.</Message>}
          {order.status === 'placed' && <div className="stack-actions">
            <button disabled={busy} className="btn btn-primary btn-block" onClick={() => pay(true)}>{busy ? 'Processing…' : 'Pay (sandbox success)'}</button>
            <button disabled={busy} className="btn btn-outline btn-block" onClick={() => pay(false)}>Simulate payment failure</button>
            <button disabled={busy} className="btn btn-danger-outline btn-block" onClick={cancel}>Cancel order</button>
          </div>}
          {order.status === 'paid' && <button disabled={busy} className="btn btn-danger-outline btn-block" onClick={cancel}>Cancel order</button>}
          {order.isPaid && <p className="text-success">Paid {order.paidAt ? new Date(order.paidAt).toLocaleString() : ''}</p>}
          <Link className="btn btn-outline btn-block mt-1" to="/orders">Back to orders</Link>
        </aside>
      </div>
    </div>
  );
};

export default OrderDetailPage;
