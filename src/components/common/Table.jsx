import React from 'react';

const Table = ({ children, className = '' }) => {
  return (
    <div className={`table-container ${className}`}>
      <table>{children}</table>
    </div>
  );
};

export default Table;
