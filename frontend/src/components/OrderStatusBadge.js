import React from 'react';

/**
 * OrderStatusBadge – colored badge displaying order status.
 * Colors: placed=gray, paid=blue, packed=orange, shipped=purple, delivered=green, cancelled=red
 */
const OrderStatusBadge = ({ status }) => {
  const statusClass = status ? status.toLowerCase() : 'placed';
  return (
    <span className={`status-badge status-${statusClass}`}>
      {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown'}
    </span>
  );
};

export default OrderStatusBadge;
