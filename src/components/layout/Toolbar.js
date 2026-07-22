'use client';

import { Paper, Button, Divider, Box } from '@mui/material';
import {
  PowerSettingsNew,
  CardGiftcard,
  PointOfSale,
  ShoppingCart,
  PriceCheck,
  DeliveryDining,
  MiscellaneousServices
} from '@mui/icons-material';

export default function Toolbar() {
  return (
    <Paper 
      square 
      elevation={3} 
      sx={{ 
        borderTop: 1, 
        borderColor: 'divider',
        bgcolor: 'background.paper',
        p: 1
      }}
    >
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Button color="error" variant="text" startIcon={<PowerSettingsNew />}>
          تغليق الشيفت
        </Button>
        <Divider orientation="vertical" flexItem />
        <Button color="inherit" variant="text" startIcon={<CardGiftcard />}>
          عرض الهدية
        </Button>
        <Button color="inherit" variant="text" startIcon={<PointOfSale />}>
          فتح الدرج
        </Button>
        <Button color="inherit" variant="text" startIcon={<ShoppingCart />}>
          المشتريات
        </Button>
        <Divider orientation="vertical" flexItem />
        <Button color="inherit" variant="text" startIcon={<PriceCheck />}>
          قائمة الأسعار
        </Button>
        <Button color="primary" variant="text" startIcon={<DeliveryDining />}>
          دليفري
        </Button>
        <Button color="inherit" variant="text" startIcon={<MiscellaneousServices />}>
          الخدمات
        </Button>
      </Box>
    </Paper>
  );
}
