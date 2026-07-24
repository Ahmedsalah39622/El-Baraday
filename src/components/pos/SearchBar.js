'use client';

import { Box } from '@mui/material';
import { Search } from '@mui/icons-material';

export default function SearchBar({ value, onChange, placeholder = "ابحث عن صنف هنا..." }) {
  return (
    <div className="search-bar">
      <Search sx={{ color: '#9CA3AF', fontSize: 20 }} />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        suppressHydrationWarning
      />
    </div>
  );
}
