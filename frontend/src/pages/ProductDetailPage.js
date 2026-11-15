import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiShoppingCart, FiMinus, FiPlus, FiArrowLeft } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import Rating from '../components/Rating';
import Loader from '../components/Loader';
import Message from '../components/Message';

/**
 * ProductDetailPage – full product information with qty selector and add-to-cart.
 */
const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [product, setProduct] = useState(null);
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        const { data } = await api.get(`/products/${id}`);
        setProduct(data);
      } catch (err) {
        setError(err.response?.data?.message || 'Product not found');
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  const maxQty = product ? Math.min(product.countInStock || 0, 10) : 0;

  const handleAddToCart = async () => {
    if (!user) {
      toast.info('Please login to add items to your cart');
      navigate('/login');
      return;
    }
    try {
      setAdding(true);
      await api.post('/cart', { productId: product._id, qty });
      toast.success(`${product.name} added to cart!`);
      window.dispatchEvent(new Event('cart-updated'));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (loading) return <Loader />;
  if (error) return <div className="container page"><Message variant="error">{error}</Message></div>;
  if (!product) return <div className="container page"><Message variant="info">Product not found.</Message></div>;

  const inStock = product.countInStock > 0;
  const categoryName =
    typeof product.category === 'object' ? product.category?.name : product.category;

  return (
    <div className="container page">
      <button className="btn btn-outline btn-sm mb-1" onClick={() => navigate(-1)}>
        <FiArrowLeft /> Back
      </button>

      <div className="product-detail">
        {/* Image */}
        <div className="product-detail-image">
          <img
            src={product.image || 'https://via.placeholder.com/500x500?text=No+Image'}
            alt={product.name}
          />
        </div>

        {/* Info */}
        <div className="product-detail-info">
          <h1>{product.name}</h1>

          <Rating value={product.rating || 0} numReviews={product.numReviews} />

          <p className="product-detail-price">${Number(product.price).toFixed(2)}</p>

          <div className="product-detail-meta">
            {categoryName && (
              <span className="meta-item">
                <strong>Category:</strong> {categoryName}
              </span>
            )}
            {product.brand && (
              <span className="meta-item">
                <strong>Brand:</strong> {product.brand}
              </span>
            )}
            <span className={`meta-item ${inStock ? 'text-success' : 'text-danger'}`}>
              {inStock ? `In Stock (${product.countInStock})` : 'Out of Stock'}
            </span>
          </div>

          <div className="product-detail-description">
            <h3>Description</h3>
            <p>{product.description || 'No description available.'}</p>
          </div>

          {/* Qty + Add to Cart */}
          {inStock && (
            <div className="product-detail-actions">
              <div className="qty-selector">
                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                >
                  <FiMinus />
                </button>
                <span className="qty-value">{qty}</span>
                <button
                  className="qty-btn"
                  onClick={() => setQty((q) => Math.min(maxQty, q + 1))}
                  disabled={qty >= maxQty}
                >
                  <FiPlus />
                </button>
              </div>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleAddToCart}
                disabled={adding}
              >
                <FiShoppingCart />
                {adding ? 'Adding…' : 'Add to Cart'}
              </button>
            </div>
          )}

          {!inStock && (
            <button className="btn btn-disabled btn-lg" disabled>
              Out of Stock
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductDetailPage;
