'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, Table, TableBody, TableCell, 
  TableContainer, TableHead, TableRow, TextField, Button, Chip, Dialog,
  DialogTitle, DialogContent, DialogActions, IconButton, Tooltip, MenuItem, Select, FormControl, InputLabel, Grid
} from '@mui/material';
import { Add, WarningAmber, Edit as EditIcon, Delete as DeleteIcon, Science, LocalShipping, AddBusiness, Store, Warehouse } from '@mui/icons-material';
import { useInventoryStore } from '@/store/useInventoryStore';
import ProductRecipeModal from '@/components/dialogs/ProductRecipeModal';
import BranchTransferModal from '@/components/dialogs/BranchTransferModal';
import StockAdjustmentModal from '@/components/dialogs/StockAdjustmentModal';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 2.5 }}>{children}</Box>}
    </div>
  );
}

export default function InventoryPage() {
  const [tabValue, setTabValue] = useState(0);
  const { items, fetchInventory, updateStock, addItem, updateItem, deleteItem } = useInventoryStore();

  // Recipe, Transfer & Supply Modal States
  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [adjustmentModalOpen, setAdjustmentModalOpen] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

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
    fetchInventory();
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
    fetchInventory();
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
    fetchInventory();
  };

  // Filter items
  const filteredItems = (items || []).filter(item => {
    const matchesSearch = item.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCat = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  const lowStockCount = (items || []).filter(i => {
    const mainStock = i.branchStocks?.b_main ?? i.currentStock ?? i.current_stock ?? 0;
    const minStock = i.minStock ?? i.min_stock ?? 0;
    return mainStock <= minStock;
  }).length;

  return (
    <Box sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 8 }}>
      {/* Header & Quick Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E' }}>
            🏬 إدارة المخزن الرئيسي وجرد الخامات للفرعين
          </Typography>
          <Typography variant="body2" sx={{ color: '#6B7280', mt: 0.5, fontWeight: 600 }}>
            متابعة وتغذية رصيد الخامات للمخزن الرئيسي، فرع عزت، وفرع المسلة ({items?.length || 0} خامة)
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Button
            variant="contained"
            startIcon={<LocalShipping />}
            onClick={() => setTransferModalOpen(true)}
            sx={{ bgcolor: '#D97706', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#B45309' } }}
          >
            توزيع وصرف للفرعين 🚚
          </Button>

          <Button
            variant="contained"
            startIcon={<AddBusiness />}
            onClick={() => setAdjustmentModalOpen(true)}
            sx={{ bgcolor: '#059669', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#047857' } }}
          >
            إذن توريد / هالك 📥
          </Button>

          <Button
            variant="contained"
            startIcon={<Science />}
            onClick={() => setRecipeModalOpen(true)}
            sx={{ bgcolor: '#4F46E5', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#4338CA' } }}
          >
            ربط مكونات المنتجات 🥩
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setOpenAddDialog(true)}
            sx={{ bgcolor: '#2563EB', borderRadius: '12px', px: 2.5, py: 1.2, fontWeight: 800 }}
          >
            إضافة خامة جديدة
          </Button>
        </Box>
      </Box>

      {/* KPI Overview Cards */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#EEF2FF', border: '1.5px solid #C7D2FE', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#4F46E5', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Warehouse sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>أصناف المخزن الرئيسي</Typography>
              <Typography variant="h5" fontWeight={900} color="#1E1B4B">{items?.length || 0} صنف</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#FEF3C7', border: '1.5px solid #FDE68A', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#D97706', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>موقع فرع عزت 🏛️</Typography>
              <Typography variant="h5" fontWeight={900} color="#78350F">نشط متصل</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: '#ECFDF5', border: '1.5px solid #A7F3D0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: '#059669', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Store sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>موقع فرع المسلة 🏢</Typography>
              <Typography variant="h5" fontWeight={900} color="#064E3B">نشط متصل</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={{ p: 2, borderRadius: '16px', bgcolor: lowStockCount > 0 ? '#FEF2F2' : '#F0FDF4', border: '1.5px solid', borderColor: lowStockCount > 0 ? '#FECACA' : '#BBF7D0', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 46, height: 46, borderRadius: '12px', bgcolor: lowStockCount > 0 ? '#DC2626' : '#16A34A', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WarningAmber sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>تنبيهات نقص الرصيد</Typography>
              <Typography variant="h5" fontWeight={900} color={lowStockCount > 0 ? '#991B1B' : '#166534'}>
                {lowStockCount} {lowStockCount > 0 ? 'خامات منخفضة' : 'كل الأرصدة آمنة'}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Filter and Tabs Section */}
      <Paper sx={{ width: '100%', borderRadius: '16px', border: '1px solid #E5E7EB', p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" sx={{ '& .MuiTab-root': { fontWeight: 800 } }}>
            <Tab label="📊 أرصدة المخزن الرئيسي والفرعين (Stock Matrix)" />
            <Tab label={`⚠️ الخامات منخفضة الرصيد (${lowStockCount})`} />
          </Tabs>

          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="ابحث عن خامة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              sx={{ width: 200, '& input': { fontWeight: 700 } }}
            />

            <FormControl size="small" sx={{ width: 150 }}>
              <InputLabel sx={{ fontWeight: 700 }}>الفئة</InputLabel>
              <Select
                value={selectedCategory}
                label="الفئة"
                onChange={(e) => setSelectedCategory(e.target.value)}
                sx={{ fontWeight: 700 }}
              >
                <MenuItem value="all">كل الفئات</MenuItem>
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
          </Box>
        </Box>
      </Paper>

      {/* Tab 1: Live Stock Matrix Table */}
      <TabPanel value={tabValue} index={0}>
        <TableContainer component={Paper} sx={{ borderRadius: '18px', border: '1px solid #E5E7EB', boxShadow: '0 4px 16px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الخامة / الصنف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#4F46E5', bgcolor: '#EEF2FF' }}>🏬 المخزن الرئيسي</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#D97706', bgcolor: '#FEF3C7' }}>🏛️ فرع عزت</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#059669', bgcolor: '#ECFDF5' }}>🏢 فرع المسلة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>إجمالي النظام</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحد الأدنى</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>تكلفة الوحدة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>حالة الرصيد</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>التحكم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredItems.map((row) => {
                const mainStock = row.branchStocks?.b_main ?? row.currentStock ?? row.current_stock ?? 0;
                const b1Stock = row.branchStocks?.b1 ?? 0;
                const b2Stock = row.branchStocks?.b2 ?? 0;
                const totalSystemStock = mainStock + b1Stock + b2Stock;

                const minStockNum = row.minStock !== undefined ? row.minStock : (row.min_stock || 0);
                const costPerUnitNum = row.costPerUnit !== undefined ? row.costPerUnit : (row.cost_per_unit || 0);
                const isLow = mainStock <= minStockNum;

                return (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontWeight: 900, color: '#1A1A2E' }}>{row.name}</TableCell>
                    <TableCell sx={{ color: '#4B5563', fontWeight: 600 }}>{row.category || 'عام'}</TableCell>
                    <TableCell sx={{ color: '#6B7280', fontWeight: 700 }}>{row.unit}</TableCell>
                    
                    {/* Main Warehouse Stock */}
                    <TableCell sx={{ bgcolor: '#F5F3FF' }}>
                      <TextField
                        type="number"
                        size="small"
                        value={mainStock}
                        onChange={(e) => handleStockChange(row.id, e.target.value)}
                        sx={{ width: 100, '& input': { fontWeight: 900, textAlign: 'center', p: 0.8, color: '#4F46E5' } }}
                      />
                    </TableCell>

                    {/* Branch 1 Stock */}
                    <TableCell sx={{ bgcolor: '#FFFBEB', fontWeight: 800, color: '#D97706' }}>
                      {b1Stock} {row.unit}
                    </TableCell>

                    {/* Branch 2 Stock */}
                    <TableCell sx={{ bgcolor: '#F0FDF4', fontWeight: 800, color: '#059669' }}>
                      {b2Stock} {row.unit}
                    </TableCell>

                    {/* Total System Stock */}
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>
                      {totalSystemStock} {row.unit}
                    </TableCell>

                    <TableCell sx={{ fontWeight: 700, color: '#6B7280' }}>{minStockNum} {row.unit}</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#2563EB' }}>{costPerUnitNum} ج.م</TableCell>
                    <TableCell>
                      <Chip
                        icon={isLow ? <WarningAmber sx={{ fontSize: '16px !important' }} /> : undefined}
                        label={isLow ? 'المخزن منخفض!' : 'رصيد آمن'}
                        size="small"
                        sx={{
                          bgcolor: isLow ? '#FEE2E2' : '#D1FAE5',
                          color: isLow ? '#991B1B' : '#065F46',
                          fontWeight: 800,
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="تعديل بيانات الخامة">
                        <IconButton color="primary" onClick={() => handleOpenEdit(row)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="حذف الخامة">
                        <IconButton color="error" onClick={() => handleOpenDelete(row)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}

              {filteredItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={11} align="center" sx={{ py: 4, color: '#64748B', fontWeight: 700 }}>
                    لا توجد خامات مسجلة تطابق البحث والتصفية 🥩
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2: Low Stock Alerts */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper} sx={{ borderRadius: '18px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#FEF2F2' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الخامة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>رصيد المخزن الرئيسي</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>رصيد فرع عزت</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>رصيد فرع المسلة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحد الأدنى للأمان</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة والتوصية</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>إجراء سريع</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(items || [])
                .filter(i => (i.branchStocks?.b_main ?? i.currentStock ?? i.current_stock ?? 0) <= (i.minStock ?? i.min_stock ?? 0))
                .map((row) => {
                  const mainStock = row.branchStocks?.b_main ?? row.currentStock ?? row.current_stock ?? 0;
                  const b1Stock = row.branchStocks?.b1 ?? 0;
                  const b2Stock = row.branchStocks?.b2 ?? 0;
                  const minStock = row.minStock ?? row.min_stock ?? 0;

                  return (
                    <TableRow key={row.id}>
                      <TableCell sx={{ fontWeight: 900, color: '#1A1A2E' }}>{row.name}</TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#DC2626' }}>{mainStock} {row.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{b1Stock} {row.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{b2Stock} {row.unit}</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{minStock} {row.unit}</TableCell>
                      <TableCell>
                        <Chip label="يلزم طلب وإعادة شراء توريد جديد" size="small" sx={{ bgcolor: '#DC2626', color: '#FFF', fontWeight: 800 }} />
                      </TableCell>
                      <TableCell align="center">
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddBusiness />}
                          onClick={() => setAdjustmentModalOpen(true)}
                          sx={{ bgcolor: '#059669', borderRadius: '8px', fontWeight: 800 }}
                        >
                          إذن توريد
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}

              {(items || []).filter(i => (i.branchStocks?.b_main ?? i.currentStock ?? i.current_stock ?? 0) <= (i.minStock ?? i.min_stock ?? 0)).length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 5, color: '#10B981', fontWeight: 700 }}>
                    جميع الخامات بالمخزن الرئيسي في مستويات أمان ممتازة 👍
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Add New Raw Material Dialog */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '18px' } } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>إضافة خامة جديدة للمخزن الرئيسي</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم الخامة (مثال: لحم بلدي)"
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
            label="رصيد المخزن الرئيسي الأولي"
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
          <Button onClick={handleAddItem} variant="contained" sx={{ borderRadius: '8px', bgcolor: '#2563EB', fontWeight: 800 }}>إضافة الخامة</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Raw Material Dialog */}
      <Dialog open={openEditDialog} onClose={() => setOpenEditDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '18px' } } }}>
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
                label="رصيد المخزن الرئيسي"
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
          <Button onClick={handleSaveEdit} variant="contained" sx={{ bgcolor: '#2563EB', fontWeight: 800 }}>حفظ التعديلات</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '18px' } } }}>
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

      {/* Product Recipe Modal */}
      <ProductRecipeModal
        open={recipeModalOpen}
        onClose={() => setRecipeModalOpen(false)}
      />

      {/* Inter-Branch / Warehouse Transfer Modal */}
      <BranchTransferModal
        open={transferModalOpen}
        onClose={() => { setTransferModalOpen(false); fetchInventory(); }}
      />

      {/* Stock Adjustment & Supply Modal */}
      <StockAdjustmentModal
        open={adjustmentModalOpen}
        onClose={() => setAdjustmentModalOpen(false)}
        onRefresh={() => fetchInventory()}
      />
    </Box>
  );
}
