import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch } from 'react-icons/fi';

/**
 * SearchBar – input with submit button; redirects to /products?keyword=X
 */
const SearchBar = ({ onSearch }) => {
  const [keyword, setKeyword] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const currentQuery = searchParams.get('keyword') || searchParams.get('q') || '';

  useEffect(() => {
    setKeyword(currentQuery);
  }, [currentQuery]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed) {
      navigate(`/products?keyword=${encodeURIComponent(trimmed)}`);
    } else {
      navigate('/products');
    }
    // Close mobile menu if callback provided
    if (onSearch) onSearch();
  };

  return (
    <form className="search-bar" onSubmit={handleSubmit}>
      <input
        type="search"
        name="keyword"
        placeholder="Search products by name…"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="search-input"
        aria-label="Search products"
      />
      <button type="submit" className="search-btn" aria-label="Search">
        <FiSearch />
      </button>
    </form>
  );
};

export default SearchBar;
