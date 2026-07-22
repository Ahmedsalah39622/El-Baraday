'use client';

import { Box, Typography } from '@mui/material';

// Standard placeholder SVG food illustrations as inline data URLs or clean styled representations
const defaultFoodImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='16' fill='%23FDF3E7'/><circle cx='60' cy='60' r='40' fill='%23FF8C42' opacity='0.8'/><circle cx='60' cy='60' r='30' fill='%23FDE047'/><circle cx='50' cy='50' r='6' fill='%23EF4444'/><circle cx='70' cy='55' r='5' fill='%2310B981'/><circle cx='60' cy='70' r='6' fill='%23EF4444'/></svg>";

export default function ProductGrid({ products = [], onSelectProduct, categoryTitle = "الأكثر مبيعاً" }) {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, pl: 0.5 }}>
      {/* Section Title */}
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2, color: '#1A1A2E' }}>
        {categoryTitle}
      </Typography>

      {/* Grid: 4 columns */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
          gap: 2,
          pb: 4,
        }}
      >
        {products.map((product) => (
          <Box
            key={product.id}
            onClick={() => onSelectProduct(product)}
            className="product-card animate-fade-in"
          >
            <Box
              component="img"
              src={product.image || defaultFoodImage}
              alt={product.name}
              className="product-card-image"
              sx={{
                width: 110,
                height: 110,
                borderRadius: '16px',
                objectFit: 'cover',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                bgcolor: '#FFF8F0',
              }}
            />
            <Typography className="product-card-name" noWrap>
              {product.name}
            </Typography>
            <Typography className="product-card-price">
              {product.price} ج.م
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
