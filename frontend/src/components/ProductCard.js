import React from 'react';
import { Link } from 'react-router-dom';
import { FiShoppingCart } from 'react-icons/fi';
import Rating from './Rating';

/**
 * ProductCard – card displaying product summary in grids.
 * Shows image, name, price, rating, category badge, and "Add to Cart" button.
 */
const ProductCard = ({ product, onAddToCart }) => {
  const { _id, name, price, image, rating, numReviews, category, countInStock } = product;

  return (
    <div className="product-card">
      <Link to={`/products/${_id}`} className="product-card-image-link">
        <img
          src={image || 'https://via.placeholder.com/300x300?text=No+Image'}
          alt={name}
          className="product-card-image"
        />
      </Link>
      <div className="product-card-body">
        {category && (
          <span className="product-card-category">
            {typeof category === 'object' ? category.name : category}
          </span>
        )}
        <Link to={`/products/${_id}`} className="product-card-name">
          <h3>{name}</h3>
        </Link>
        <Rating value={rating || 0} numReviews={numReviews} />
        <div className="product-card-footer">
          <span className="product-card-price">${Number(price).toFixed(2)}</span>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onAddToCart && onAddToCart(_id)}
            disabled={countInStock === 0}
            title={countInStock === 0 ? 'Out of stock' : 'Add to cart'}
          >
            <FiShoppingCart />
            <span>{countInStock === 0 ? 'Out of Stock' : 'Add to Cart'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
