import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiShoppingCart,
  FiUser,
  FiLogOut,
  FiMenu,
  FiX,
  FiChevronDown,
  FiPackage,
  FiGrid,
  FiUsers,
  FiFileText,
  FiShoppingBag,
  FiClipboard,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import SearchBar from './SearchBar';
import api from '../services/api';

/**
 * Navbar – sticky top navigation.
 * Contains logo, links, search bar, cart icon with badge, user dropdown,
 * admin dropdown, and a responsive hamburger menu.
 */
const Navbar = () => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userDropdown, setUserDropdown] = useState(false);
  const [adminDropdown, setAdminDropdown] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  // Fetch cart count when user changes
  const fetchCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const { data } = await api.get('/cart');
      const items = data.items || [];
      setCartCount(items.reduce((sum, item) => sum + item.qty, 0));
    } catch {
      setCartCount(0);
    }
  }, [user]);

  useEffect(() => {
    fetchCartCount();
  }, [fetchCartCount]);

  // Listen for custom cart-update events (fired after add/remove/update)
  useEffect(() => {
    const handler = () => fetchCartCount();
    window.addEventListener('cart-updated', handler);
    return () => window.removeEventListener('cart-updated', handler);
  }, [fetchCartCount]);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    setUserDropdown(false);
    navigate('/');
  };

  const closeAll = () => {
    setMenuOpen(false);
    setUserDropdown(false);
    setAdminDropdown(false);
  };

  return (
    <nav className="navbar">
      <div className="navbar-container">
        {/* Logo */}
        <Link to="/" className="navbar-logo" onClick={closeAll}>
          <FiShoppingBag className="navbar-logo-icon" />
          ShopEase
        </Link>

        {/* Hamburger toggle */}
        <button
          className="navbar-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Toggle navigation"
        >
          {menuOpen ? <FiX size={24} /> : <FiMenu size={24} />}
        </button>

        {/* Nav items */}
        <div className={`navbar-menu ${menuOpen ? 'open' : ''}`}>
          <SearchBar onSearch={closeAll} />

          <div className="navbar-links">
            <Link to="/" className="nav-link" onClick={closeAll}>
              Home
            </Link>
            <Link to="/products" className="nav-link" onClick={closeAll}>
              Products
            </Link>

            {/* Cart icon */}
            <Link to="/cart" className="nav-link cart-link" onClick={closeAll}>
              <FiShoppingCart size={20} />
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </Link>

            {/* User area */}
            {user ? (
              <div
                className="nav-dropdown"
                onMouseEnter={() => setUserDropdown(true)}
                onMouseLeave={() => setUserDropdown(false)}
              >
                <button className="nav-link dropdown-toggle">
                  <FiUser size={18} />
                  <span>{user.name?.split(' ')[0]}</span>
                  <FiChevronDown size={14} />
                </button>
                {userDropdown && (
                  <div className="dropdown-menu">
                    <Link to="/profile" className="dropdown-item" onClick={closeAll}>
                      <FiUser size={14} /> Profile
                    </Link>
                    <Link to="/orders" className="dropdown-item" onClick={closeAll}>
                      <FiPackage size={14} /> My Orders
                    </Link>
                    <button className="dropdown-item" onClick={handleLogout}>
                      <FiLogOut size={14} /> Logout
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="nav-link" onClick={closeAll}>
                  Login
                </Link>
                <Link to="/register" className="nav-link btn btn-primary btn-sm nav-register-btn" onClick={closeAll}>
                  Register
                </Link>
              </>
            )}

            {/* Admin dropdown */}
            {isAdmin && (
              <div
                className="nav-dropdown"
                onMouseEnter={() => setAdminDropdown(true)}
                onMouseLeave={() => setAdminDropdown(false)}
              >
                <button className="nav-link dropdown-toggle admin-toggle">
                  <FiGrid size={18} />
                  <span>Admin</span>
                  <FiChevronDown size={14} />
                </button>
                {adminDropdown && (
                  <div className="dropdown-menu">
                    <Link to="/admin/dashboard" className="dropdown-item" onClick={closeAll}>
                      <FiGrid size={14} /> Dashboard
                    </Link>
                    <Link to="/admin/products" className="dropdown-item" onClick={closeAll}>
                      <FiShoppingBag size={14} /> Products
                    </Link>
                    <Link to="/admin/orders" className="dropdown-item" onClick={closeAll}>
                      <FiPackage size={14} /> Orders
                    </Link>
                    <Link to="/admin/customers" className="dropdown-item" onClick={closeAll}>
                      <FiUsers size={14} /> Customers
                    </Link>
                    <Link to="/admin/audit-log" className="dropdown-item" onClick={closeAll}>
                      <FiFileText size={14} /> Audit Log
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
