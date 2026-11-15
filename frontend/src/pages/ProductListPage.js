import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FiFilter, FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import ProductCard from '../components/ProductCard';
import Pagination from '../components/Pagination';
import Loader from '../components/Loader';
import Message from '../components/Message';

/**
 * ProductListPage – browseable product grid with sidebar filters:
 *   category checkboxes, price range, sort dropdown.
 *   URL query params stay in sync with filter state.
 */
const ProductListPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  // Filter state derived from URL
  const keyword = searchParams.get('keyword') || searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const sortBy = searchParams.get('sortBy') || '';
  const order = searchParams.get('order') || 'asc';
  const page = parseInt(searchParams.get('page') || '1', 10);

  const [products, setProducts] = useState([]);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Local filter state for controlled inputs
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  // Fetch categories once
  useEffect(() => {
    api.get('/categories').then((res) => setCategories(res.data || [])).catch(() => {});
  }, []);

  // Fetch products whenever URL params change
  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams();
      if (keyword) params.set('q', keyword);
      if (categoryParam) params.set('category', categoryParam);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (sortBy) params.set('sort', `${sortBy}-${order}`);
      params.set('page', page);
      params.set('limit', 12);

      const { data } = await api.get(`/products?${params.toString()}`);
      setProducts(data.products || []);
      setPages(data.pages || 1);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryParam, minPrice, maxPrice, sortBy, order, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Keep local price inputs in sync when URL changes
  useEffect(() => {
    setLocalMinPrice(minPrice);
    setLocalMaxPrice(maxPrice);
  }, [minPrice, maxPrice]);

  // Helper to update URL params
  const updateParams = (updates) => {
    const params = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val) {
        params.set(key, val);
      } else {
        params.delete(key);
      }
    });
    // Reset to page 1 when filters change (unless we're changing page)
    if (!('page' in updates)) {
      params.set('page', '1');
    }
    setSearchParams(params);
  };

  const handleCategoryToggle = (catName) => {
    const current = categoryParam.split(',').filter(Boolean);
    let updated;
    if (current.includes(catName)) {
      updated = current.filter((c) => c !== catName);
    } else {
      updated = [...current, catName];
    }
    updateParams({ category: updated.join(',') });
  };

  const handlePriceApply = () => {
    updateParams({ minPrice: localMinPrice, maxPrice: localMaxPrice });
  };

  const handleSort = (e) => {
    const val = e.target.value;
    if (!val) {
      updateParams({ sortBy: '', order: '' });
    } else {
      const [s, o] = val.split('-');
      updateParams({ sortBy: s, order: o });
    }
  };

  const handleClearFilters = () => {
    setSearchParams(keyword ? { keyword } : {});
    setLocalMinPrice('');
    setLocalMaxPrice('');
  };

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

  const selectedCategories = categoryParam.split(',').filter(Boolean);
  const hasFilters = categoryParam || minPrice || maxPrice || sortBy;
  const sortValue = sortBy ? `${sortBy}-${order}` : '';

  return (
    <div className="product-list-page">
      {/* Mobile filter toggle */}
      <button className="filter-toggle-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
        {sidebarOpen ? <FiX size={18} /> : <FiFilter size={18} />}
        <span>Filters</span>
      </button>

      {/* Sidebar */}
      <aside className={`filter-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="filter-header">
          <h3>Filters</h3>
          {hasFilters && (
            <button className="btn btn-sm btn-outline" onClick={handleClearFilters}>
              Clear All
            </button>
          )}
        </div>

        {/* Category filter */}
        <div className="filter-group">
          <h4>Category</h4>
          {categories.map((cat) => (
            <label key={cat._id} className="filter-checkbox">
              <input
                type="checkbox"
                checked={selectedCategories.includes(cat.name)}
                onChange={() => handleCategoryToggle(cat.name)}
              />
              <span>{cat.name}</span>
            </label>
          ))}
        </div>

        {/* Price range */}
        <div className="filter-group">
          <h4>Price Range</h4>
          <div className="price-range-inputs">
            <input
              type="number"
              placeholder="Min"
              value={localMinPrice}
              onChange={(e) => setLocalMinPrice(e.target.value)}
              min="0"
              className="form-input"
            />
            <span>—</span>
            <input
              type="number"
              placeholder="Max"
              value={localMaxPrice}
              onChange={(e) => setLocalMaxPrice(e.target.value)}
              min="0"
              className="form-input"
            />
          </div>
          <button className="btn btn-sm btn-primary" onClick={handlePriceApply} style={{marginTop:'0.5rem',width:'100%'}}>
            Apply
          </button>
        </div>

        {/* Sort */}
        <div className="filter-group">
          <h4>Sort By</h4>
          <select className="form-input" value={sortValue} onChange={handleSort}>
            <option value="">Default</option>
            <option value="price-asc">Price: Low → High</option>
            <option value="price-desc">Price: High → Low</option>
            <option value="createdAt-desc">Newest First</option>
            <option value="rating-desc">Top Rated</option>
          </select>
        </div>
      </aside>

      {/* Main content */}
      <main className="product-list-main">
        <div className="product-list-header">
          <h2>
            {keyword ? `Search results for "${keyword}"` : 'All Products'}
          </h2>
          <p className="text-muted">{total} product{total !== 1 ? 's' : ''} found</p>
        </div>

        {loading ? (
          <Loader />
        ) : error ? (
          <Message variant="error">{error}</Message>
        ) : products.length === 0 ? (
          <Message variant="info">No products match your filters.</Message>
        ) : (
          <>
            <div className="products-grid">
              {products.map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  onAddToCart={handleAddToCart}
                />
              ))}
            </div>
            <Pagination
              page={page}
              pages={pages}
              onPageChange={(p) => updateParams({ page: String(p) })}
            />
          </>
        )}
      </main>
    </div>
  );
};

export default ProductListPage;
