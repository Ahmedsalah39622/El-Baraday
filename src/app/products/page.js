'use client';

import { useState, useEffect } from 'react';
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
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  FastfoodOutlined,
  Add,
  EditOutlined,
  DeleteOutlined,
  ArrowUpwardOutlined,
  ArrowDownwardOutlined,
  CloudUploadOutlined,
  LocalOfferOutlined,
  AddShoppingCartOutlined,
} from '@mui/icons-material';
import SearchBar from '@/components/pos/SearchBar';
import { useProductStore } from '@/store/useProductStore';

const categoriesList = [
  { id: '1', name: 'حواوشي' },
  { id: '2', name: 'ميكسات' },
  { id: '3', name: 'مشروبات' },
  { id: '4', name: 'إضافات' },
  { id: '5', name: 'العروض 🔥' },
];

const presetImages = [
  { name: 'حواوشي ساده', url: '/images/hawawshi_sade.png' },
  { name: 'حواوشي فراخ', url: '/images/hawawshi_chicken.png' },
  { name: 'حواوشي سلامي', url: '/images/hawawshi_salami.png' },
  { name: 'حواوشي سجق', url: '/images/hawawshi_sausage.png' },
  { name: 'ميكس أجبان', url: '/images/hawawshi_mixes.png' },
  { name: 'إضافة جبنة', url: '/images/cheese_addition.png' },
  { name: 'مياه معدنية', url: '/images/mineral_water.png' },
  { name: 'بيبسي كولا', url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&q=80' },
  { name: 'عرض وجبة فاخرة', url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80' },
  { name: 'عرض وجبة عائلية', url: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=500&q=80' },
];

export default function ProductsPage() {
  const { products, fetchProducts, addProduct, updateProduct, deleteProduct, moveProductUp, moveProductDown } = useProductStore();
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState({
    id: '',
    name: '',
    categoryId: '1',
    price: 50,
    originalPrice: 0,
    isOffer: false,
    offerComponents: '',
    size: 'كبير',
    image: '/images/hawawshi_sade.png',
  });

  // Offer Builder State (Selecting base products & quantities)
  const [offerItemsList, setOfferItemsList] = useState([]);
  const [selectedBaseProductId, setSelectedBaseProductId] = useState('');
  const [baseProductQuantity, setBaseProductQuantity] = useState(1);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const baseProductsOnly = (products || []).filter((p) => p.categoryId !== '5' && !p.isOffer);

  const filteredProducts = (products || [])
    .filter((p) => {
      const matchesCategory = selectedCategory === 'All' || p.categoryId === selectedCategory;
      const matchesSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

  const handleOpenDialog = (product = null, isNewOffer = false) => {
    if (product) {
      setCurrentProduct({
        ...product,
        originalPrice: product.originalPrice || 0,
        isOffer: product.isOffer || product.categoryId === '5',
        offerComponents: product.offerComponents || '',
      });
      setOfferItemsList([]);
    } else if (isNewOffer) {
      setCurrentProduct({
        id: '',
        name: 'عرض جديد خيالي',
        categoryId: '5',
        price: 140,
        originalPrice: 185,
        isOffer: true,
        offerComponents: '2 حواوشي ميكس أجبان + 1 بيبسي كولا 1 لتر',
        size: 'عرض خاص',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=500&q=80',
      });
      setOfferItemsList([]);
    } else {
      setCurrentProduct({
        id: '',
        name: '',
        categoryId: '1',
        price: 50,
        originalPrice: 0,
        isOffer: false,
        offerComponents: '',
        size: 'كبير',
        image: '/images/hawawshi_sade.png',
      });
      setOfferItemsList([]);
    }
    setDialogOpen(true);
  };

  const handleAddOfferItem = () => {
    if (!selectedBaseProductId) return;
    const baseProd = products.find((p) => p.id === selectedBaseProductId);
    if (!baseProd) return;

    const newItem = {
      productId: baseProd.id,
      name: baseProd.name,
      price: baseProd.price,
      quantity: Math.max(1, baseProductQuantity),
    };

    const updatedList = [...offerItemsList, newItem];
    setOfferItemsList(updatedList);

    // Auto-calculate components text string & original price sum
    const componentsStr = updatedList.map((it) => `${it.quantity > 1 ? `${it.quantity} ` : ''}${it.name}`).join(' + ');
    const calculatedOriginalTotal = updatedList.reduce((sum, it) => sum + (it.price * it.quantity), 0);

    setCurrentProduct((prev) => ({
      ...prev,
      offerComponents: componentsStr,
      originalPrice: calculatedOriginalTotal > 0 ? calculatedOriginalTotal : prev.originalPrice,
    }));

    setSelectedBaseProductId('');
    setBaseProductQuantity(1);
  };

  const handleRemoveOfferItem = (index) => {
    const updatedList = offerItemsList.filter((_, i) => i !== index);
    setOfferItemsList(updatedList);

    const componentsStr = updatedList.map((it) => `${it.quantity > 1 ? `${it.quantity} ` : ''}${it.name}`).join(' + ');
    const calculatedOriginalTotal = updatedList.reduce((sum, it) => sum + (it.price * it.quantity), 0);

    setCurrentProduct((prev) => ({
      ...prev,
      offerComponents: componentsStr,
      originalPrice: calculatedOriginalTotal,
    }));
  };

  const handleFileUpload = (event) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCurrentProduct((prev) => ({
          ...prev,
          image: reader.result,
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!currentProduct.name.trim()) return;

    const payload = {
      ...currentProduct,
      isOffer: currentProduct.isOffer || currentProduct.categoryId === '5',
    };

    if (currentProduct.id) {
      updateProduct(currentProduct.id, payload);
    } else {
      addProduct({
        ...payload,
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
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FastfoodOutlined sx={{ fontSize: 24 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
              إدارة المنتجات والعروض
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إضافة وتعديل أصناف المنيو، العروض الخاصة، الخصومات والأسعار
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap', width: { xs: '100%', sm: 'auto' } }}>
          <SearchBar value={searchQuery} onChange={setSearchQuery} placeholder="ابحث باسم المنتج أو العرض..." />

          {/* Add Special Offer Button */}
          <Button
            variant="contained"
            startIcon={<LocalOfferOutlined />}
            onClick={() => handleOpenDialog(null, true)}
            sx={{
              bgcolor: '#F59E0B',
              '&:hover': { bgcolor: '#D97706' },
              borderRadius: '12px',
              px: 2.5,
              py: 1,
              fontWeight: 800,
              whiteSpace: 'nowrap',
              boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)',
              width: { xs: '100%', sm: 'auto' }
            }}
          >
            إضافة عرض خاص 🏷️
          </Button>

          {/* Add Product Button */}
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800, whiteSpace: 'nowrap', width: { xs: '100%', sm: 'auto' } }}
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
              fontWeight: 800,
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

      {/* Products & Offers Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', overflowX: 'auto' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#F8FAFC' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 800 }}>الصورة</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>اسم العنصر / العرض</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>التصنيف</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الحجم / مكونات العرض</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>السعر</TableCell>
              <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الترتيب</TableCell>
              <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredProducts.map((row, idx) => {
              const isOffer = row.isOffer || row.categoryId === '5' || (row.originalPrice && row.originalPrice > row.price);
              const categoryName = categoriesList.find((c) => c.id === row.categoryId)?.name || 'غير محدد';

              return (
                <TableRow key={row.id} hover sx={{ bgcolor: isOffer ? '#FFFDF5' : 'inherit' }}>
                  <TableCell>
                    <Box sx={{ position: 'relative', width: 52, height: 52 }}>
                      <Box
                        component="img"
                        src={row.image || '/images/hawawshi_sade.png'}
                        alt={row.name}
                        sx={{ width: 52, height: 52, borderRadius: '12px', objectFit: 'cover', bgcolor: '#FFF8F0', border: '1px solid #E5E7EB' }}
                      />
                      {isOffer && (
                        <Chip
                          label="عرض"
                          size="small"
                          sx={{
                            position: 'absolute',
                            top: -4,
                            right: -4,
                            bgcolor: '#EF4444',
                            color: '#FFF',
                            fontSize: '0.6rem',
                            fontWeight: 900,
                            height: 16,
                          }}
                        />
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Typography variant="body2" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                      {row.name}
                    </Typography>
                    {row.offerComponents && (
                      <Typography variant="caption" sx={{ color: '#D97706', fontWeight: 700, display: 'block' }}>
                        📦 {row.offerComponents}
                      </Typography>
                    )}
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={categoryName}
                      size="small"
                      sx={{
                        bgcolor: isOffer ? '#FEF3C7' : '#F3F4F6',
                        color: isOffer ? '#92400E' : '#374151',
                        fontWeight: 800
                      }}
                    />
                  </TableCell>

                  <TableCell sx={{ fontSize: '0.85rem', color: '#4B5563' }}>
                    {row.size || 'عادي'}
                  </TableCell>

                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 900, color: isOffer ? '#D97706' : '#10B981' }}>
                        {row.price} ج.م
                      </Typography>
                      {row.originalPrice && (
                        <Typography variant="caption" sx={{ textDecoration: 'line-through', color: '#9CA3AF', fontWeight: 600 }}>
                          {row.originalPrice} ج.م
                        </Typography>
                      )}
                    </Box>
                  </TableCell>

                  <TableCell>
                    <Chip
                      label={row.is_available !== false ? 'متوفر' : 'غير متوفر'}
                      size="small"
                      sx={{
                        bgcolor: row.is_available !== false ? '#D1FAE5' : '#FEE2E2',
                        color: row.is_available !== false ? '#065F46' : '#991B1B',
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>

                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                      <IconButton
                        size="small"
                        onClick={() => moveProductUp(row.id)}
                        disabled={idx === 0}
                        sx={{ color: '#4285F4', bgcolor: '#F0F7FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                      >
                        <ArrowUpwardOutlined fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => moveProductDown(row.id)}
                        disabled={idx === filteredProducts.length - 1}
                        sx={{ color: '#4285F4', bgcolor: '#F0F7FF', '&:hover': { bgcolor: '#DBEAFE' } }}
                      >
                        <ArrowDownwardOutlined fontSize="small" />
                      </IconButton>
                    </Box>
                  </TableCell>

                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(row)} sx={{ color: '#4285F4' }}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={() => handleDeleteClick(row.id)} sx={{ color: '#EF4444' }}>
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add / Edit Product & Interactive Offer Builder Modal */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: '20px',
              p: 1,
            }
          }
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, pb: 1, borderBottom: '1px solid #E5E7EB' }}>
          {currentProduct.id
            ? (currentProduct.isOffer ? 'تعديل بيانات العرض الخاص' : 'تعديل المنتج')
            : (currentProduct.isOffer ? 'إضافة عرض خاص جديد 🏷️' : 'إضافة منتج جديد 🍔')}
        </DialogTitle>

        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2.5, pb: 1, mt: 1 }}>
          {/* Toggle Offer Mode */}
          <Paper sx={{ p: 1.5, borderRadius: '12px', bgcolor: currentProduct.isOffer ? '#FFFDF5' : '#FAFBFC', border: '1.5px solid', borderColor: currentProduct.isOffer ? '#F59E0B' : '#E5E7EB' }}>
            <FormControlLabel
              control={
                <Switch
                  checked={currentProduct.isOffer || currentProduct.categoryId === '5'}
                  onChange={(e) => {
                    const isChecked = e.target.checked;
                    setCurrentProduct((prev) => ({
                      ...prev,
                      isOffer: isChecked,
                      categoryId: isChecked ? '5' : '1',
                      size: isChecked ? 'عرض خاص' : 'كبير',
                    }));
                  }}
                  color="warning"
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 800, color: currentProduct.isOffer ? '#D97706' : '#374151' }}>
                  🏷️ خصص هذا الصنف كـ "عرض خاص / وجبة توفير"
                </Typography>
              }
            />
          </Paper>

          {/* Interactive Offer Builder Section (Selecting products & quantities) */}
          {currentProduct.isOffer && (
            <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1.5px dashed #F59E0B', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#B45309', display: 'flex', alignItems: 'center', gap: 1 }}>
                🍱 تجميع مكونات العرض من أصناف المنيو الرئيسية:
              </Typography>
              <Typography variant="caption" sx={{ color: '#92400E', fontSize: '0.78rem' }}>
                اختر الصنف والكمية المطلوبة، وسيتم إضافتها تلقائياً إلى تفاصيل العرض وحساب سعرها الأصلي.
              </Typography>

              {/* Product Selector & Quantity Selector Row */}
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                <FormControl size="small" sx={{ flex: 1, minWidth: 200, bgcolor: '#FFF' }}>
                  <InputLabel>اختر صنف من المنيو</InputLabel>
                  <Select
                    value={selectedBaseProductId}
                    label="اختر صنف من المنيو"
                    onChange={(e) => setSelectedBaseProductId(e.target.value)}
                  >
                    {baseProductsOnly.map((bp) => (
                      <MenuItem key={bp.id} value={bp.id}>
                        {bp.name} ({bp.price} ج.م)
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  type="number"
                  label="الكمية"
                  value={baseProductQuantity}
                  onChange={(e) => setBaseProductQuantity(parseInt(e.target.value) || 1)}
                  sx={{ width: 90, bgcolor: '#FFF' }}
                  inputProps={{ min: 1 }}
                />

                <Button
                  variant="contained"
                  startIcon={<AddShoppingCartOutlined />}
                  onClick={handleAddOfferItem}
                  disabled={!selectedBaseProductId}
                  sx={{ bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' }, borderRadius: '10px', px: 2, fontWeight: 800 }}
                >
                  إضافة للعرض
                </Button>
              </Box>

              {/* Selected Offer Items List Chips */}
              {offerItemsList.length > 0 && (
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, pt: 1 }}>
                  {offerItemsList.map((item, idx) => (
                    <Chip
                      key={idx}
                      label={`${item.quantity}× ${item.name} (${item.price * item.quantity} ج.م)`}
                      onDelete={() => handleRemoveOfferItem(idx)}
                      color="warning"
                      variant="outlined"
                      sx={{ fontWeight: 800, bgcolor: '#FFF', borderColor: '#F59E0B' }}
                    />
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* Image Preview & Device File Upload */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, bgcolor: '#FAFCFF', p: 1.5, borderRadius: '14px', border: '1px solid #E2E8F0' }}>
            <Box
              component="img"
              src={currentProduct.image || '/images/hawawshi_sade.png'}
              alt="Preview"
              sx={{ width: 68, height: 68, borderRadius: '14px', objectFit: 'cover', border: '1px solid #E5E7EB' }}
            />
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 0.8 }}>
              <Button
                variant="outlined"
                component="label"
                startIcon={<CloudUploadOutlined />}
                size="small"
                sx={{
                  borderRadius: '10px',
                  fontWeight: 800,
                  borderColor: '#4285F4',
                  color: '#4285F4',
                }}
              >
                📁 رفع صورة العرض من جهازك
                <input type="file" accept="image/*" hidden onChange={handleFileUpload} />
              </Button>
            </Box>
          </Box>

          {/* Offer / Product Name */}
          <TextField
            fullWidth
            size="small"
            label={currentProduct.isOffer ? "اسم العرض أو الوجبة" : "اسم المنتج"}
            placeholder={currentProduct.isOffer ? "مثال: عرض الميكس الفاخر (2 حواوشي + بيبسي)" : "مثال: حواوشي سجق سلايس"}
            value={currentProduct.name}
            onChange={(e) => setCurrentProduct({ ...currentProduct, name: e.target.value })}
          />

          {/* Category Select */}
          <FormControl fullWidth size="small">
            <InputLabel>التصنيف</InputLabel>
            <Select
              value={currentProduct.categoryId || '1'}
              label="التصنيف"
              onChange={(e) => setCurrentProduct({ ...currentProduct, categoryId: e.target.value, isOffer: e.target.value === '5' })}
            >
              {categoriesList.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Pricing: Price & Original Price */}
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <TextField
              fullWidth
              size="small"
              type="number"
              label={currentProduct.isOffer ? "سعر العرض بعد الخصم (ج.م)" : "السعر (ج.م)"}
              value={currentProduct.price}
              onChange={(e) => setCurrentProduct({ ...currentProduct, price: parseFloat(e.target.value) || 0 })}
            />

            <TextField
              fullWidth
              size="small"
              type="number"
              label="السعر الأصلي قبل الخصم (اختياري)"
              placeholder="185"
              value={currentProduct.originalPrice || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, originalPrice: parseFloat(e.target.value) || 0 })}
            />
          </Box>

          {/* Offer Components Details Field */}
          {currentProduct.isOffer && (
            <TextField
              fullWidth
              size="small"
              multiline
              rows={2}
              label="📦 محتويات ومكونات العرض (النص الظاهر بالكارت والفاتورة)"
              placeholder="مثال: 2 حواوشي ميكس أجبان كبير + بيبسي 1 لتر + 2 بطاطس"
              value={currentProduct.offerComponents || ''}
              onChange={(e) => setCurrentProduct({ ...currentProduct, offerComponents: e.target.value })}
            />
          )}

          {/* Size / Portion */}
          <TextField
            fullWidth
            size="small"
            label="الحجم أو الفئة"
            placeholder="كبير / وجبة عائلية / عرض لشخصين"
            value={currentProduct.size || 'كبير'}
            onChange={(e) => setCurrentProduct({ ...currentProduct, size: e.target.value })}
          />

          {/* Preset Images Selection */}
          <FormControl fullWidth size="small">
            <InputLabel>أو اختر من صور المنيو المجهزة</InputLabel>
            <Select
              value={currentProduct.image || '/images/hawawshi_sade.png'}
              label="أو اختر من صور المنيو المجهزة"
              onChange={(e) => setCurrentProduct({ ...currentProduct, image: e.target.value })}
            >
              {presetImages.map((img) => (
                <MenuItem key={img.name} value={img.url}>{img.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>

        <DialogActions sx={{ p: 2, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB', gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#6B7280', fontWeight: 700 }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{ bgcolor: currentProduct.isOffer ? '#F59E0B' : '#4285F4', borderRadius: '10px', px: 3, fontWeight: 800 }}
          >
            {currentProduct.isOffer ? 'حفظ العرض الخاص 🏷️' : 'حفظ المنتج'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>تأكيد حذف العنصر</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت تأكد من رغبتك في حذف هذا الصنف من المنيو وقاعدة البيانات؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={confirmDelete}>تأكيد الحذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
