'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import { Add, Save, WarningAmber, Edit as EditIcon, Delete as DeleteIcon, Science, LocalShipping } from '@mui/icons-material';
import { useInventoryStore } from '@/store/useInventoryStore';
import ProductRecipeModal from '@/components/dialogs/ProductRecipeModal';
import BranchTransferModal from '@/components/dialogs/BranchTransferModal';

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
  const { items, fetchInventory, updateStock, addItem, updateItem, deleteItem } = useInventoryStore();

  // Recipe & Transfer Modal States
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);

  // Add Dialog State
  const [openAddDialog, setOpenAddDialog] = useState(false);
  const [newItemData, setNewItemData] = useState({
    name: '',
    unit: 'كجم',
    currentStock: 10,
    minStock: 5,
    costPerUnit: 100,
    category: 'لحوم'
  });

  // Edit Dialog State
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  // Delete Dialog State
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);

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
    setNewItemData({ name: '', unit: 'كجم', currentStock: 10, minStock: 5, costPerUnit: 100, category: 'لحوم' });
  };

  const handleOpenEdit = (item) => {
    setEditingItem({
      id: item.id,
      name: item.name || '',
      unit: item.unit || 'كجم',
      currentStock: item.currentStock !== undefined ? item.currentStock : (item.current_stock || 0),
      minStock: item.minStock !== undefined ? item.minStock : (item.min_stock || 0),
      costPerUnit: item.costPerUnit !== undefined ? item.costPerUnit : (item.cost_per_unit || 0),
      category: item.category || 'عام'
    });
    setOpenEditDialog(true);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editingItem.name.trim()) return;
    await updateItem(editingItem.id, {
      name: editingItem.name.trim(),
      unit: editingItem.unit,
      currentStock: parseFloat(editingItem.currentStock) || 0,
      minStock: parseFloat(editingItem.minStock) || 0,
      costPerUnit: parseFloat(editingItem.costPerUnit) || 0,
      category: editingItem.category
    });
    setOpenEditDialog(false);
    setEditingItem(null);
  };

  const handleOpenDelete = (item) => {
    setDeletingItem(item);
    setOpenDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    await deleteItem(deletingItem.id);
    setOpenDeleteDialog(false);
    setDeletingItem(null);
  };

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 8 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
            إدارة جرد المخزن والمواد الخام
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5 }}>
            متابعة رصيد اللحوم، الفراخ، الأجبان، الخضار، والعيش البلدي ({items?.length || 0} صنف)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<LocalShipping />}
            onClick={() => setTransferModalOpen(true)}
            sx={{ bgcolor: '#D97706', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800, '&:hover': { bgcolor: '#B45309' } }}
          >
            تحويل خامات بين الفروع 🚚
          </Button>

          <Button
            variant="contained"
            startIcon={<Science />}
            onClick={() => setRecipeModalOpen(true)}
            sx={{ bgcolor: '#4F46E5', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800, '&:hover': { bgcolor: '#4338CA' } }}
          >
            ربط الخامات بالمنتجات والمكسات 🥩
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddDialog(true)}
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800 }}
          >
            إضافة خامة جديدة
          </Button>
        </Box>
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
                <TableCell align="center" sx={{ fontWeight: 800 }}>التحكم والتعديل</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || []).map((row) => {
                const currentStockNum = row.currentStock !== undefined ? row.currentStock : (row.current_stock || 0);
                const minStockNum = row.minStock !== undefined ? row.minStock : (row.min_stock || 0);
                const costPerUnitNum = row.costPerUnit !== undefined ? row.costPerUnit : (row.cost_per_unit || 0);
                const isLow = currentStockNum <= minStockNum;

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>{row.category || 'عام'}</TableCell>
                    <TableCell sx={{ color: '#6B7280' }}>{row.unit}</TableCell>
                    <TableCell>
                      <TextField
                        type="number"
                        size="small"
                        value={currentStockNum}
                        onChange={(e) => handleStockChange(row.id, e.target.value)}
                        sx={{ width: 110, '& input': { fontWeight: 800, textAlign: 'center', p: 0.8 } }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 700, color: '#6B7280' }}>{minStockNum} {row.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#4285F4' }}>{costPerUnitNum} ج.م</TableCell>
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
                    <TableCell align="center">
                      <Tooltip title="تعديل تفاصيل الخامة">
                        <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف الخامة نهائياً">
                        <IconButton color="error" onClick={() => handleOpenDelete(row)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
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
                <TableCell align="center" sx={{ fontWeight: 800 }}>إجراء سريع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || []).filter(i => (i.currentStock !== undefined ? i.currentStock : (i.current_stock || 0)) <= (i.minStock !== undefined ? i.minStock : (i.min_stock || 0))).map((row) => {
                const currentStockNum = row.currentStock !== undefined ? row.currentStock : (row.current_stock || 0);
                const minStockNum = row.minStock !== undefined ? row.minStock : (row.min_stock || 0);
                return (
                  <TableRow key={row.id}>
                    <TableCell sx={{ fontWeight: 800 }}>{row.name}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#EF4444' }}>{currentStockNum} {row.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>{minStockNum} {row.unit}</TableCell>
                    <TableCell>
                      <Chip label="يلزم إعادة الطلب والشراء فوراً" size="small" sx={{ bgcolor: '#EF4444', color: '#FFF', fontWeight: 800 }} />
                    </TableCell>
                    <TableCell align="center">
                      <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                        <EditIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}

              {(items || []).filter(i => (i.currentStock !== undefined ? i.currentStock : (i.current_stock || 0)) <= (i.minStock !== undefined ? i.minStock : (i.min_stock || 0))).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 5, color: '#10B981', fontWeight: 700 }}>
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
          <FormControl fullWidth size="small">
            <InputLabel>الفئة</InputLabel>
            <Select
              value={newItemData.category}
              label="الفئة"
              onChange={(e) => setNewItemData({ ...newItemData, category: e.target.value })}
            >
              <MenuItem value="لحوم">لحوم</MenuItem>
              <MenuItem value="دواجن">دواجن</MenuItem>
              <MenuItem value="أجبان">أجبان</MenuItem>
              <MenuItem value="خضروات">خضروات</MenuItem>
              <MenuItem value="عجائن">عجائن</MenuItem>
              <MenuItem value="مخبوزات">مخبوزات</MenuItem>
              <MenuItem value="مصنعات">مصنعات</MenuItem>
              <MenuItem value="زيوت">زيوت</MenuItem>
              <MenuItem value="عام">عام</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="الوحدة (كجم / جرام / لتر / رغيف / قطعة)"
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
          <Button onClick={handleAddItem} variant="contained" sx={{ borderRadius: '8px', bgcolor: '#4285F4', fontWeight: 800 }}>إضافة الخامة</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Raw Material Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>✏️ تعديل بيانات الخامة</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {editingItem && (
            <>
              <TextField
                fullWidth
                size="small"
                label="اسم الخامة"
                value={editingItem.name}
                onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>الفئة</InputLabel>
                <Select
                  value={editingItem.category}
                  label="الفئة"
                  onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                >
                  <MenuItem value="لحوم">لحوم</MenuItem>
                  <MenuItem value="دواجن">دواجن</MenuItem>
                  <MenuItem value="أجبان">أجبان</MenuItem>
                  <MenuItem value="خضروات">خضروات</MenuItem>
                  <MenuItem value="عجائن">عجائن</MenuItem>
                  <MenuItem value="مخبوزات">مخبوزات</MenuItem>
                  <MenuItem value="مصنعات">مصنعات</MenuItem>
                  <MenuItem value="زيوت">زيوت</MenuItem>
                  <MenuItem value="عام">عام</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="الوحدة"
                value={editingItem.unit}
                onChange={(e) => setEditingItem({ ...editingItem, unit: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                size="small"
                label="الرصيد الحالي"
                value={editingItem.currentStock}
                onChange={(e) => setEditingItem({ ...editingItem, currentStock: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                size="small"
                label="الحد الأدنى الأمان"
                value={editingItem.minStock}
                onChange={(e) => setEditingItem({ ...editingItem, minStock: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                size="small"
                label="تكلفة الوحدة (ج.م)"
                value={editingItem.costPerUnit}
                onChange={(e) => setEditingItem({ ...editingItem, costPerUnit: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenEditDialog(false)}>إلغاء</Button>
          <Button onClick={handleSaveEdit} variant="contained" sx={{ bgcolor: '#4285F4', fontWeight: 800 }}>حفظ التعديلات</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#DC2626' }}>🗑️ تأكيد حذف الخامة</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            هل أنت تأكد من رغبتك في حذف الخامة <b>({deletingItem?.name})</b> نهائياً من المخزن؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>إلغاء</Button>
          <Button onClick={handleConfirmDelete} variant="contained" color="error" sx={{ fontWeight: 800 }}>تأكيد الحذف</Button>
        </DialogActions>
      </Dialog>

      {/* Product Recipe & Raw Materials Management Modal */}
      <ProductRecipeModal
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
      />

      {/* Inter-Branch Raw Material Transfer Modal */}
      <BranchTransferModal
        open={transferModalOpen}
        onClose={() => setTransferModalOpen(false)}
      />
    </Box>
  );
}
