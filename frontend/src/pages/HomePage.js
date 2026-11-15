import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FiArrowRight, FiShoppingBag } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Loader from '../components/Loader';
import Message from '../components/Message';

/**
 * HomePage – hero banner, featured categories, latest products, and CTA.
 */
const HomePage = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [prodRes, catRes] = await Promise.all([
          api.get('/products?limit=8&sortBy=createdAt&order=desc'),
          api.get('/categories'),
        ]);
        setProducts(prodRes.data.products || []);
        setCategories(catRes.data || []);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleAddToCart = async (productId) => {
    if (!user) {
      toast.info('Please login to add items to your cart');
      return;
    }
    try {
      await api.post('/cart', { productId, qty: 1 });
      toast.success('Added to cart!');
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    }
  };

  if (loading) return <Loader />;
  if (error) return <Message variant="error">{error}</Message>;

  return (
    <div className="home-page">
      {/* Hero Banner */}
      <section className="hero">
        <div className="hero-content">
          <h1 className="hero-title">
            Discover Your <span className="text-accent">Style</span>
          </h1>
          <p className="hero-subtitle">
            Shop the latest trends with unbeatable prices. Quality products,
            fast delivery, and exceptional customer service.
          </p>
          <Link to="/products" className="btn btn-primary btn-lg">
            <FiShoppingBag /> Shop Now
          </Link>
        </div>
        <div className="hero-decoration">
          <div className="hero-shape hero-shape-1"></div>
          <div className="hero-shape hero-shape-2"></div>
          <div className="hero-shape hero-shape-3"></div>
        </div>
      </section>

      {/* Featured Categories */}
      {categories.length > 0 && (
        <section className="section">
          <div className="container">
            <h2 className="section-title">Shop by Category</h2>
            <div className="categories-grid">
              {categories.slice(0, 6).map((cat) => (
                <Link
                  key={cat._id}
                  to={`/products?category=${encodeURIComponent(cat.name)}`}
                  className="category-card"
                >
                  <div className="category-card-icon">
                    <FiShoppingBag size={32} />
                  </div>
                  <h3>{cat.name}</h3>
                  {cat.description && <p>{cat.description}</p>}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest Products */}
      <section className="section section-gray">
        <div className="container">
          <div className="section-header">
            <h2 className="section-title">Latest Products</h2>
            <Link to="/products" className="btn btn-outline">
              View All <FiArrowRight />
            </Link>
          </div>
          {products.length === 0 ? (
            <Message variant="info">No products available yet.</Message>
          ) : (
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
