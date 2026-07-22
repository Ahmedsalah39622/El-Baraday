'use client';

import { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
} from '@mui/material';
import { EditOutlined, DeleteOutlined, Add, FastfoodOutlined, CloudUploadOutlined, KeyboardArrowUp, KeyboardArrowDown } from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useProductStore } from '@/store/useProductStore';

const categoriesList = [
  { id: '1', name: 'حواوشي' },
  { id: '2', name: 'ميكسات' },
  { id: '3', name: 'مشروبات' },
  { id: '4', name: 'إضافات' },
  { id: '5', name: 'العروض' },
];

const presetImages = [
  { label: '🖼️ حواوشي ساده', url: '/images/hawawshi_sade.png' },
  { label: '🖼️ حواوشي فراخ', url: '/images/hawawshi_chicken.png' },
  { label: '🖼️ حواوشي سلامي', url: '/images/hawawshi_salami.png' },
  { label: '🖼️ حواوشي سجق', url: '/images/hawawshi_sausage.png' },
  { label: '🖼️ ميكس أجبان', url: '/images/hawawshi_mixes.png' },
  { label: '🖼️ إضافات أجبان', url: '/images/cheese_addition.png' },
  { label: '🖼️ مياه معدنية', url: '/images/mineral_water.png' },
  { label: '🖼️ بيبسي كولا', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80' },
];

export default function ProductsPage() {
  const { products, addProduct, updateProduct, deleteProduct, moveProductUp, moveProductDown } = useProductStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    id: '',
    name: '',
    categoryId: '1',
    price: 50,
    size: 'كبير',
    image: '/images/hawawshi_sade.png',
  });

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const filteredProducts = (products || []).filter((p) => {
    const matchesCategory = selectedCategory === 'All' || p.categoryId === selectedCategory;
    const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenDialog = (product = null) => {
    if (product) {
      setCurrentProduct(product);
    } else {
      setCurrentProduct({
        id: '',
        name: '',
        categoryId: '1',
        price: 50,
        size: 'كبير',
        image: '/images/hawawshi_sade.png',
      });
    }
    setDialogOpen(true);
  };

  const handleFileUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct((prev) => ({
          ...prev,
          image: reader.result, // Base64 Data URL for instant local display
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!currentProduct.name.trim()) return;

    if (currentProduct.id) {
      updateProduct(currentProduct.id, currentProduct);
    } else {
      addProduct({
        ...currentProduct,
        id: `p_${Date.now()}`,
      });
    }
    setDialogOpen(false);
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (itemToDelete) {
      deleteProduct(itemToDelete);
    }
    setDeleteDialogOpen(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyCenter: 'center' }}>
            <FastfoodOutlined sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
              إدارة المنتجات والمنيو
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إضافة وتعديل أصناف حواوشي البرادعي، الأسعار، الصور والأحجام
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث باسم المنتج..." />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
          >
            إضافة منتج جديد
          </Button>
        </Box>
      </Box>

      {/* Category Tabs Filter */}
      <Paper sx={{ borderRadius: '14px', border: '1px solid #E5E7EB', p: 0.5 }}>
        <Tabs
          value={selectedCategory}
          onChange={(e, val) => setSelectedCategory(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 700,
              fontSize: '0.95rem',
              borderRadius: '10px',
              minHeight: 44,
            },
            '& .Mui-selected': {
              color: '#4285F4 !important',
            },
          }}
        >
          <Tab label="الكل" value="All" />
          {categoriesList.map((c) => (
            <Tab key={c.id} label={c.name} value={c.id} />
          ))}
        </Tabs>
      </Paper>

      {/* Products Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>الصورة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>اسم المنتج</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>التصنيف</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحجم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>السعر</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>الترتيب</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((row, idx) => (
              <TableRow key={row.id}>
                <TableCell>
                  <Box
                    component="img"
                    src={row.image || '/images/hawawshi_sade.png'}
                    alt={row.name}
                    sx={{ width: 52, height: 52, borderRadius: '12px', objectFit: 'cover', bgcolor: '#FFF8F0', border: '1px solid #E5E7EB' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>{row.name}</TableCell>
                <TableCell sx={{ color: '#6B7280', fontWeight: 600 }}>
                  {categoriesList.find((c) => c.id === row.categoryId)?.name || row.categoryId}
                </TableCell>
                <TableCell>
                  <Chip
                    label={row.size || 'كبير'}
                    size="small"
                    sx={{ bgcolor: '#F3F4F6', color: '#1A1A2E', fontWeight: 700 }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#4285F4', fontSize: '1rem' }}>
                  {row.price} ج.م
                </TableCell>
                <TableCell>
                  <Chip label="متاح" size="small" sx={{ bgcolor: '#D1FAE5', color: '#065F46', fontWeight: 700 }} />
                </TableCell>
                <TableCell align="center">
                  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, bgcolor: '#F8FAFC', p: 0.5, borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                    <IconButton
                      size="small"
                      onClick={() => moveProductUp(row.id)}
                      disabled={idx === 0}
                      sx={{ color: '#4285F4', p: 0.3 }}
                    >
                      <KeyboardArrowUp sx={{ fontSize: 20 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => moveProductDown(row.id)}
                      disabled={idx === filteredProducts.length - 1}
                      sx={{ color: '#4285F4', p: 0.3 }}
                    >
                      <KeyboardArrowDown sx={{ fontSize: 20 }} />
                    </IconButton>
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => handleOpenDialog(row)} sx={{ color: '#4285F4' }}>
                    <EditOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton color="error" onClick={() => handleDeleteClick(row.id)} sx={{ color: '#EF4444' }}>
                    <DeleteOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {filteredProducts.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: '#9CA3AF' }}>
                  لا يوجد منتجات في هذا التصنيف
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Product Modal */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle component="div" sx={{ fontWeight: 800, pt: 3 }}>
          {currentProduct.id ? 'تعديل بيانات المنتج' : 'إضافة منتج حواوشي جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>

            {/* Live Image Preview */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#FAFBFC', p: 2, borderRadius: '14px', border: '1px dashed #E5E7EB' }}>
              <Box
                component="img"
                src={currentProduct.image || '/images/hawawshi_sade.png'}
                alt="Preview"
                sx={{ width: 72, height: 72, borderRadius: '14px', objectFit: 'cover', border: '1px solid #E5E7EB' }}
              />
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>معاينة صورة المنتج</Typography>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>يمكنك اختيار صورة من جهازك مباشرة</Typography>
              </Box>
            </Box>

            {/* Direct Device File Upload Button */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadOutlined />}
                sx={{
                  py: 1.2,
                  borderRadius: '12px',
                  fontWeight: 700,
                  borderColor: '#4285F4',
                  color: '#4285F4',
                  bgcolor: 'rgba(66, 133, 244, 0.04)',
                  '&:hover': {
                    bgcolor: 'rgba(66, 133, 244, 0.1)',
                    borderColor: '#2B6FD4',
                  },
                }}
              >
                📁 رفع صورة من جهازك (Upload Image)
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleFileUpload}
                />
              </Button>
            </Box>

            {/* Product Name */}
            <TextField
              fullWidth
              label="اسم المنتج"
              placeholder="مثال: حواوشي سجق وسلايس جودا"
              value={currentProduct.name}
              onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
            />

            {/* Category Select */}
            <FormControl fullWidth>
              <InputLabel>التصنيف</InputLabel>
              <Select
                value={currentProduct.categoryId || '1'}
                label="التصنيف"
                onChange={(e) => setCurrentProduct({ ...currentProduct, categoryId: e.target.value })}
              >
                {categoriesList.map((c) => (
                  <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Price & Size */}
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="السعر (ج.م)"
                value={currentProduct.price}
                onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
              />

              <TextField
                fullWidth
                label="الحجم"
                placeholder="صغير / كبير / وسط"
                value={currentProduct.size || 'كبير'}
                onChange={(e) => setCurrentProduct({ ...currentProduct, size: e.target.value })}
              />
            </Box>

            {/* Image Selection Presets */}
            <FormControl fullWidth size="small">
              <InputLabel>أو اختر من صور المنيو المجهزة</InputLabel>
              <Select
                value={currentProduct.image || '/images/hawawshi_sade.png'}
                label="أو اختر من صور المنيو المجهزة"
                onChange={(e) => setCurrentProduct({ ...currentProduct, image: e.target.value })}
              >
                {!presetImages.some((img) => img.url === currentProduct.image) && currentProduct.image && (
                  <MenuItem value={currentProduct.image}>
                    📷 صورة مرفوعة من الجهاز / مخصصة
                  </MenuItem>
                )}
                {presetImages.map((img) => (
                  <MenuItem key={img.url} value={img.url}>{img.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Custom URL Option */}
            <TextField
              fullWidth
              size="small"
              label="أو ادخل رابط صورة خاص (Custom Image URL)"
              placeholder="https://..."
              value={currentProduct.image || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, image: e.target.value })}
            />

          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ borderRadius: '10px' }}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#4285F4', borderRadius: '10px', px: 4, py: 1, fontWeight: 800 }}>
            حفظ المنتج
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle component="div" sx={{ fontWeight: 800 }}>تأكيد الحذف</DialogTitle>
        <DialogContent>
          <Typography variant="body1">هل أنت متأكد من حذف هذا المنتج نهائياً من القائمة؟</Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={confirmDelete} sx={{ borderRadius: '10px' }}>
            حذف المنتج
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
