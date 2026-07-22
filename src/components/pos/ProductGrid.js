'use client';

import { Box, Typography, Chip } from '@mui/material';

const defaultFoodImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'><rect width='120' height='120' rx='16' fill='%23FDF3E7'/><circle cx='60' cy='60' r='40' fill='%23FF8C42' opacity='0.8'/><circle cx='60' cy='60' r='30' fill='%23FDE047'/><circle cx='50' cy='50' r='6' fill='%23EF4444'/><circle cx='70' cy='55' r='5' fill='%2310B981'/><circle cx='60' cy='70' r='6' fill='%23EF4444'/></svg>";

export default function ProductGrid({ products = [], onSelectProduct, categoryTitle = "الأكثر مبيعاً" }) {
  return (
    <Box sx={{ flex: 1, overflowY: 'auto', pr: 0.5, pl: 0.5 }}>
      {/* Section Title */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2, color: '#1A1A2E' }}>
        {categoryTitle}
      </Typography>

      {/* Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(135px, 1fr))',
          gap: 2,
          pb: 4,
        }}
      >
        {products.map((product) => {
          const isOffer = product.isOffer || product.categoryId === '5' || (product.originalPrice && product.originalPrice > product.price);

          return (
            <Box
              key={product.id}
              onClick={() => onSelectProduct(product)}
              className="product-card animate-fade-in"
              sx={{
                position: 'relative',
                border: isOffer ? '1.5px solid #F59E0B' : '1px solid transparent',
                bgcolor: isOffer ? '#FFFDF5' : '#FFFFFF',
              }}
            >
              {/* Offer Special Discount Badge */}
              {isOffer && (
                <Chip
                  label="🏷️ عرض خاص"
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 6,
                    right: 6,
                    bgcolor: '#EF4444',
                    color: '#FFFFFF',
                    fontWeight: 800,
                    fontSize: '0.65rem',
                    height: 20,
                    zIndex: 2,
                    boxShadow: '0 2px 6px rgba(239, 68, 68, 0.4)',
                  }}
                />
              )}

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

              <Typography className="product-card-name" noWrap sx={{ fontWeight: 800 }}>
                {product.name}
              </Typography>

              {/* Offer components preview */}
              {product.offerComponents && (
                <Typography variant="caption" sx={{ color: '#F59E0B', fontWeight: 700, fontSize: '0.68rem', display: 'block', lineHeight: 1.1, my: 0.2 }} noWrap>
                  {product.offerComponents}
                </Typography>
              )}

              {/* Price & Strikethrough Original Price */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, justifyContent: 'center' }}>
                <Typography className="product-card-price" sx={{ fontWeight: 900, color: isOffer ? '#D97706' : '#4285F4' }}>
                  {product.price} ج.م
                </Typography>
                {product.originalPrice && (
                  <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#9CA3AF', fontSize: '0.75rem' }}>
                    {product.originalPrice}
                  </Typography>
                )}
              </Box>
            </Box>
          );
        })}
      </Box>
    </Box>
  );
}
