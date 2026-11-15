import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Loader from '../components/Loader';
import Message from '../components/Message';
import OrderStatusBadge from '../components/OrderStatusBadge';

const OrderListPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/orders')
      .then(({ data }) => setOrders(data.orders || []))
      .catch((err) => setError(err.response?.data?.message || 'Could not load orders'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader />;
  return (
    <div className="container page">
      <h1 className="page-title">My orders</h1>
      {error && <Message variant="error">{error}</Message>}
      {!error && orders.length === 0 && <Message variant="info">You haven’t placed an order yet. <Link to="/products">Browse products</Link>.</Message>}
      {orders.length > 0 && <div className="table-wrap"><table><thead><tr><th>Order</th><th>Date</th><th>Items</th><th>Total</th><th>Status</th><th /></tr></thead>
        <tbody>{orders.map((order) => <tr key={order._id}>
          <td>#{order._id.slice(-8).toUpperCase()}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td>
          <td>{order.orderItems.reduce((sum, item) => sum + item.qty, 0)}</td><td>${order.totalPrice.toFixed(2)}</td>
          <td><OrderStatusBadge status={order.status} /></td><td><Link className="btn btn-sm btn-outline" to={`/orders/${order._id}`}>View</Link></td>
        </tr>)}</tbody></table></div>}
    </div>
  );
};

export default OrderListPage;
