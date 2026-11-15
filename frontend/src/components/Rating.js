import React from 'react';
import { FaStar, FaStarHalfAlt, FaRegStar } from 'react-icons/fa';

/**
 * Rating – displays 1-5 stars (filled, half, or empty).
 * @param {number} value – the rating value (0-5)
 * @param {number} numReviews – optional review count text
 */
const Rating = ({ value = 0, numReviews }) => {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    if (value >= i) {
      stars.push(<FaStar key={i} className="star star-filled" />);
    } else if (value >= i - 0.5) {
      stars.push(<FaStarHalfAlt key={i} className="star star-half" />);
    } else {
      stars.push(<FaRegStar key={i} className="star star-empty" />);
    }
  }

  return (
    <div className="rating">
      {stars}
      {numReviews !== undefined && (
        <span className="rating-text">({numReviews})</span>
      )}
    </div>
  );
};

export default Rating;
