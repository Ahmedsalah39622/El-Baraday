'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, IconButton, Tooltip, Chip, Alert, Grid, Divider, Autocomplete, InputAdornment, Card, CardContent
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Science, CheckCircle, Storefront, LocalOffer } from '@mui/icons-material';

export default function ProductRecipeModal({ open, onClose, initialProductId }) {
  const [products, setProducts] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addSuccessMsg, setAddSuccessMsg] = useState('');

  // Small size add form
  const [smallInvId, setSmallInvId] = useState('');
  const [smallQty, setSmallQty] = useState('1');
  const [smallUnitMode, setSmallUnitMode] = useState('base');
  const [smallAutoDeduct, setSmallAutoDeduct] = useState('deduct');

  // Large size add form
  const [largeInvId, setLargeInvId] = useState('');
  const [largeQty, setLargeQty] = useState('1');
  const [largeUnitMode, setLargeUnitMode] = useState('base');
  const [largeAutoDeduct, setLargeAutoDeduct] = useState('deduct');

  // Single/Common size add form
  const [commonInvId, setCommonInvId] = useState('');
  const [commonQty, setCommonQty] = useState('1');
  const [commonUnitMode, setCommonUnitMode] = useState('base');
  const [commonAutoDeduct, setCommonAutoDeduct] = useState('deduct');

  const NON_DEDUCTIBLE_KEYWORDS = [
    'بطاطس', 'بطاطا',
    'روزبيف', 'روست',
    'سلامى', 'سلامي',
    'سوسيس', 'سويسويس', 'هوت دوج',
    'تركى', 'تركي',
    'بسطرمة', 'بسكرمه', 'بسترمة',
    'مشروم', 'فطر',
    'شيدر'
  ];

  const isMultiSizeProduct = Boolean(
    selectedProduct && (
      selectedProduct.has_sizes === 1 ||
      selectedProduct.has_sizes === true ||
      selectedProduct.hasMultipleSizes ||
      selectedProduct.price_small ||
      selectedProduct.priceSmall
    )
  );

  // Load all products and inventory items when modal opens
  useEffect(() => {
    if (open) {
      loadProductsAndInventory();
    }
  }, [open]);

  // Update selected product if initialProductId or products changes
  useEffect(() => {
    if (initialProductId && products.length > 0) {
      const found = products.find(p => p.id === initialProductId);
      if (found) setSelectedProduct(found);
    }
  }, [initialProductId, products]);

  // Load ingredients when selected product changes
  useEffect(() => {
    if (selectedProduct?.id) {
      loadProductIngredients(selectedProduct.id);
    } else {
      setIngredients([]);
    }
  }, [selectedProduct]);

  const loadProductsAndInventory = async () => {
    setLoading(true);
    try {
      const [prodRes, invRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/inventory')
      ]);

      if (prodRes.ok) {
        const prodData = await prodRes.json();
        setProducts(prodData || []);
        if (initialProductId) {
          const found = prodData.find(p => p.id === initialProductId);
          if (found) setSelectedProduct(found);
          else if (prodData.length > 0) setSelectedProduct(prodData[0]);
        } else if (prodData.length > 0 && !selectedProduct) {
          setSelectedProduct(prodData[0]);
        }
      }

      if (invRes.ok) {
        const invData = await invRes.json();
        setInventoryItems(invData || []);
      }
    } catch (err) {
      console.error('Error loading recipe modal data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadProductIngredients = async (productId) => {
    try {
      const res = await fetch(`/api/products/ingredients?product_id=${encodeURIComponent(productId)}`);
      if (res.ok) {
        const data = await res.json();
        setIngredients(data || []);
      }
    } catch (err) {
      console.error('Error loading ingredients:', err);
    }
  };

  const handleAddIngredient = async (targetSize, invId, qtyStr, unitMode, autoDeductMode) => {
    if (!selectedProduct?.id || !invId) {
      alert('برجاء اختيار الخامة المراد إضافتها');
      return;
    }
    const numQty = parseFloat(qtyStr) || 1;
    if (numQty <= 0) {
      alert('برجاء إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    const selectedInvItem = inventoryItems.find(item => item.id === invId);
    const itemUnit = selectedInvItem?.unit || '';
    const supportsGrams = itemUnit === 'كجم' || itemUnit === 'لتر';

    let finalQty = numQty;
    if (supportsGrams && unitMode === 'gram') {
      finalQty = numQty / 1000;
    }

    try {
      const res = await fetch('/api/products/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          inventory_item_id: invId,
          quantity: finalQty,
          size: targetSize, // 'صغير', 'كبير', or 'all'
          auto_deduct: autoDeductMode === 'deduct'
        })
      });

      if (res.ok) {
        const sizeLabel = targetSize === 'صغير' ? 'الحجم الصغير' : targetSize === 'كبير' ? 'الحجم الكبير' : 'المنتج';
        setAddSuccessMsg(`✅ تم إضافة الخامة لـ (${sizeLabel}) بنجاح!`);
        setTimeout(() => setAddSuccessMsg(''), 3000);

        if (targetSize === 'صغير') {
          setSmallInvId('');
          setSmallQty('1');
        } else if (targetSize === 'كبير') {
          setLargeInvId('');
          setLargeQty('1');
        } else {
          setCommonInvId('');
          setCommonQty('1');
        }

        loadProductIngredients(selectedProduct.id);
      }
    } catch (err) {
      console.error('Error adding ingredient:', err);
    }
  };

  const handleDeleteIngredient = async (id) => {
    try {
      const res = await fetch(`/api/products/ingredients/${id}`, { method: 'DELETE' });
      if (res.ok && selectedProduct?.id) {
        loadProductIngredients(selectedProduct.id);
      }
    } catch (err) {
      console.error('Error deleting ingredient:', err);
    }
  };

  const pPriceSmall = parseFloat(selectedProduct?.price_small || selectedProduct?.priceSmall || 25);
  const pPriceLarge = parseFloat(selectedProduct?.price_large || selectedProduct?.priceLarge || selectedProduct?.price || 40);
  const sellingPrice = parseFloat(selectedProduct?.price || 0);

  // Filter Ingredients by size
  const smallIngredients = ingredients.filter(i => i.size === 'صغير' || i.size === 'small');
  const largeIngredients = ingredients.filter(i => i.size === 'كبير' || i.size === 'large');
  const commonIngredients = ingredients.filter(i => i.size === 'all' || i.size === 'عادي' || !i.size);

  // Financial calculations
  const smallCost = smallIngredients.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.inventory_cost_per_unit || 0)), 0) +
    commonIngredients.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.inventory_cost_per_unit || 0)), 0);

  const largeCost = largeIngredients.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.inventory_cost_per_unit || 0)), 0) +
    commonIngredients.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.inventory_cost_per_unit || 0)), 0);

  const singleCost = ingredients.reduce((s, i) => s + (parseFloat(i.quantity || 0) * parseFloat(i.inventory_cost_per_unit || 0)), 0);

  const smallProfit = Math.max(0, pPriceSmall - smallCost);
  const largeProfit = Math.max(0, pPriceLarge - largeCost);
  const singleProfit = Math.max(0, sellingPrice - singleCost);

  // Helper render for an ingredients table
  const renderIngredientsTable = (itemsList, emptyMsg) => (
    <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '10px', bgcolor: '#FFF' }}>
      <Table size="small">
        <TableHead sx={{ bgcolor: '#F8FAFC' }}>
          <TableRow>
            <TableCell sx={{ fontWeight: 800 }}>الخامة</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>الكمية</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>الخصم</TableCell>
            <TableCell sx={{ fontWeight: 800 }}>التكلفة</TableCell>
            <TableCell align="center" sx={{ fontWeight: 800 }}>حذف</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {itemsList.map((ing) => {
            const ingQty = parseFloat(ing.quantity || 0);
            const unitCost = parseFloat(ing.inventory_cost_per_unit || 0);
            const itemCost = ingQty * unitCost;
            const isAutoDeduct = ing.auto_deduct !== false && ing.auto_deduct !== '0';

            return (
              <TableRow key={ing.id} hover>
                <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{ing.inventory_item_name}</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>{Math.abs(ingQty)} {ing.inventory_item_unit || ''}</TableCell>
                <TableCell>
                  <Chip
                    label={isAutoDeduct ? "خصم رصيد" : "استهلاك فقط"}
                    size="small"
                    color={isAutoDeduct ? "success" : "default"}
                    sx={{ fontWeight: 700, fontSize: '0.72rem' }}
                  />
                </TableCell>
                <TableCell sx={{ fontWeight: 800, color: '#DC2626' }}>{itemCost.toFixed(2)} ج.م</TableCell>
                <TableCell align="center">
                  <IconButton color="error" size="small" onClick={() => handleDeleteIngredient(ing.id)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            );
          })}

          {itemsList.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} align="center" sx={{ py: 2.5, color: '#94A3B8', fontWeight: 600 }}>
                {emptyMsg || 'لا توجد خامات مضافة حالياً'}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </TableContainer>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1, borderBottom: '1px solid #E2E8F0' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Science sx={{ fontSize: 28 }} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight={900} color="#1A1A2E">
              🥩 ضبط مكونات وخامات المنتجات (فصل الصغير عن الكبير)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              تحديد الخامات المخصومة لكل حجم على حدة لضمان دقة جرد ومخزون الفروع بنسبة 100%
            </Typography>
          </Box>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 2 }}>
        {/* Product Selection Bar */}
        <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={products || []}
                getOptionLabel={(opt) => `${opt.name} ${(opt.has_sizes === 1 || opt.hasMultipleSizes) ? '(له حجم صغير وكبير 📏)' : `- ${opt.price || 0} ج.م`}`}
                value={selectedProduct}
                onChange={(e, val) => setSelectedProduct(val || null)}
                renderInput={(params) => <TextField {...params} label="اختر المنتج المراد ضبط مكوناته *" size="small" />}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              {selectedProduct && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
                  {isMultiSizeProduct ? (
                    <>
                      <Chip icon={<Storefront />} label={`سعر الصغير: ${pPriceSmall} ج.م`} sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800, border: '1.5px solid #FCD34D' }} />
                      <Chip icon={<Storefront />} label={`سعر الكبير: ${pPriceLarge} ج.م`} sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 800, border: '1.5px solid #93C5FD' }} />
                    </>
                  ) : (
                    <Chip icon={<LocalOffer />} label={`سعر البيع: ${sellingPrice} ج.م`} color="primary" sx={{ fontWeight: 800 }} />
                  )}
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>

        {addSuccessMsg && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            {addSuccessMsg}
          </Alert>
        )}

        {/* If Product has sizes: SHOW 2 EXPLICIT SEPARATE CARDS (Small vs Large) */}
        {selectedProduct && isMultiSizeProduct && (
          <Grid container spacing={2.5}>
            {/* 🟡 1. SMALL SIZE CARD */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px', border: '2px solid #FCD34D', bgcolor: '#FFFDF5', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, bgcolor: '#FEF3C7', borderBottom: '1.5px solid #FCD34D', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={900} color="#92400E">
                    🟡 خامات الحجم الصغير (تخصم فقط عند طلب صغير)
                  </Typography>
                  <Chip label={`${smallIngredients.length} خامات`} size="small" sx={{ bgcolor: '#B45309', color: '#FFF', fontWeight: 800 }} />
                </Box>

                <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Small Ingredients List */}
                  {renderIngredientsTable(smallIngredients, 'لم يتم ربط خامات للحجم الصغير بعد (أضف من الأسفل 👇)')}

                  {/* Add to Small Form */}
                  <Paper sx={{ p: 1.5, borderRadius: '12px', border: '1px dashed #F59E0B', bgcolor: '#FFFBEB' }}>
                    <Typography variant="caption" fontWeight={800} color="#B45309" display="block" sx={{ mb: 1 }}>
                      ➕ إضافة خامة للحجم الصغير (مثل: ساده صغير أو لحمة صغير):
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>اختر الخامة *</InputLabel>
                          <Select
                            value={smallInvId}
                            label="اختر الخامة *"
                            onChange={(e) => {
                              setSmallInvId(e.target.value);
                              const item = inventoryItems.find(i => i.id === e.target.value);
                              const isNonDed = NON_DEDUCTIBLE_KEYWORDS.some(kw => (item?.name || '').toLowerCase().includes(kw));
                              setSmallAutoDeduct(isNonDed ? 'track_only' : 'deduct');
                            }}
                            sx={{ bgcolor: '#FFF' }}
                          >
                            {inventoryItems.map((inv) => (
                              <MenuItem key={inv.id} value={inv.id}>
                                {inv.name} ({inv.currentStock || inv.current_stock || 0} {inv.unit})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="الكمية"
                          value={smallQty}
                          onChange={(e) => setSmallQty(e.target.value)}
                          sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleAddIngredient('صغير', smallInvId, smallQty, smallUnitMode, smallAutoDeduct)}
                          startIcon={<AddIcon />}
                          sx={{ bgcolor: '#D97706', color: '#FFF', fontWeight: 800, py: 0.9, '&:hover': { bgcolor: '#B45309' } }}
                        >
                          إضافة للصغير
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Small Financial summary */}
                  <Box sx={{ mt: 'auto', p: 1.5, borderRadius: '10px', bgcolor: '#FEF9C3', display: 'flex', justifyContent: 'space-around', border: '1px solid #FDE047' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">تكلفة خامات الصغير</Typography>
                      <Typography variant="subtitle2" fontWeight={900} color="#DC2626">{smallCost.toFixed(2)} ج.م</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">صافي الربح المتوقع</Typography>
                      <Typography variant="subtitle2" fontWeight={900} color="#15803D">{smallProfit.toFixed(2)} ج.م</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 🔵 2. LARGE SIZE CARD */}
            <Grid item xs={12} md={6}>
              <Card sx={{ borderRadius: '16px', border: '2px solid #93C5FD', bgcolor: '#F8FAFF', height: '100%', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ p: 2, bgcolor: '#DBEAFE', borderBottom: '1.5px solid #93C5FD', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="subtitle1" fontWeight={900} color="#1E40AF">
                    🔵 خامات الحجم الكبير (تخصم فقط عند طلب كبير)
                  </Typography>
                  <Chip label={`${largeIngredients.length} خامات`} size="small" sx={{ bgcolor: '#1E40AF', color: '#FFF', fontWeight: 800 }} />
                </Box>

                <CardContent sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {/* Large Ingredients List */}
                  {renderIngredientsTable(largeIngredients, 'لم يتم ربط خامات للحجم الكبير بعد (أضف من الأسفل 👇)')}

                  {/* Add to Large Form */}
                  <Paper sx={{ p: 1.5, borderRadius: '12px', border: '1px dashed #3B82F6', bgcolor: '#EFF6FF' }}>
                    <Typography variant="caption" fontWeight={800} color="#1E40AF" display="block" sx={{ mb: 1 }}>
                      ➕ إضافة خامة للحجم الكبير (مثل: ساده كبير أو لحمة كبير):
                    </Typography>
                    <Grid container spacing={1.5} alignItems="center">
                      <Grid item xs={12} sm={6}>
                        <FormControl fullWidth size="small">
                          <InputLabel>اختر الخامة *</InputLabel>
                          <Select
                            value={largeInvId}
                            label="اختر الخامة *"
                            onChange={(e) => {
                              setLargeInvId(e.target.value);
                              const item = inventoryItems.find(i => i.id === e.target.value);
                              const isNonDed = NON_DEDUCTIBLE_KEYWORDS.some(kw => (item?.name || '').toLowerCase().includes(kw));
                              setLargeAutoDeduct(isNonDed ? 'track_only' : 'deduct');
                            }}
                            sx={{ bgcolor: '#FFF' }}
                          >
                            {inventoryItems.map((inv) => (
                              <MenuItem key={inv.id} value={inv.id}>
                                {inv.name} ({inv.currentStock || inv.current_stock || 0} {inv.unit})
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <TextField
                          fullWidth
                          size="small"
                          type="number"
                          label="الكمية"
                          value={largeQty}
                          onChange={(e) => setLargeQty(e.target.value)}
                          sx={{ bgcolor: '#FFF' }}
                        />
                      </Grid>

                      <Grid item xs={6} sm={3}>
                        <Button
                          fullWidth
                          variant="contained"
                          onClick={() => handleAddIngredient('كبير', largeInvId, largeQty, largeUnitMode, largeAutoDeduct)}
                          startIcon={<AddIcon />}
                          sx={{ bgcolor: '#2563EB', color: '#FFF', fontWeight: 800, py: 0.9, '&:hover': { bgcolor: '#1D4ED8' } }}
                        >
                          إضافة للكبير
                        </Button>
                      </Grid>
                    </Grid>
                  </Paper>

                  {/* Large Financial summary */}
                  <Box sx={{ mt: 'auto', p: 1.5, borderRadius: '10px', bgcolor: '#DBEAFE', display: 'flex', justifyContent: 'space-around', border: '1px solid #BFDBFE' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">تكلفة خامات الكبير</Typography>
                      <Typography variant="subtitle2" fontWeight={900} color="#DC2626">{largeCost.toFixed(2)} ج.م</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">صافي الربح المتوقع</Typography>
                      <Typography variant="subtitle2" fontWeight={900} color="#1D4ED8">{largeProfit.toFixed(2)} ج.م</Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* 🌐 3. COMMON / SHARED INGREDIENTS (Optional) */}
            <Grid item xs={12}>
              <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#FAF5FF', border: '1.5px solid #E9D5FF' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                  <Typography variant="subtitle2" fontWeight={900} color="#6B21A8">
                    🌐 خامات مشتركة (تُخصم مع الصغير والكبير معاً - مثل البهارات أو أكياس التغليف)
                  </Typography>
                  <Chip label={`${commonIngredients.length} خامات مشتركة`} size="small" sx={{ bgcolor: '#7E22CE', color: '#FFF', fontWeight: 800 }} />
                </Box>

                {commonIngredients.length > 0 && renderIngredientsTable(commonIngredients, '')}

                <Box sx={{ mt: commonIngredients.length > 0 ? 1.5 : 0 }}>
                  <Grid container spacing={1.5} alignItems="center">
                    <Grid item xs={12} sm={5}>
                      <FormControl fullWidth size="small">
                        <InputLabel>خامة مشتركة *</InputLabel>
                        <Select
                          value={commonInvId}
                          label="خامة مشتركة *"
                          onChange={(e) => setCommonInvId(e.target.value)}
                          sx={{ bgcolor: '#FFF' }}
                        >
                          {inventoryItems.map((inv) => (
                            <MenuItem key={inv.id} value={inv.id}>
                              {inv.name} ({inv.currentStock || inv.current_stock || 0} {inv.unit})
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </Grid>
                    <Grid item xs={6} sm={4}>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="الكمية"
                        value={commonQty}
                        onChange={(e) => setCommonQty(e.target.value)}
                        sx={{ bgcolor: '#FFF' }}
                      />
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={() => handleAddIngredient('all', commonInvId, commonQty, commonUnitMode, commonAutoDeduct)}
                        startIcon={<AddIcon />}
                        sx={{ bgcolor: '#7E22CE', color: '#FFF', fontWeight: 800, py: 0.9, '&:hover': { bgcolor: '#6B21A8' } }}
                      >
                        إضافة كمشترك
                      </Button>
                    </Grid>
                  </Grid>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        )}

        {/* If Single Size Product */}
        {selectedProduct && !isMultiSizeProduct && (
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1px solid #E2E8F0', bgcolor: '#FFF', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1" fontWeight={900} color="#1E293B">
              📋 خامات ومكونات الصنف ({selectedProduct.name})
            </Typography>

            {renderIngredientsTable(ingredients, 'لم يتم إضافة خامات لهذا المنتج بعد')}

            {/* Add ingredient form for single product */}
            <Paper sx={{ p: 2, borderRadius: '12px', border: '1px dashed #CBD5E1', bgcolor: '#F8FAFC' }}>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>اختر الخامة *</InputLabel>
                    <Select
                      value={commonInvId}
                      label="اختر الخامة *"
                      onChange={(e) => {
                        setCommonInvId(e.target.value);
                        const item = inventoryItems.find(i => i.id === e.target.value);
                        const isNonDed = NON_DEDUCTIBLE_KEYWORDS.some(kw => (item?.name || '').toLowerCase().includes(kw));
                        setCommonAutoDeduct(isNonDed ? 'track_only' : 'deduct');
                      }}
                      sx={{ bgcolor: '#FFF' }}
                    >
                      {inventoryItems.map((inv) => (
                        <MenuItem key={inv.id} value={inv.id}>
                          {inv.name} ({inv.currentStock || inv.current_stock || 0} {inv.unit})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <TextField
                    fullWidth
                    size="small"
                    type="number"
                    label="الكمية المخصومة"
                    value={commonQty}
                    onChange={(e) => setCommonQty(e.target.value)}
                    sx={{ bgcolor: '#FFF' }}
                  />
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleAddIngredient('all', commonInvId, commonQty, commonUnitMode, commonAutoDeduct)}
                    startIcon={<AddIcon />}
                    sx={{ bgcolor: '#4F46E5', color: '#FFF', fontWeight: 800, py: 1, '&:hover': { bgcolor: '#4338CA' } }}
                  >
                    إضافة الخامة
                  </Button>
                </Grid>
              </Grid>
            </Paper>

            {/* Profit margin summary */}
            <Paper sx={{ p: 2, borderRadius: '12px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#166534">سعر البيع</Typography>
                <Typography variant="h6" fontWeight={900} color="#15803D">{sellingPrice} ج.م</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#991B1B">إجمالي تكلفة الخامات</Typography>
                <Typography variant="h6" fontWeight={900} color="#DC2626">{singleCost.toFixed(2)} ج.م</Typography>
              </Box>
              <Divider orientation="vertical" flexItem />
              <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="#1E40AF">صافي الربح المتوقع</Typography>
                <Typography variant="h6" fontWeight={900} color="#1D4ED8">{singleProfit.toFixed(2)} ج.م</Typography>
              </Box>
            </Paper>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, bgcolor: '#FAFCFF', borderTop: '1px solid #E2E8F0' }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#4F46E5', borderRadius: '10px', px: 4, fontWeight: 800 }}>
          إغلاق ومتابعة العمل
        </Button>
      </DialogActions>
    </Dialog>
  );
}
