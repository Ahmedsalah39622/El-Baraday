'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Box, Typography, Button, IconButton, Paper } from '@mui/material';
import { ArrowBack, DragIndicator, EditOutlined, DeleteOutlined } from '@mui/icons-material';

const mockOrder1 = [
  { id: '1', name: 'حواوشي مشكل جبن', extras: 'مستردة إضافية', notes: 'بدون كاتشب', quantity: 2, price: 250 },
  { id: '2', name: 'حواوشي لحم كبيـر', extras: 'جبنة شيدر', notes: 'سبيسي', quantity: 1, price: 120 },
];

const mockOrder2 = [
  { id: '3', name: 'حواوشي فراخ صغير', extras: 'بيبسي 1L', notes: '', quantity: 1, price: 90 },
];

export default function SplitOrderPage() {
  const router = useRouter();
  const [splitCount, setSplitCount] = useState(2);

  return (
    <Box sx={{ p: 4, bgcolor: '#FDF6EC', minHeight: '100vh', display: 'flex', flexDirection: 'column', gap: 3 }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => router.back()}>
          <IconButton size="small" sx={{ bgcolor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <ArrowBack sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            تقسيم الطلب
          </Typography>
        </Box>

        {/* Split Counter */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, bgcolor: '#FFFFFF', p: 1, px: 2, borderRadius: '12px', border: '1px solid #E5E7EB' }}>
          <Typography variant="body2" sx={{ color: '#6B7280' }}>عدد الأوردرات المقسمة</Typography>
          <Box sx={{ bgcolor: '#EF4444', color: '#FFFFFF', borderRadius: '50%', width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700 }}>
            {splitCount}
          </Box>
          <Box sx={{ display: 'flex', gap: 0.5, mr: 1 }}>
            <button className="qty-btn minus" onClick={() => setSplitCount(Math.max(2, splitCount - 1))}>-</button>
            <button className="qty-btn plus" onClick={() => setSplitCount(splitCount + 1)}>+</button>
          </Box>
        </Box>
      </Box>

      {/* Side-by-Side Orders */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 3, flex: 1 }}>
        {/* Order 01 */}
        <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>الطلب 01</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#4285F4' }}>370 ج.م</Typography>
          </Box>

          <Box sx={{ bgcolor: '#FAFBFC', border: '1px dashed #E5E7EB', borderRadius: '12px', p: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>رقم الطلب: #345672</Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>التاريخ: أبريل 28, 2024</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
            {mockOrder1.map((item) => (
              <Box key={item.id} sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #F3F4F6', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DragIndicator sx={{ color: '#D1D5DB', cursor: 'grab' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  {item.extras && <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>{item.extras}</Typography>}
                  {item.notes && <Typography variant="caption" sx={{ display: 'block', color: '#EF4444' }}>{item.notes}</Typography>}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.price} ج.م</Typography>
                <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteOutlined sx={{ fontSize: 18 }} /></IconButton>
              </Box>
            ))}
          </Box>
        </Paper>

        {/* Order 02 */}
        <Paper sx={{ p: 2.5, borderRadius: '20px', border: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6" sx={{ fontWeight: 800 }}>الطلب 02</Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#4285F4' }}>90 ج.م</Typography>
          </Box>

          <Box sx={{ bgcolor: '#FAFBFC', border: '1px dashed #E5E7EB', borderRadius: '12px', p: 1.5, display: 'flex', justifyContent: 'space-between' }}>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>رقم الطلب: #345672</Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>التاريخ: أبريل 28, 2024</Typography>
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, flex: 1 }}>
            {mockOrder2.map((item) => (
              <Box key={item.id} sx={{ p: 1.5, borderRadius: '12px', border: '1px solid #F3F4F6', bgcolor: '#FFFFFF', display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <DragIndicator sx={{ color: '#D1D5DB', cursor: 'grab' }} />
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.name}</Typography>
                  {item.extras && <Typography variant="caption" sx={{ display: 'block', color: '#9CA3AF' }}>{item.extras}</Typography>}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{item.price} ج.م</Typography>
                <IconButton size="small" sx={{ color: '#EF4444' }}><DeleteOutlined sx={{ fontSize: 18 }} /></IconButton>
              </Box>
            ))}
          </Box>
        </Paper>
      </Box>

      {/* Done Button */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button
          variant="contained"
          onClick={() => router.push('/')}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 5, py: 1.2, fontWeight: 700, fontSize: '1rem' }}
        >
          تم
        </Button>
      </Box>
    </Box>
  );
}
