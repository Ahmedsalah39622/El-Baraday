'use client';

import React from 'react';
import { 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, 
  Paper, IconButton, Typography, Box 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteIcon from '@mui/icons-material/Delete';
import { formatCurrency } from '@/utils/formatters';

export default function OrderTable({ 
  items = [], 
  onUpdateQuantity, 
  onRemoveItem, 
  onSelectItem, 
  selectedItemId 
}) {
  const subtotal = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: '100%', overflow: 'auto' }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell align="center" sx={{ width: '5%' }}>#</TableCell>
            <TableCell align="center" sx={{ width: '25%' }}>الكمية</TableCell>
            <TableCell align="right" sx={{ width: '35%' }}>المنتج</TableCell>
            <TableCell align="center" sx={{ width: '15%' }}>السعر</TableCell>
            <TableCell align="center" sx={{ width: '15%' }}>الإجمالي</TableCell>
            <TableCell align="center" sx={{ width: '5%' }}>حذف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                <Box sx={{ py: 4 }}>
                  <Typography variant="body1" color="text.secondary">
                    لا توجد أصناف في الطلب
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const isSelected = item.id === selectedItemId;
              const total = item.price * item.quantity;
              
              return (
                <TableRow 
                  key={item.id}
                  onClick={() => onSelectItem && onSelectItem(item.id)}
                  sx={{ 
                    cursor: 'pointer',
                    backgroundColor: isSelected ? 'action.selected' : 'inherit',
                    '&:hover': {
                      backgroundColor: 'action.hover',
                    }
                  }}
                >
                  <TableCell align="center">{index + 1}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity - 1); }} disabled={item.quantity <= 1}>
                        <RemoveIcon fontSize="small" />
                      </IconButton>
                      <Typography sx={{ mx: 1 }}>{item.quantity}</Typography>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); onUpdateQuantity(item.id, item.quantity + 1); }}>
                        <AddIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" fontWeight="bold">{item.nameAr}</Typography>
                    {item.sizeNameAr && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        {item.sizeNameAr}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell align="center">{formatCurrency(item.price)}</TableCell>
                  <TableCell align="center">{formatCurrency(total)}</TableCell>
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); onRemoveItem(item.id); }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })
          )}
          {items.length > 0 && (
            <TableRow>
              <TableCell colSpan={4} align="right">
                <Typography fontWeight="bold">الإجمالي الفرعي:</Typography>
              </TableCell>
              <TableCell align="center" colSpan={2}>
                <Typography fontWeight="bold" color="primary">{formatCurrency(subtotal)}</Typography>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
