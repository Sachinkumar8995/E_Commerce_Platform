import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../../services/api';
import Loader from '../../components/Loader';
import Message from '../../components/Message';
import OrderStatusBadge from '../../components/OrderStatusBadge';

const sections = [
  ['/', 'Overview'], ['/products', 'Products'], ['/categories', 'Categories'],
  ['/orders', 'Orders'], ['/customers', 'Customers'], ['/audit-log', 'Audit trail'],
];
const nextStatus = { paid: 'packed', packed: 'shipped', shipped: 'delivered' };

const AdminDashboard = () => {
  const location = useLocation();
  const section = location.pathname.replace('/admin', '').replace(/^\//, '') || 'dashboard';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', price: '', countInStock: '', image: '', brand: '' });
  const [categoryName, setCategoryName] = useState('');
  const [refresh, setRefresh] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = {
        dashboard: '/admin/dashboard',
        products: '/products?limit=100',
        categories: '/categories',
        orders: '/orders/admin/all?limit=100',
        customers: '/admin/customers?limit=100',
        'audit-log': '/admin/audit-log?limit=100',
      }[section] || '/admin/dashboard';
      const { data: result } = await api.get(endpoint);
      setData(result);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load admin data');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [section, refresh]);

  useEffect(() => { load(); }, [load]);

  const reload = () => setRefresh((value) => value + 1);
  const createProduct = async (event) => {
    event.preventDefault();
    try {
      await api.post('/products', { ...form, price: Number(form.price), countInStock: Number(form.countInStock) });
      setForm({ name: '', description: '', price: '', countInStock: '', image: '', brand: '' });
      toast.success('Product created');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create product');
    }
  };
  const saveProduct = async (product) => {
    try {
      await api.put(`/products/${product._id}`, { name: product.name, price: Number(product.price), countInStock: Number(product.countInStock) });
      toast.success('Inventory updated');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update product');
    }
  };
  const deactivateProduct = async (productId) => {
    try {
      await api.delete(`/products/${productId}`);
      toast.success('Product removed from the catalogue');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove product');
    }
  };
  const createCategory = async (event) => {
    event.preventDefault();
    try {
      await api.post('/categories', { name: categoryName });
      setCategoryName('');
      toast.success('Category created');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not create category');
    }
  };
  const deleteCategory = async (id) => {
    try {
      await api.delete(`/categories/${id}`);
      toast.success('Category removed');
      reload();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove category');
    }
  };
  const moveOrder = async (order, status) => {
    try {
      const { data: updated } = await api.put(`/orders/${order._id}/status`, { status });
      setData((current) => ({ ...current, orders: current.orders.map((item) => item._id === order._id ? updated : item) }));
      toast.success(`Order moved to ${status}`);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update order');
    }
  };

  return (
    <div className="container page admin-page">
      <div className="section-header"><div><p className="eyebrow">SHOP EASE / STAFF</p><h1 className="page-title">Admin workspace</h1></div><span className="admin-indicator">Admin access</span></div>
      <nav className="admin-tabs" aria-label="Admin sections">{sections.map(([path, label]) => <Link key={path} className={section === (path === '/' ? 'dashboard' : path.slice(1)) ? 'active' : ''} to={`/admin${path === '/' ? '' : path}`}>{label}</Link>)}</nav>
      {loading ? <Loader /> : !data ? <Message variant="error">Admin data could not be loaded.</Message> : (
        <>
          {section === 'dashboard' && <Dashboard data={data} />}
          {section === 'products' && <Products data={data} form={form} setForm={setForm} createProduct={createProduct} saveProduct={saveProduct} deactivateProduct={deactivateProduct} />}
          {section === 'categories' && <Categories data={data} name={categoryName} setName={setCategoryName} create={createCategory} remove={deleteCategory} />}
          {section === 'orders' && <Orders data={data} moveOrder={moveOrder} />}
          {section === 'customers' && <Customers data={data} />}
          {section === 'audit-log' && <AuditTrail data={data} />}
        </>
      )}
    </div>
  );
};

const Dashboard = ({ data }) => (
  <>
    <div className="stats-grid">
      <Stat label="Net sales" value={`$${Number(data.totalRevenue).toFixed(2)}`} />
      <Stat label="All orders" value={data.totalOrders} />
      <Stat label="Customers" value={data.totalCustomers} />
      <Stat label="Order statuses" value={data.ordersByStatus?.length || 0} />
    </div>
    <div className="admin-grid">
      <section className="panel"><div className="section-header"><h2>Recent orders</h2><Link to="/admin/orders">All orders</Link></div>
        <div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th></tr></thead><tbody>
          {(data.recentOrders || []).map((order) => <tr key={order._id}><td><Link to={`/orders/${order._id}`}>#{order._id.slice(-8).toUpperCase()}</Link></td><td>{order.user?.name || 'Unknown'}</td><td>${order.totalPrice.toFixed(2)}</td><td><OrderStatusBadge status={order.status} /></td></tr>)}
        </tbody></table></div>
        {!data.recentOrders?.length && <Message variant="info">No orders yet.</Message>}
      </section>
      <section className="panel"><h2>Orders by status</h2>{(data.ordersByStatus || []).map((item) => <div className="summary-row" key={item._id}><span className="status-label">{item._id}</span><strong>{item.count}</strong></div>)}
        <h2 className="mt-2">Top sellers</h2>{(data.topSelling || []).map((item) => <div className="summary-row" key={item._id}><span>{item.name}</span><strong>{item.totalQty} sold</strong></div>)}
      </section>
    </div>
  </>
);
const Stat = ({ label, value }) => <div className="stat-card"><span>{label}</span><strong>{value}</strong></div>;

const Products = ({ data, form, setForm, createProduct, saveProduct, deactivateProduct }) => {
  const [edits, setEdits] = useState({});
  return <div className="admin-grid">
    <section className="panel"><h2>Add product</h2><form onSubmit={createProduct}>
      {['name', 'description', 'price', 'countInStock', 'image', 'brand'].map((field) => <label className="form-group" key={field}>{field === 'countInStock' ? 'Initial stock' : field[0].toUpperCase() + field.slice(1)}<input required={['name', 'price', 'countInStock'].includes(field)} type={['price', 'countInStock'].includes(field) ? 'number' : 'text'} min={['price', 'countInStock'].includes(field) ? '0' : undefined} step={field === 'price' ? '0.01' : '1'} className="form-input" value={form[field]} onChange={(e) => setForm({ ...form, [field]: e.target.value })} /></label>)}
      <button className="btn btn-primary" type="submit">Create product</button>
    </form></section>
    <section className="panel"><h2>Inventory</h2><div className="table-wrap"><table><thead><tr><th>Product</th><th>Rename</th><th>Price</th><th>Stock</th><th>Save</th><th>Remove</th></tr></thead><tbody>
      {(data.products || []).map((product) => { const values = edits[product._id] || product; return <tr key={product._id}><td>{product.name}</td>
        <td><input aria-label={`${product.name} name`} className="table-input" type="text" value={values.name} onChange={(e) => setEdits({ ...edits, [product._id]: { ...values, name: e.target.value } })} /></td>
        <td><input aria-label={`${product.name} price`} className="table-input" type="number" min="0" step="0.01" value={values.price} onChange={(e) => setEdits({ ...edits, [product._id]: { ...values, price: e.target.value } })} /></td>
        <td><input aria-label={`${product.name} stock`} className="table-input" type="number" min="0" step="1" value={values.countInStock} onChange={(e) => setEdits({ ...edits, [product._id]: { ...values, countInStock: e.target.value } })} /></td>
        <td><button className="btn btn-sm btn-outline" onClick={() => saveProduct(values)}>Save</button></td><td><button className="btn btn-sm btn-danger-outline" onClick={() => deactivateProduct(product._id)}>Remove</button></td></tr>; })}
    </tbody></table></div></section>
  </div>;
};

const Categories = ({ data, name, setName, create, remove }) => (
  <section className="panel"><h2>Manage categories</h2><form className="inline-form" onSubmit={create}><input required className="form-input" placeholder="Category name" value={name} onChange={(e) => setName(e.target.value)} /><button className="btn btn-primary">Add category</button></form>
    <div className="table-wrap"><table><thead><tr><th>Name</th><th>Description</th><th /></tr></thead><tbody>{data.map((category) => <tr key={category._id}><td>{category.name}</td><td>{category.description}</td><td><button className="btn btn-sm btn-danger-outline" onClick={() => remove(category._id)}>Remove</button></td></tr>)}</tbody></table></div>
  </section>
);
const Orders = ({ data, moveOrder }) => <section className="panel"><h2>Order management</h2><div className="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Date</th><th>Total</th><th>Status</th><th>Action</th></tr></thead><tbody>
  {(data.orders || []).map((order) => <tr key={order._id}><td>#{order._id.slice(-8).toUpperCase()}</td><td>{order.user?.name || 'Unknown'}</td><td>{new Date(order.createdAt).toLocaleDateString()}</td><td>${order.totalPrice.toFixed(2)}</td><td><OrderStatusBadge status={order.status} /></td><td>{nextStatus[order.status] ? <button className="btn btn-sm btn-primary" onClick={() => moveOrder(order, nextStatus[order.status])}>Mark {nextStatus[order.status]}</button> : '—'}</td></tr>)}
  </tbody></table></div>{!data.orders?.length && <Message variant="info">No orders yet.</Message>}</section>;
const Customers = ({ data }) => <section className="panel"><h2>Customers</h2><div className="table-wrap"><table><thead><tr><th>Name</th><th>Email</th><th>Joined</th><th>Saved addresses</th></tr></thead><tbody>
  {(data.customers || []).map((customer) => <tr key={customer._id}><td>{customer.name}</td><td>{customer.email}</td><td>{new Date(customer.createdAt).toLocaleDateString()}</td><td>{customer.addresses?.length || 0}</td></tr>)}
  </tbody></table></div>{!data.customers?.length && <Message variant="info">No customers yet.</Message>}</section>;
const AuditTrail = ({ data }) => <section className="panel"><h2>Audit trail</h2><div className="table-wrap"><table><thead><tr><th>Time</th><th>Action</th><th>Entity</th><th>Actor</th><th>Changes</th></tr></thead><tbody>
  {(data.logs || []).map((log) => <tr key={log._id}><td>{new Date(log.timestamp).toLocaleString()}</td><td>{log.action}</td><td>{log.entity}</td><td>{log.user?.email || 'System'}</td><td><code>{JSON.stringify(log.changes || {})}</code></td></tr>)}
  </tbody></table></div>{!data.logs?.length && <Message variant="info">No audit entries yet.</Message>}</section>;

export default AdminDashboard;
