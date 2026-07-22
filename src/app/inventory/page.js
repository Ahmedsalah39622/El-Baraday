'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip
} from '@mui/material';
import { Add, Save, WarningAmber } from '@mui/icons-material';
import { useInventoryStore } from '@/store/useInventoryStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function InventoryPage() {
  const [tabValue, setTabValue] = useState(0);
  const { items, fetchInventory, updateStock, addItem } = useInventoryStore();

  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: 'كيلو',
    currentStock: 10,
    minStock: 5,
    costPerUnit: 100,
    category: 'لحوم'
  });

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleStockChange = (id, val) => {
    const qty = parseFloat(val) || 0;
    updateStock(id, qty);
  };

  const handleAddItem = async () => {
    if (!newItemData.name.trim()) return;
    await addItem({
      name: newItemData.name.trim(),
      unit: newItemData.unit,
      currentStock: parseFloat(newItemData.currentStock) || 0,
      minStock: parseFloat(newItemData.minStock) || 0,
      costPerUnit: parseFloat(newItemData.costPerUnit) || 0,
      category: newItemData.category
    });
    setOpenAddDialog(false);
    setNewItemData({ name: '', unit: 'كيلو', currentStock: 10, minStock: 5, costPerUnit: 100, category: 'لحوم' });
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            إدارة جرد المخزن والمواد الخام
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            متابعة رصيد اللحوم، الفراخ، الخضار، والعيش البلدي ({items?.length || 0} صنف)
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenAddDialog(true)}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700 }}
        >
          إضافة خامة جديدة
        </Button>
      </Box>

      <Paper sx={{ width: '100%', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="الجرد الحي رصيد الخامات" sx={{ fontWeight: 700 }} />
          <Tab label="الخامات منخفضة الرصيد (تنبيه)" sx={{ fontWeight: 700 }} />
        </Tabs>
      </Paper>

      {/* Tab 1: Live Stock Inventory */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الخامة / الصنف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الرصيد الحالي</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحد الأدنى</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>تكلفة الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>حالة الرصيد</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || []).map((row) => {
                const isLow = row.currentStock <= row.minStock;
                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>{row.category}</TableCell>
                    <TableCell sx={{ color: '#6B7280' }}>{row.unit}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={row.currentStock}
                        onChange={(e) => handleStockChange(row.id, e.target.value)}
                        sx={{ width: 110, '& input': { fontWeight: 800, textAlign: 'center', p: 0.8 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#6B7280' }}>{row.minStock} {row.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#4285F4' }}>{row.costPerUnit} ج.م</TableCell>
                    <TableCell>
                      <Chip
                        icon={isLow ? <WarningAmber sx={{ fontSize: '16px !important' }} /> : undefined}
                        label={isLow ? 'رصيد منخفض!' : 'رصيد آمن'}
                        size="small"
                        sx={{
                          bgcolor: isLow ? '#FEE2E2' : '#D1FAE5',
                          color: isLow ? '#991B1B' : '#065F46',
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2: Low Stock Items */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#FEF2F2' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الخامة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الرصيد المتبقي</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحد الأدنى الأمان</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || []).filter(i => i.currentStock <= i.minStock).map((row) => (
                <TableRow key={row.id}>
                  <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#EF4444' }}>{row.currentStock} {row.unit}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{row.minStock} {row.unit}</TableCell>
                  <TableCell>
                    <Chip label="يلزم إعادة الطلب والشراء فوراً" size="small" sx={{ bgcolor: '#EF4444', color: '#FFF', fontWeight: 800 }} />
                  </TableCell>
                </TableRow>
              ))}

              {(items || []).filter(i => i.currentStock <= i.minStock).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ py: 5, color: '#10B981', fontWeight: 700 }}>
                    جميع الخامات في المستويات الآمنة 👍
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Add New Raw Material Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>إضافة خامة جديدة للمخزن</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم الخامة (مثال: لحم مفروم)"
            value={newItemData.name}
            onChange={(e) => setNewItemData({ ...newItemData, name: e.target.value })}
          />
          <TextField
            fullWidth
            size="small"
            label="الوحدة (كيلو / لتر / رغيف)"
            value={newItemData.unit}
            onChange={(e) => setNewItemData({ ...newItemData, unit: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="الرصيد الحالي"
            value={newItemData.currentStock}
            onChange={(e) => setNewItemData({ ...newItemData, currentStock: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="الحد الأدنى الأمان"
            value={newItemData.minStock}
            onChange={(e) => setNewItemData({ ...newItemData, minStock: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="تكلفة الوحدة (ج.م)"
            value={newItemData.costPerUnit}
            onChange={(e) => setNewItemData({ ...newItemData, costPerUnit: e.target.value })}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenAddDialog(false)} variant="outlined" sx={{ borderRadius: '8px' }}>إلغاء</Button>
          <Button onClick={handleAddItem} variant="contained" sx={{ borderRadius: '8px', bgcolor: '#4285F4' }}>إضافة الخامة</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
