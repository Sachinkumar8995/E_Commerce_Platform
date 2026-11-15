import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo } from 'react-icons/fi';

/**
 * Message – alert component with success / error / info variants.
 * @param {string} variant – "success" | "error" | "info"
 * @param {string} children – the message text
 */
const Message = ({ variant = 'info', children }) => {
  const icons = {
    success: <FiCheckCircle />,
    error: <FiAlertCircle />,
    info: <FiInfo />,
  };

  return (
    <div className={`message message-${variant}`}>
      <span className="message-icon">{icons[variant]}</span>
      <span>{children}</span>
    </div>
  );
};

export default Message;
