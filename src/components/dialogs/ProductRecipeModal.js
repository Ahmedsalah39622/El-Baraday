'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, Box, Typography,
  FormControl, InputLabel, Select, MenuItem, TextField, Paper, Table, TableHead,
  TableRow, TableCell, TableBody, TableContainer, IconButton, Tooltip, Chip, Alert, Grid, Divider, Autocomplete, InputAdornment
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Science, AttachMoney, Inventory, CheckCircle } from '@mui/icons-material';

export default function ProductRecipeModal({ open, onClose, initialProductId }) {
  const [products, setProducts] = useState([]);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [ingredients, setIngredients] = useState([]);
  const [loading, setLoading] = useState(false);

  // New ingredient form
  const [selectedInventoryId, setSelectedInventoryId] = useState('');
  const [quantity, setQuantity] = useState('0.15');
  const [unitMode, setUnitMode] = useState('base'); // 'base' or 'gram'
  const [actionType, setActionType] = useState('deduct'); // 'deduct' or 'add'
  const [selectedSize, setSelectedSize] = useState('all');
  const [addSuccess, setAddSuccess] = useState(false);

  // Reset unit mode and action type when selected raw material changes
  useEffect(() => {
    setUnitMode('base');
    setActionType('deduct');
  }, [selectedInventoryId]);

  // Load all products and inventory items when modal opens
  useEffect(() => {
    if (open) {
      loadProductsAndInventory();
    }
  }, [open]);

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

  const handleAddIngredient = async () => {
    if (!selectedProduct?.id || !selectedInventoryId) {
      alert('برجاء اختيار المنتج والخامة المراد ربطها');
      return;
    }
    const numQty = parseFloat(quantity) || 0.1;
    if (numQty <= 0) {
      alert('برجاء إدخال كمية صحيحة أكبر من الصفر');
      return;
    }

    const selectedInvItem = inventoryItems.find(item => item.id === selectedInventoryId);
    const itemUnit = selectedInvItem?.unit || '';
    const supportsGrams = itemUnit === 'كجم' || itemUnit === 'لتر';

    let finalQty = numQty;
    if (supportsGrams && unitMode === 'gram') {
      finalQty = numQty / 1000;
    }

    // If actionType is add (+), we save the quantity as a negative number in the recipe table
    if (actionType === 'add') {
      finalQty = -finalQty;
    }

    try {
      const res = await fetch('/api/products/ingredients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          inventory_item_id: selectedInventoryId,
          quantity: finalQty,
          size: selectedSize
        })
      });

      if (res.ok) {
        setAddSuccess(true);
        setTimeout(() => setAddSuccess(false), 2500);
        setSelectedInventoryId('');
        setQuantity('0.15');
        setUnitMode('base');
        setActionType('deduct');
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

  // Generate expanded product options for sizes (Small/Large)
  const productOptions = [];
  (products || []).forEach(p => {
    const hasSizes = Boolean(p.hasMultipleSizes || p.priceSmall || p.has_sizes);
    if (hasSizes) {
      const pSmall = p.priceSmall || 25;
      const pLarge = p.priceLarge || p.price || 40;
      productOptions.push({
        ...p,
        uniqueOptionId: `${p.id}_صغير`,
        optionLabel: `${p.name} (حجم صغير) - ${pSmall} ج.م`,
        targetSize: 'صغير',
        displayPrice: pSmall
      });
      productOptions.push({
        ...p,
        uniqueOptionId: `${p.id}_كبير`,
        optionLabel: `${p.name} (حجم كبير) - ${pLarge} ج.م`,
        targetSize: 'كبير',
        displayPrice: pLarge
      });
    } else {
      productOptions.push({
        ...p,
        uniqueOptionId: p.id,
        optionLabel: `${p.name} - ${p.price} ج.م`,
        targetSize: 'all',
        displayPrice: p.price
      });
    }
  });

  const selectedOptionObj = productOptions.find(
    opt => opt.id === selectedProduct?.id && (opt.targetSize === selectedSize || opt.targetSize === 'all')
  ) || (selectedProduct ? { ...selectedProduct, optionLabel: selectedProduct.name } : null);

  // Calculate summary stats for the selected product
  const sellingPrice = parseFloat(selectedProduct?.price || 0);
  const isMultiSizeProduct = Boolean(selectedProduct?.hasMultipleSizes || selectedProduct?.priceSmall);
  const pPriceSmall = parseFloat(selectedProduct?.priceSmall || 25);
  const pPriceLarge = parseFloat(selectedProduct?.priceLarge || selectedProduct?.price || 40);

  // Small size cost: ingredients with size === 'صغير' || 'small' || 'all'
  const smallRecipeCost = ingredients.reduce((sum, ing) => {
    if (ing.size === 'كبير' || ing.size === 'large') return sum;
    const qty = parseFloat(ing.quantity || 0);
    const unitCost = parseFloat(ing.inventory_cost_per_unit || 0);
    return sum + (qty * unitCost);
  }, 0);

  // Large size cost: ingredients with size === 'كبير' || 'large' || 'all'
  const largeRecipeCost = ingredients.reduce((sum, ing) => {
    if (ing.size === 'صغير' || ing.size === 'small') return sum;
    const qty = parseFloat(ing.quantity || 0);
    const unitCost = parseFloat(ing.inventory_cost_per_unit || 0);
    return sum + (qty * unitCost);
  }, 0);

  const smallNetProfit = Math.max(0, pPriceSmall - smallRecipeCost);
  const largeNetProfit = Math.max(0, pPriceLarge - largeRecipeCost);
  const smallProfitMargin = pPriceSmall > 0 ? Math.round((smallNetProfit / pPriceSmall) * 100) : 0;
  const largeProfitMargin = pPriceLarge > 0 ? Math.round((largeNetProfit / pPriceLarge) * 100) : 0;

  const totalRecipeCost = ingredients.reduce((sum, ing) => {
    const qty = parseFloat(ing.quantity || 0);
    const unitCost = parseFloat(ing.inventory_cost_per_unit || 0);
    return sum + (qty * unitCost);
  }, 0);
  const netProfit = Math.max(0, sellingPrice - totalRecipeCost);
  const profitMarginPercent = sellingPrice > 0 ? Math.round((netProfit / sellingPrice) * 100) : 0;

  const selectedInvItem = inventoryItems.find(item => item.id === selectedInventoryId);
  const itemUnit = selectedInvItem?.unit || '';
  const supportsGrams = itemUnit === 'كجم' || itemUnit === 'لتر';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1 }}>
        <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#EEF2FF', color: '#4F46E5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Science sx={{ fontSize: 28 }} />
        </Box>
        <Box>
          <Typography variant="h6" fontWeight={900} color="#1A1A2E">
            🥩 إدارة خامات ومكونات المنتجات والمكسات (حسب الأحجام)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            ربط الحجم الصغير والحجم الكبير بالخامات بالمخزن ليتم الخصم الأوتوماتيكي وحساب الربح لكل حجم
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 1 }}>
        {/* Product Selection Bar */}
        <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
          <Grid container spacing={2} alignItems="center">
            <Grid xs={12} sm={6}>
              <Autocomplete
                options={productOptions}
                getOptionLabel={(opt) => opt.optionLabel || opt.name || ''}
                value={selectedOptionObj}
                onChange={(e, val) => {
                  if (val) {
                    setSelectedProduct(val);
                    setSelectedSize(val.targetSize || 'all');
                  } else {
                    setSelectedProduct(null);
                  }
                }}
                renderInput={(params) => <TextField {...params} label="اختر المنتج أو الحجم المراد ربطه *" size="small" />}
              />
            </Grid>
            <Grid xs={12} sm={6}>
              {selectedProduct && (
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'flex-start', sm: 'flex-end' } }}>
                  {selectedSize === 'صغير' ? (
                    <Chip label={`🟡 سعر الحجم الصغير: ${pPriceSmall} ج.م`} sx={{ bgcolor: '#F59E0B', color: '#FFF', fontWeight: 900, fontSize: '0.9rem' }} />
                  ) : selectedSize === 'كبير' ? (
                    <Chip label={`🔵 سعر الحجم الكبير: ${pPriceLarge} ج.م`} sx={{ bgcolor: '#3B82F6', color: '#FFF', fontWeight: 900, fontSize: '0.9rem' }} />
                  ) : isMultiSizeProduct ? (
                    <>
                      <Chip label={`📏 صغير: ${pPriceSmall} ج.م`} sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800 }} />
                      <Chip label={`📏 كبير: ${pPriceLarge} ج.م`} sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 800 }} />
                    </>
                  ) : (
                    <Chip label={`السعر: ${sellingPrice} ج.م`} color="primary" sx={{ fontWeight: 800 }} />
                  )}
                  <Chip label={`الفئة: ${selectedProduct.categoryName || selectedProduct.categoryId || 'عام'}`} variant="outlined" sx={{ fontWeight: 700 }} />
                </Box>
              )}
            </Grid>
          </Grid>
        </Paper>

        {addSuccess && (
          <Alert severity="success" icon={<CheckCircle />} sx={{ borderRadius: '10px', fontWeight: 700 }}>
            ✅ تم ربط الخامة بالمنتج بنجاح! سيتم الخصم من رصيد المخزن أوتوماتيكياً مع كل أوردر.
          </Alert>
        )}

        {/* Add Ingredient Form */}
        {selectedProduct && (
          <Paper sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1.5px solid #FCD34D' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#B45309" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddIcon sx={{ fontSize: 20 }} /> إضافة خامة جديدة لـ ({selectedProduct.name}):
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid xs={12} sm={3.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>{actionType === 'add' ? "اختر الخامة المراد إضافتها *" : "اختر الخامة المراد خصمها *"}</InputLabel>
                  <Select
                    value={selectedInventoryId}
                    label={actionType === 'add' ? "اختر الخامة المراد إضافتها *" : "اختر الخامة المراد خصمها *"}
                    onChange={(e) => setSelectedInventoryId(e.target.value)}
                    sx={{ bgcolor: '#FFF' }}
                  >
                    {inventoryItems.map((inv) => (
                      <MenuItem key={inv.id} value={inv.id}>
                        {inv.name} ({inv.category || 'عام'}) - المتاح: {inv.currentStock || inv.current_stock || 0} {inv.unit}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={2}>
                <FormControl fullWidth size="small">
                  <InputLabel>الحجم المخصص *</InputLabel>
                  <Select
                    value={selectedSize}
                    label="الحجم المخصص *"
                    onChange={(e) => setSelectedSize(e.target.value)}
                    sx={{ bgcolor: '#FFF' }}
                  >
                    <MenuItem value="all">🌐 الكل / عادي</MenuItem>
                    <MenuItem value="صغير">📏 صغير</MenuItem>
                    <MenuItem value="كبير">📏 كبير</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={2.5}>
                <FormControl fullWidth size="small">
                  <InputLabel>طريقة التأثير بالمخزن *</InputLabel>
                  <Select
                    value={actionType}
                    label="طريقة التأثير بالمخزن *"
                    onChange={(e) => setActionType(e.target.value)}
                    sx={{ bgcolor: '#FFF' }}
                  >
                    <MenuItem value="deduct">🔻 خصم من المخزن (-)</MenuItem>
                    <MenuItem value="add">🟢 إنتاج / إضافة للمخزن (+)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} sm={2.5}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label={actionType === 'add' ? "الكمية المضافة (+)" : "الكمية المخصومة (-)"}
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder={supportsGrams && unitMode === 'gram' ? "مثال: 150" : "مثال: 0.150"}
                  InputProps={{
                    endAdornment: supportsGrams && (
                      <InputAdornment position="end">
                        <Select
                          value={unitMode}
                          onChange={(e) => setUnitMode(e.target.value)}
                          variant="standard"
                          disableUnderline
                          sx={{ fontSize: '0.85rem', fontWeight: 800, color: '#3B82F6', cursor: 'pointer', mr: 0.5 }}
                        >
                          <MenuItem value="base" sx={{ fontWeight: 700 }}>{itemUnit}</MenuItem>
                          <MenuItem value="gram" sx={{ fontWeight: 700 }}>{itemUnit === 'كجم' ? 'جرام' : 'ملّي'}</MenuItem>
                        </Select>
                      </InputAdornment>
                    )
                  }}
                  sx={{ bgcolor: '#FFF' }}
                />
              </Grid>

              <Grid xs={12} sm={1.5}>
                <Button
                  fullWidth
                  variant="contained"
                  onClick={handleAddIngredient}
                  startIcon={<AddIcon />}
                  sx={{ bgcolor: '#D97706', color: '#FFF', fontWeight: 800, py: 1, '&:hover': { bgcolor: '#B45309' } }}
                >
                  إضافة
                </Button>
              </Grid>
            </Grid>
          </Paper>
        )}

        {/* Current Linked Ingredients List */}
        {selectedProduct && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            <Typography variant="subtitle1" fontWeight={800} color="#1A1A2E">
              📋 الخامات المربوطة والمخصومة أوتوماتيكياً ({ingredients.length} خامة)
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: '14px', border: '1px solid #E2E8F0' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>اسم الخامة</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>الفئة</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>الحجم المخصص</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>الكمية بالوصفة</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>الوحدة</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>تكلفة التكعيب للمنتج</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>الرصيد المتاح حالياً</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>إلغاء الربط</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {ingredients.map((ing) => {
                    const ingQty = parseFloat(ing.quantity || 0);
                    const unitCost = parseFloat(ing.inventory_cost_per_unit || 0);
                    const itemCost = ingQty * unitCost;
                    const stock = parseFloat(ing.inventory_current_stock || 0);

                    return (
                      <TableRow key={ing.id} hover>
                        <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{ing.inventory_item_name || 'خامة'}</TableCell>
                        <TableCell sx={{ color: '#64748B', fontWeight: 600 }}>{ing.inventory_item_category || 'عام'}</TableCell>
                        <TableCell>
                          {ing.size === 'صغير' || ing.size === 'small' ? (
                            <Chip label="📏 صغير" size="small" sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 800 }} />
                          ) : ing.size === 'كبير' || ing.size === 'large' ? (
                            <Chip label="📏 كبير" size="small" sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 800 }} />
                          ) : (
                            <Chip label="🌐 الكل / عادي" size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 700 }} />
                          )}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: ingQty < 0 ? '#10B981' : '#DC2626' }}>
                          {ingQty < 0 ? `+ ${Math.abs(ingQty)} (إضافة)` : `- ${ingQty} (خصم)`}
                        </TableCell>
                        <TableCell sx={{ color: '#64748B' }}>{ing.inventory_item_unit || 'كجم'}</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#166534' }}>{itemCost.toFixed(2)} ج.م</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: stock <= 5 ? '#DC2626' : '#475569' }}>
                          {stock} {ing.inventory_item_unit}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="إلغاء ربط هذه الخامة بالمنتج">
                            <IconButton color="error" size="small" onClick={() => handleDeleteIngredient(ing.id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })}

                  {ingredients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8', fontWeight: 700 }}>
                        لا توجد خامات مربوطة بهذا المنتج بعد. أضف الخامات من الأعلى ليتم خصمها أوتوماتيكياً! 💡
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Financial & Profit Margin Summary Box */}
            {ingredients.length > 0 && (
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {isMultiSizeProduct ? (
                  <Grid container spacing={2}>
                    <Grid xs={12} sm={6}>
                      <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1.5px solid #FCD34D', textAlign: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#B45309">📏 حساب الحجم الصغير (السعر: {pPriceSmall} ج.م)</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">تكلفة الخامات</Typography>
                            <Typography variant="body1" fontWeight={900} color="#DC2626">{smallRecipeCost.toFixed(2)} ج.م</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">الربح الصافي</Typography>
                            <Typography variant="body1" fontWeight={900} color="#166534">{smallNetProfit.toFixed(2)} ج.م ({smallProfitMargin}%)</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>

                    <Grid xs={12} sm={6}>
                      <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#EFF6FF', border: '1.5px solid #93C5FD', textAlign: 'center' }}>
                        <Typography variant="subtitle2" fontWeight={800} color="#1E40AF">📏 حساب الحجم الكبير (السعر: {pPriceLarge} ج.م)</Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 1 }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary">تكلفة الخامات</Typography>
                            <Typography variant="body1" fontWeight={900} color="#DC2626">{largeRecipeCost.toFixed(2)} ج.م</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">الربح الصافي</Typography>
                            <Typography variant="body1" fontWeight={900} color="#1D4ED8">{largeNetProfit.toFixed(2)} ج.م ({largeProfitMargin}%)</Typography>
                          </Box>
                        </Box>
                      </Paper>
                    </Grid>
                  </Grid>
                ) : (
                  <Paper sx={{ p: 2, borderRadius: '14px', bgcolor: '#F0FDF4', border: '1px solid #BBF7D0', display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="#166534">سعر البيع للعميل</Typography>
                      <Typography variant="h6" fontWeight={900} color="#15803D">{sellingPrice} ج.م</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="#991B1B">تكلفة الخامات الإجمالية</Typography>
                      <Typography variant="h6" fontWeight={900} color="#DC2626">{totalRecipeCost.toFixed(2)} ج.م</Typography>
                    </Box>
                    <Divider orientation="vertical" flexItem />
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="caption" color="#1E40AF">الربح الصافي المتوقع</Typography>
                      <Typography variant="h6" fontWeight={900} color="#1D4ED8">{netProfit.toFixed(2)} ج.م ({profitMarginPercent}%)</Typography>
                    </Box>
                  </Paper>
                )}
              </Box>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, bgcolor: '#FAFCFF' }}>
        <Button onClick={onClose} variant="contained" sx={{ bgcolor: '#4F46E5', borderRadius: '10px', px: 4, fontWeight: 800 }}>
          إغلاق ومتابعة العمل
        </Button>
      </DialogActions>
    </Dialog>
  );
}
