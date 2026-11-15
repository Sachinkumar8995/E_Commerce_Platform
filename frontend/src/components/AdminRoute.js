import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './Loader';

/**
 * AdminRoute – redirects to / if the user is not an admin.
 */
const AdminRoute = ({ children }) => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) return <Loader />;
  if (!user || !isAdmin) return <Navigate to="/" replace />;

  return children;
};

export default AdminRoute;
