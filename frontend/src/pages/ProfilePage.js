import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/Loader';
import Message from '../components/Message';

const blankAddress = { address: '', city: '', postalCode: '', country: '', isDefault: false };

const ProfilePage = () => {
  const { setUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [address, setAddress] = useState(blankAddress);
  const [editingAddress, setEditingAddress] = useState('');
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    try {
      const { data } = await api.get('/auth/profile');
      setProfile(data);
      setForm({ name: data.name, email: data.email, password: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not load profile');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const saveProfile = async (event) => {
    event.preventDefault();
    try {
      const payload = { name: form.name, email: form.email };
      if (form.password) payload.password = form.password;
      const { data } = await api.put('/auth/profile', payload);
      const saved = { ...JSON.parse(localStorage.getItem('userInfo')), ...data };
      setUser(saved);
      setForm((current) => ({ ...current, password: '' }));
      toast.success('Profile updated');
      await loadProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not update profile');
    }
  };

  const saveAddress = async (event) => {
    event.preventDefault();
    try {
      const payload = editingAddress ? { ...address, id: editingAddress } : address;
      const { data } = await api.put('/auth/address', payload);
      setProfile((current) => ({ ...current, addresses: data.addresses }));
      setAddress(blankAddress);
      setEditingAddress('');
      toast.success(editingAddress ? 'Address updated' : 'Address added');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not save address');
    }
  };

  const removeAddress = async (id) => {
    try {
      const { data } = await api.delete(`/auth/address/${id}`);
      setProfile((current) => ({ ...current, addresses: data.addresses }));
      toast.success('Address removed');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Could not remove address');
    }
  };

  if (loading) return <Loader />;
  if (!profile) return <div className="container page"><Message variant="error">Unable to load your profile.</Message></div>;

  return (
    <div className="container page">
      <h1 className="page-title">My profile</h1>
      <div className="profile-layout">
        <section className="panel">
          <h2>Account details</h2>
          <form onSubmit={saveProfile}>
            <label className="form-group">Name<input required className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="form-group">Email<input required type="email" className="form-input" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="form-group">New password <span className="text-muted">(leave blank to keep current)</span><input minLength="8" type="password" className="form-input" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button className="btn btn-primary" type="submit">Save profile</button>
          </form>
        </section>

        <section className="panel">
          <h2>Address book</h2>
          {profile.addresses?.length ? profile.addresses.map((item) => (
            <div className="address-book-item" key={item._id}>
              <div><strong>{item.address}</strong><p>{item.city}, {item.postalCode}, {item.country}</p>{item.isDefault && <span className="badge-default">Default</span>}</div>
              <div className="inline-actions">
                <button className="btn btn-sm btn-outline" type="button" onClick={() => { setAddress({ ...item }); setEditingAddress(item._id); }}>Edit</button>
                <button className="btn btn-sm btn-danger-outline" type="button" onClick={() => removeAddress(item._id)}>Remove</button>
              </div>
            </div>
          )) : <Message variant="info">You haven’t saved an address yet.</Message>}
          <form className="address-form" onSubmit={saveAddress}>
            <h3>{editingAddress ? 'Edit address' : 'Add address'}</h3>
            {['address', 'city', 'postalCode', 'country'].map((field) => (
              <label className="form-group" key={field}>{field === 'postalCode' ? 'Postal code' : field[0].toUpperCase() + field.slice(1)}
                <input required className="form-input" value={address[field]} onChange={(e) => setAddress({ ...address, [field]: e.target.value })} />
              </label>
            ))}
            <label className="filter-checkbox"><input type="checkbox" checked={address.isDefault} onChange={(e) => setAddress({ ...address, isDefault: e.target.checked })} /> Set as default</label>
            <div className="inline-actions">
              <button className="btn btn-primary" type="submit">Save address</button>
              {editingAddress && <button className="btn btn-outline" type="button" onClick={() => { setEditingAddress(''); setAddress(blankAddress); }}>Cancel</button>}
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ProfilePage;
