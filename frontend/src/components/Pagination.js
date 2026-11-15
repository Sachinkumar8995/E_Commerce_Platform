import React from 'react';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

/**
 * Pagination – page number buttons with prev/next navigation.
 * @param {number} page – current page (1-based)
 * @param {number} pages – total number of pages
 * @param {function} onPageChange – callback(pageNum)
 */
const Pagination = ({ page, pages, onPageChange }) => {
  if (pages <= 1) return null;

  // Build array of page numbers, showing at most 5 around the current page
  const getPageNumbers = () => {
    const nums = [];
    let start = Math.max(1, page - 2);
    let end = Math.min(pages, page + 2);

    // Ensure we always show 5 pages when possible
    if (end - start < 4) {
      if (start === 1) {
        end = Math.min(pages, start + 4);
      } else if (end === pages) {
        start = Math.max(1, end - 4);
      }
    }

    for (let i = start; i <= end; i++) {
      nums.push(i);
    }
    return nums;
  };

  const pageNumbers = getPageNumbers();

  return (
    <nav className="pagination">
      <button
        className="pagination-btn"
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Previous page"
      >
        <FiChevronLeft />
      </button>

      {pageNumbers[0] > 1 && (
        <>
          <button className="pagination-btn" onClick={() => onPageChange(1)}>
            1
          </button>
          {pageNumbers[0] > 2 && <span className="pagination-dots">…</span>}
        </>
      )}

      {pageNumbers.map((num) => (
        <button
          key={num}
          className={`pagination-btn ${num === page ? 'active' : ''}`}
          onClick={() => onPageChange(num)}
        >
          {num}
        </button>
      ))}

      {pageNumbers[pageNumbers.length - 1] < pages && (
        <>
          {pageNumbers[pageNumbers.length - 1] < pages - 1 && (
            <span className="pagination-dots">…</span>
          )}
          <button className="pagination-btn" onClick={() => onPageChange(pages)}>
            {pages}
          </button>
        </>
      )}

      <button
        className="pagination-btn"
        onClick={() => onPageChange(page + 1)}
        disabled={page === pages}
        aria-label="Next page"
      >
        <FiChevronRight />
      </button>
    </nav>
  );
};

export default Pagination;
