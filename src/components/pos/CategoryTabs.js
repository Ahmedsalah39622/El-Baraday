'use client';

import { Box } from '@mui/material';
import { Home } from '@mui/icons-material';

const categories = [
  { id: 'all', name: 'الكل', icon: null },
  { id: '1', name: 'حواوشي', icon: '🍔' },
  { id: '2', name: 'ميكسات', icon: '🍕' },
  { id: '3', name: 'مشروبات', icon: '🥤' },
  { id: '4', name: 'إضافات', icon: '🍟' },
  { id: '5', name: 'العروض', icon: '🏷️' },
];

export default function CategoryTabs({ selectedCategory, onSelectCategory }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflowX: 'auto', py: 1, px: 0.5, '::-webkit-scrollbar': { display: 'none' } }}>
      {/* Home Icon pill */}
      <Box
        onClick={() => onSelectCategory('all')}
        sx={{
          width: 42,
          height: 42,
          borderRadius: '14px',
          bgcolor: selectedCategory === 'all' ? '#4285F4' : '#FFFFFF',
          color: selectedCategory === 'all' ? '#FFFFFF' : '#6B7280',
          border: '1.5px solid',
          borderColor: selectedCategory === 'all' ? '#4285F4' : '#E5E7EB',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          flexShrink: 0,
          transition: 'all 0.2s ease',
          boxShadow: selectedCategory === 'all' ? '0 4px 12px rgba(66, 133, 244, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
          '&:hover': {
            bgcolor: '#4285F4',
            color: '#FFFFFF',
            borderColor: '#4285F4',
          },
        }}
      >
        <Home sx={{ fontSize: 22 }} />
      </Box>

      {/* Category Pills */}
      {categories.map((cat) => {
        const isActive = selectedCategory === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelectCategory(cat.id)}
            className={`category-pill ${isActive ? 'active' : ''}`}
            suppressHydrationWarning
            style={{
              padding: '10px 22px',
              fontSize: '1rem',
              fontWeight: 700,
              fontFamily: 'Cairo, sans-serif',
              letterSpacing: '0.02em',
              boxShadow: isActive ? '0 4px 12px rgba(66, 133, 244, 0.3)' : '0 2px 6px rgba(0,0,0,0.04)',
            }}
          >
            {cat.icon && <span style={{ fontSize: '1.1rem' }}>{cat.icon}</span>}
            <span>{cat.name}</span>
          </button>
        );
      })}
    </Box>
  );
}
