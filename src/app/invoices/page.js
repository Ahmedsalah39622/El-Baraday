'use client';

import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, TextField, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Grid,
  Card, CardContent, Chip, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert, CircularProgress, Divider, Stack, Autocomplete, Tabs, Tab
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Print as PrintIcon,
  Receipt as ReceiptIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  WhatsApp as WhatsAppIcon,
  FilterAlt as FilterIcon,
  Clear as ClearIcon,
  StickyNote2,
  Scale,
  CheckCircle as CheckIcon,
  PictureAsPdf,
  CalendarToday as CalendarIcon,
  Layers as LayersIcon,
  AttachMoney as MoneyIcon,
  ShoppingBag as BagIcon,
  Undo as UndoIcon
} from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useProductStore } from '@/store/useProductStore';
import { printCustomInvoice } from '@/lib/printReceipt';
import { generateReportPDF } from '@/lib/reportPdfExport';

export default function InvoicesPage() {
  const { 
    customInvoices, 
    loading, 
    fetchCustomInvoices, 
    addCustomInvoice, 
    updateCustomInvoice, 
    deleteCustomInvoice 
  } = useInvoiceStore();
  const { settings } = useSettingsStore();
  const { branches, selectedBranchId, setSelectedBranchId } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const effectiveBranch = (user && user.role !== 'admin' && user.branch_id) ? user.branch_id : selectedBranchId;

  const { products, fetchProducts } = useProductStore();

  // Main Navigation Tabs: 0 = المسودات والنوتات المعلقة, 1 = النوتات المحصلة والمنتهية, 2 = جدول حصر الأصناف
  const [mainTab, setMainTab] = useState(0);

  // Search and date filters for drafts list
  const [draftSearchQuery, setDraftSearchQuery] = useState('');
  const [draftDateFilter, setDraftDateFilter] = useState('');

  // Search and filters for collected invoices list
  const [collectedSearchQuery, setCollectedSearchQuery] = useState('');
  const [collectedDateFilter, setCollectedDateFilter] = useState('');
  const [collectedMethodFilter, setCollectedMethodFilter] = useState('all');

  // Collect & Finish Note Modal State (نافذة تحصيل وإنهاء النوتة)
  const [collectDialogOpen, setCollectDialogOpen] = useState(false);
  const [selectedNoteForCollect, setSelectedNoteForCollect] = useState(null);
  const [collectAmount, setCollectAmount] = useState('');
  const [collectMethod, setCollectMethod] = useState('cash');
  const [collectDate, setCollectDate] = useState(new Date().toISOString().split('T')[0]);
  const [collectNotes, setCollectNotes] = useState('');
  const [isSubmittingCollect, setIsSubmittingCollect] = useState(false);

  // Filters specifically for Aggregated Items Table
  const [aggDatePreset, setAggDatePreset] = useState('all');
  const [aggCustomDate, setAggCustomDate] = useState('');
  const [aggSearchItem, setAggSearchItem] = useState('');

  // Create / Edit Draft Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [formError, setFormError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const initialForm = {
    title: 'نوتة طلب',
    customer_name: '',
    customer_phone: '',
    invoice_date: new Date().toISOString().split('T')[0],
    amount: '0',
    paid_amount: '0',
    remaining_amount: '0',
    payment_status: 'draft',
    payment_method: 'cash',
    notes: '',
    items: [],
    extra_expenses: '',
    extra_expenses_notes: ''
  };

  const [formData, setFormData] = useState(initialForm);

  // New item input state inside modal
  const [newItem, setNewItem] = useState({
    product_name: '',
    quantity: '1',
    price: '',
    total: ''
  });

  // Printable View Dialog State
  const [viewInvoice, setViewInvoice] = useState(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);

  useEffect(() => {
    fetchCustomInvoices();
    fetchProducts();
  }, [effectiveBranch, selectedBranchId, user]);

  // 1. Pending / Unpaid Drafts (المسودات والنوتات المعلقة)
  const allDrafts = useMemo(() => {
    return customInvoices.filter(inv => {
      const isCollected = inv.payment_status === 'paid' || 
                          inv.payment_status === 'collected' || 
                          (inv.payment_status !== 'draft' && parseFloat(inv.paid_amount || 0) > 0 && parseFloat(inv.remaining_amount || 0) <= 0);
      if (isCollected) return false;
      const matchBranch = !effectiveBranch || effectiveBranch === 'all' || inv.branch_id === effectiveBranch || inv.branchId === effectiveBranch;
      return matchBranch;
    });
  }, [customInvoices, effectiveBranch]);

  // Filtered Drafts for the cards grid
  const filteredDrafts = useMemo(() => {
    return allDrafts.filter(draft => {
      if (draftDateFilter) {
        const invDate = draft.invoice_date ? draft.invoice_date.split('T')[0] : '';
        if (invDate !== draftDateFilter) return false;
      }
      if (draftSearchQuery.trim()) {
        const q = draftSearchQuery.toLowerCase().trim();
        const matchCustomer = draft.customer_name?.toLowerCase().includes(q);
        const matchPhone = draft.customer_phone?.includes(q);
        const matchNotes = draft.notes?.toLowerCase().includes(q);
        const matchItems = Array.isArray(draft.items) && draft.items.some(it => 
          (it.product_name && it.product_name.toLowerCase().includes(q)) ||
          (it.description && it.description.toLowerCase().includes(q))
        );
        if (!matchCustomer && !matchPhone && !matchNotes && !matchItems) return false;
      }
      return true;
    });
  }, [allDrafts, draftDateFilter, draftSearchQuery]);

  // 2. Collected / Finished Notes (النوتات والفواتير المحصلة والمنتهية)
  const allCollectedInvoices = useMemo(() => {
    return customInvoices.filter(inv => {
      const isCollected = inv.payment_status === 'paid' || 
                          inv.payment_status === 'collected' || 
                          (inv.payment_status !== 'draft' && parseFloat(inv.paid_amount || 0) > 0 && parseFloat(inv.remaining_amount || 0) <= 0);
      if (!isCollected) return false;
      const matchBranch = !effectiveBranch || effectiveBranch === 'all' || inv.branch_id === effectiveBranch || inv.branchId === effectiveBranch;
      return matchBranch;
    });
  }, [customInvoices, effectiveBranch]);

  // Filtered Collected Invoices for the table
  const filteredCollectedInvoices = useMemo(() => {
    return allCollectedInvoices.filter(inv => {
      if (collectedDateFilter) {
        const invDate = inv.invoice_date ? inv.invoice_date.split('T')[0] : '';
        if (invDate !== collectedDateFilter) return false;
      }
      if (collectedMethodFilter && collectedMethodFilter !== 'all') {
        if (inv.payment_method !== collectedMethodFilter) return false;
      }
      if (collectedSearchQuery.trim()) {
        const q = collectedSearchQuery.toLowerCase().trim();
        const matchCustomer = inv.customer_name?.toLowerCase().includes(q);
        const matchPhone = inv.customer_phone?.includes(q);
        const matchInvNum = inv.invoice_number?.toLowerCase().includes(q);
        const matchNotes = inv.notes?.toLowerCase().includes(q);
        const matchItems = Array.isArray(inv.items) && inv.items.some(it => 
          (it.product_name && it.product_name.toLowerCase().includes(q)) ||
          (it.description && it.description.toLowerCase().includes(q))
        );
        if (!matchCustomer && !matchPhone && !matchInvNum && !matchNotes && !matchItems) return false;
      }
      return true;
    });
  }, [allCollectedInvoices, collectedDateFilter, collectedMethodFilter, collectedSearchQuery]);

  // ========================================================
  // AGGREGATED ITEMS TABLE DATA & FILTERING
  // ========================================================
  const aggregatedItemsData = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];

    // 1. Filter drafts according to agg table filters
    const eligibleDrafts = allDrafts.filter(draft => {
      const invDate = draft.invoice_date ? draft.invoice_date.split('T')[0] : '';
      if (!invDate) return aggDatePreset === 'all';

      if (aggDatePreset === 'today') {
        return invDate === todayStr;
      } else if (aggDatePreset === 'yesterday') {
        const y = new Date();
        y.setDate(y.getDate() - 1);
        return invDate === y.toISOString().split('T')[0];
      } else if (aggDatePreset === 'week') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return invDate >= d.toISOString().split('T')[0];
      } else if (aggDatePreset === 'month') {
        const d = new Date();
        d.setDate(1);
        return invDate >= d.toISOString().split('T')[0];
      } else if (aggDatePreset === 'custom' && aggCustomDate) {
        return invDate === aggCustomDate;
      }
      return true;
    });

    // 2. Aggregate items across all eligible drafts
    const map = {};
    eligibleDrafts.forEach(draft => {
      const items = Array.isArray(draft.items) ? draft.items : [];
      items.forEach(it => {
        const rawName = (it.product_name || it.description || '').trim();
        if (!rawName) return;

        if (aggSearchItem.trim() && !rawName.toLowerCase().includes(aggSearchItem.toLowerCase().trim())) {
          return;
        }

        const qty = parseFloat(it.kilos || it.quantity || it.qty || 1);
        const price = parseFloat(it.price || 0);
        const total = parseFloat(it.total || (qty * price));
        const unit = it.kilos ? 'كجم' : 'عدد';

        if (!map[rawName]) {
          map[rawName] = {
            name: rawName,
            totalQty: 0,
            unit: unit,
            totalAmount: 0,
            notesCount: 0,
            draftIds: new Set()
          };
        }

        map[rawName].totalQty += qty;
        map[rawName].totalAmount += total;
        map[rawName].draftIds.add(draft.id);
      });
    });

    return Object.values(map).map(row => ({
      ...row,
      notesCount: row.draftIds.size,
      avgPrice: row.totalQty > 0 ? (row.totalAmount / row.totalQty) : 0
    })).sort((a, b) => b.totalQty - a.totalQty);

  }, [allDrafts, aggDatePreset, aggCustomDate, aggSearchItem]);

  // Aggregated Table Totals
  const aggGrandTotalQty = aggregatedItemsData.reduce((s, r) => s + r.totalQty, 0);
  const aggGrandTotalAmount = aggregatedItemsData.reduce((s, r) => s + r.totalAmount, 0);

  // Stats KPI cards for Drafts
  const totalDraftsCount = allDrafts.length;
  const totalDraftsAmount = allDrafts.reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);
  const todayStr = new Date().toISOString().split('T')[0];
  const todayDraftsCount = allDrafts.filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr)).length;
  const todayDraftsAmount = allDrafts
    .filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr))
    .reduce((acc, curr) => acc + (parseFloat(curr.amount) || 0), 0);

  // Stats KPI cards for Collected Invoices (النوتات المحصلة)
  const totalCollectedCount = allCollectedInvoices.length;
  const totalCollectedAmount = allCollectedInvoices.reduce((acc, curr) => acc + (parseFloat(curr.paid_amount || curr.amount) || 0), 0);
  const todayCollectedCount = allCollectedInvoices.filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr)).length;
  const todayCollectedAmount = allCollectedInvoices
    .filter(d => d.invoice_date && d.invoice_date.startsWith(todayStr))
    .reduce((acc, curr) => acc + (parseFloat(curr.paid_amount || curr.amount) || 0), 0);

  // ========================================================
  // MODAL HANDLERS (ADD / EDIT DRAFT)
  // ========================================================
  const handleOpenCreateModal = (draftToEdit = null) => {
    setFormError('');
    setNewItem({ product_name: '', quantity: '1', price: '', total: '' });

    if (draftToEdit) {
      setEditingDraftId(draftToEdit.id);
      setFormData({
        title: draftToEdit.title || 'مسودة / نوتة',
        customer_name: draftToEdit.customer_name || '',
        customer_phone: draftToEdit.customer_phone || '',
        invoice_date: draftToEdit.invoice_date ? draftToEdit.invoice_date.split('T')[0] : todayStr,
        amount: draftToEdit.amount ? draftToEdit.amount.toString() : '0',
        paid_amount: '0',
        remaining_amount: draftToEdit.amount ? draftToEdit.amount.toString() : '0',
        payment_status: 'draft',
        payment_method: draftToEdit.payment_method || 'cash',
        notes: draftToEdit.notes || '',
        items: Array.isArray(draftToEdit.items) ? draftToEdit.items : [],
        extra_expenses: (draftToEdit.extra_expenses !== undefined && draftToEdit.extra_expenses !== null && draftToEdit.extra_expenses !== 0) ? draftToEdit.extra_expenses.toString() : '',
        extra_expenses_notes: draftToEdit.extra_expenses_notes || ''
      });
    } else {
      setEditingDraftId(null);
      setFormData({
        ...initialForm,
        invoice_date: todayStr
      });
    }
    setDialogOpen(true);
  };

  // Product selection / typing
  const handleProductSelect = (val) => {
    const prodName = typeof val === 'string' ? val : (val?.name || '');
    const found = (products || []).find(p => p.name === prodName);
    const unitPrice = (found && found.price) ? found.price.toString() : newItem.price;
    const qNum = parseFloat(newItem.quantity) || 1;
    const pNum = parseFloat(unitPrice) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';

    setNewItem(prev => ({
      ...prev,
      product_name: prodName,
      price: unitPrice,
      total: tot
    }));
  };

  const handleItemQuantityChange = (val) => {
    const qNum = parseFloat(val) || 0;
    const pNum = parseFloat(newItem.price) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';
    setNewItem(prev => ({ ...prev, quantity: val, total: tot }));
  };

  const handleItemPriceChange = (val) => {
    const pNum = parseFloat(val) || 0;
    const qNum = parseFloat(newItem.quantity) || 0;
    const tot = (qNum > 0 && pNum > 0) ? (qNum * pNum).toFixed(2) : '';
    setNewItem(prev => ({ ...prev, price: val, total: tot }));
  };

  // Add Item to Draft (DOES NOT touch products or inventory!)
  const handleAddItemToDraft = () => {
    const prodName = (newItem.product_name || '').trim();
    if (!prodName) return;

    const qtyVal = parseFloat(newItem.quantity) || 1;
    const priceVal = parseFloat(newItem.price) || 0;
    const totalVal = parseFloat(newItem.total) || (qtyVal * priceVal);

    const updatedItems = [
      ...formData.items,
      {
        product_name: prodName,
        description: prodName,
        quantity: qtyVal,
        kilos: qtyVal,
        qty: qtyVal,
        price: priceVal,
        total: totalVal
      }
    ];

    const itemsSum = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const extraExp = parseFloat(formData.extra_expenses) || 0;
    const totalSum = itemsSum + extraExp;

    setFormData({
      ...formData,
      items: updatedItems,
      amount: totalSum.toString(),
      remaining_amount: totalSum.toString()
    });

    setNewItem({ product_name: '', quantity: '1', price: '', total: '' });
  };

  const handleRemoveItem = (index) => {
    const updatedItems = formData.items.filter((_, i) => i !== index);
    const itemsSum = updatedItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const extraExp = parseFloat(formData.extra_expenses) || 0;
    const totalSum = itemsSum + extraExp;

    setFormData({
      ...formData,
      items: updatedItems,
      amount: totalSum.toString(),
      remaining_amount: totalSum.toString()
    });
  };

  const handleExtraExpensesChange = (val) => {
    const extraExp = parseFloat(val) || 0;
    const itemsSum = (formData.items || []).reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const totalSum = itemsSum + extraExp;

    setFormData(prev => ({
      ...prev,
      extra_expenses: val,
      amount: totalSum.toString(),
      remaining_amount: totalSum.toString()
    }));
  };

  // Save draft directly to DB (via /api/invoices with payment_status: 'draft')
  const handleSaveDraft = async () => {
    if (!formData.customer_name.trim()) {
      setFormError('الرجاء إدخال اسم العميل أو عنوان المسودة');
      return;
    }

    // Auto-include pending item from input fields if user didn't click '+ إضافة الصنف'
    let currentItems = [...(formData.items || [])];
    if (newItem.product_name && newItem.product_name.trim()) {
      const qVal = parseFloat(newItem.quantity) || 1;
      const pVal = parseFloat(newItem.price) || 0;
      const tVal = parseFloat(newItem.total) || (qVal * pVal);
      currentItems.push({
        product_name: newItem.product_name.trim(),
        description: newItem.product_name.trim(),
        quantity: qVal,
        kilos: qVal,
        qty: qVal,
        price: pVal,
        total: tVal
      });
      setNewItem({ product_name: '', quantity: '1', price: '', total: '' });
    }

    const itemsSum = currentItems.reduce((acc, curr) => acc + (parseFloat(curr.total) || 0), 0);
    const extraExp = parseFloat(formData.extra_expenses) || 0;
    const finalAmount = itemsSum > 0 ? (itemsSum + extraExp) : (parseFloat(formData.amount) || 0);

    const payload = {
      ...formData,
      items: currentItems,
      title: formData.title || 'نوتة طلب',
      extra_expenses: extraExp,
      extra_expenses_notes: formData.extra_expenses_notes || '',
      amount: finalAmount.toString(),
      paid_amount: '0',
      remaining_amount: finalAmount.toString(),
      payment_status: 'draft',
      branch_id: effectiveBranch && effectiveBranch !== 'all' ? effectiveBranch : 'b1'
    };

    if (editingDraftId) {
      const res = await updateCustomInvoice(editingDraftId, payload);
      if (res.success) {
        setDialogOpen(false);
        setEditingDraftId(null);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء تعديل المسودة');
      }
    } else {
      const res = await addCustomInvoice(payload);
      if (res.success) {
        setDialogOpen(false);
      } else {
        setFormError(res.error || 'حدث خطأ أثناء إضافة المسودة');
      }
    }
  };

  const handleDeleteDraft = async (id) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذه المسودة من قاعدة البيانات؟')) {
      await deleteCustomInvoice(id);
    }
  };

  const handlePrint = (draft) => {
    printCustomInvoice(draft, settings, true);
  };

  const getWhatsAppShareUrl = (inv) => {
    let itemsText = '';
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      itemsText = '\n📦 *الأصناف والكميات:*\n' + inv.items.map(it => `• ${it.product_name || it.description} - ${it.kilos || it.quantity || it.qty} (${it.total || ((it.price || 0) * (it.kilos || it.qty || 1))} ج.م)`).join('\n');
    }
    const extraExpVal = parseFloat(inv.extra_expenses || 0);
    const extraExpText = extraExpVal > 0 
      ? `\n➕ *مصاريف إضافية:* ${extraExpVal} ج.م${inv.extra_expenses_notes ? ` (${inv.extra_expenses_notes})` : ''}` 
      : '';
    const text = `📝 *مسودة طلب / نوتة - مطعم البرادعي*\n👤 *الاسم:* ${inv.customer_name}\n📅 *التاريخ:* ${inv.invoice_date?.split('T')[0]}${itemsText}${extraExpText}\n💰 *المبلغ التقديري:* ${inv.amount} ج.م${inv.notes ? `\n💬 *ملاحظات:* ${inv.notes}` : ''}`;
    return `https://wa.me/${inv.customer_phone ? '2' + inv.customer_phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;
  };

  // Open Collect Dialog
  const handleOpenCollectDialog = (draft) => {
    setSelectedNoteForCollect(draft);
    setCollectAmount(draft.amount ? draft.amount.toString() : '0');
    setCollectMethod(draft.payment_method && draft.payment_method !== 'draft' ? draft.payment_method : 'cash');
    setCollectDate(todayStr);
    setCollectNotes('');
    setCollectDialogOpen(true);
  };

  // Confirm Collect & Finish Note
  const handleConfirmCollect = async () => {
    if (!selectedNoteForCollect) return;
    setIsSubmittingCollect(true);
    try {
      const totalAmt = parseFloat(selectedNoteForCollect.amount || 0);
      const paidAmt = parseFloat(collectAmount) || totalAmt;
      const remAmt = Math.max(0, totalAmt - paidAmt);
      const status = remAmt <= 0 ? 'paid' : 'partial';

      const payload = {
        ...selectedNoteForCollect,
        amount: totalAmt.toString(),
        paid_amount: paidAmt.toString(),
        remaining_amount: remAmt.toString(),
        payment_status: status,
        payment_method: collectMethod,
        invoice_date: collectDate || todayStr,
        notes: collectNotes 
          ? `${selectedNoteForCollect.notes ? selectedNoteForCollect.notes + ' | ' : ''}تحصيل: ${collectNotes}`
          : (selectedNoteForCollect.notes || null)
      };

      const res = await updateCustomInvoice(selectedNoteForCollect.id, payload);
      if (res.success) {
        setCollectDialogOpen(false);
        setSelectedNoteForCollect(null);
        setMainTab(1); // Switch to collected table automatically
      } else {
        alert(res.error || 'حدث خطأ أثناء تسجيل التحصيل');
      }
    } catch (e) {
      alert('حدث خطأ أثناء التحصيل: ' + e.message);
    } finally {
      setIsSubmittingCollect(false);
    }
  };

  // Reopen Collected Note as Draft
  const handleReopenAsDraft = async (invoice) => {
    if (!confirm(`هل تريد إلغاء تحصيل نوتة (${invoice.customer_name}) وإعادتها كمسودة جارية؟`)) return;
    try {
      const res = await updateCustomInvoice(invoice.id, {
        ...invoice,
        payment_status: 'draft',
        paid_amount: '0',
        remaining_amount: (invoice.amount || 0).toString()
      });
      if (res.success) {
        setMainTab(0);
      } else {
        alert(res.error || 'فشلت إعادة النوتة لمسودة');
      }
    } catch (e) {
      alert('حدث خطأ: ' + e.message);
    }
  };

  const getWhatsAppCollectedUrl = (inv) => {
    let itemsText = '';
    if (Array.isArray(inv.items) && inv.items.length > 0) {
      itemsText = '\n📦 *الأصناف والكميات:*\n' + inv.items.map(it => `• ${it.product_name || it.description} - ${it.kilos || it.quantity || it.qty} (${it.total || ((it.price || 0) * (it.kilos || it.qty || 1))} ج.م)`).join('\n');
    }
    const extraExpVal = parseFloat(inv.extra_expenses || 0);
    const extraExpText = extraExpVal > 0 
      ? `\n➕ *مصاريف إضافية:* ${extraExpVal} ج.م${inv.extra_expenses_notes ? ` (${inv.extra_expenses_notes})` : ''}` 
      : '';
    const methodText = inv.payment_method === 'cash' ? 'كاش الخزنة 💵' : inv.payment_method === 'vodafone_cash' ? 'فودافون كاش 📱' : inv.payment_method === 'visa' ? 'فيزا 💳' : (inv.payment_method || 'نقدي');
    const text = `🧾 *إيصال تحصيل نوتة - مطعم البرادعي*\n👤 *الاسم:* ${inv.customer_name}\n📅 *تاريخ التحصيل:* ${inv.invoice_date?.split('T')[0]}${itemsText}${extraExpText}\n💰 *المبلغ المحصل:* ${parseFloat(inv.paid_amount || inv.amount).toLocaleString()} ج.م\n💳 *طريقة الدفع:* ${methodText}\n✅ *الحالة:* تم التحصيل والإنهاء بنجاح.\n\nشكراً لتعاملكم معنا ❤️`;
    return `https://wa.me/${inv.customer_phone ? '2' + inv.customer_phone.replace(/\D/g, '') : ''}?text=${encodeURIComponent(text)}`;
  };

  const handlePrintCollectedReport = () => {
    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'رقم الفاتورة', accessor: (r) => r.invoice_number || `#${r.id?.slice(0, 6)}` },
      { label: 'تاريخ التحصيل', accessor: (r) => r.invoice_date ? r.invoice_date.split('T')[0] : '-' },
      { label: 'العميل', accessor: (r) => r.customer_name || 'عميل' },
      { label: 'الهاتف', accessor: (r) => r.customer_phone || '-' },
      { label: 'طريقة الدفع', accessor: (r) => r.payment_method === 'cash' ? 'كاش الخزنة' : r.payment_method === 'vodafone_cash' ? 'فودافون كاش' : r.payment_method === 'visa' ? 'فيزا' : (r.payment_method || 'نقدي') },
      { label: 'المبلغ المحصل', accessor: (r) => `${(parseFloat(r.paid_amount || r.amount) || 0).toLocaleString()} ج.م` }
    ];

    const totalAmt = filteredCollectedInvoices.reduce((s, r) => s + (parseFloat(r.paid_amount || r.amount) || 0), 0);

    const stats = [
      { title: 'إجمالي الفواتير المحصلة', value: `${filteredCollectedInvoices.length} فاتورة` },
      { title: 'إجمالي المبالغ المحصلة', value: `${totalAmt.toLocaleString()} ج.م` },
      { title: 'الفرع', value: effectiveBranch === 'b2' ? 'فرع المسلة' : (effectiveBranch === 'b1' ? 'فرع عزت' : 'كافة الفروع') }
    ];

    const totals = {
      0: '',
      1: '',
      2: '',
      3: 'الإجمالي الكلي',
      4: '',
      5: '',
      6: `${totalAmt.toLocaleString()} ج.م`
    };

    generateReportPDF({
      title: 'سجل النوتات والفواتير المحصلة والمنتهية',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: effectiveBranch === 'b2' ? 'فرع المسلة' : 'فرع عزت',
      dateRangeStr: todayStr,
      stats,
      columns,
      data: filteredCollectedInvoices,
      totals
    });
  };

  // Export Aggregated Items Table as PDF
  const handlePrintAggregatedReport = () => {
    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'اسم الصنف', accessor: 'name' },
      { label: 'إجمالي الكمية / العدد', accessor: (r) => `${r.totalQty} ${r.unit}` },
      { label: 'عدد المسودات المسجل بها', accessor: (r) => `${r.notesCount} مسودة` },
      { label: 'متوسط السعر', accessor: (r) => `${r.avgPrice.toFixed(2)} ج.م` },
      { label: 'إجمالي المبلغ التقديري', accessor: (r) => `${r.totalAmount.toLocaleString()} ج.م` }
    ];

    const stats = [
      { title: 'إجمالي الأصناف المختلفة', value: `${aggregatedItemsData.length} صنف` },
      { title: 'إجمالي الكميات المطلوبة', value: `${aggGrandTotalQty} كجم/قطعة` },
      { title: 'إجمالي المبالغ التقديرية', value: `${aggGrandTotalAmount.toLocaleString()} ج.م` },
      { title: 'الفترة الزمنية', value: aggDatePreset === 'today' ? 'اليوم' : aggDatePreset === 'yesterday' ? 'أمس' : aggDatePreset === 'all' ? 'كافة الفترات' : aggCustomDate || 'مخصصة' }
    ];

    const totals = {
      0: '',
      1: 'الإجمالي الكلي',
      2: `${aggGrandTotalQty}`,
      3: '',
      4: '',
      5: `${aggGrandTotalAmount.toLocaleString()} ج.م`
    };

    generateReportPDF({
      title: 'تقرير إجمالي الأصناف والكميات المطلوبة في المسودات',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: effectiveBranch === 'b2' ? 'فرع المسلة' : 'فرع عزت',
      dateRangeStr: aggDatePreset === 'today' ? `يوم ${todayStr}` : 'كافة الفترات',
      stats,
      columns,
      data: aggregatedItemsData,
      totals
    });
  };

  return (
    <Box sx={{ p: { xs: 1.5, md: 3 }, height: '100%', overflowY: 'auto', pb: 10 }}>

      {/* Main Page Header */}
      <Box className="no-print" sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="900" sx={{ color: '#d97706', display: 'flex', alignItems: 'center', gap: 1 }}>
            <StickyNote2 sx={{ fontSize: 38, color: '#d97706' }} />
            مسودات ونوتات الطلبات (Notes)
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            تسجيل وإدارة طلبات العملاء وحساب الكيلوهات والأسعار بحرية وسهولة، مع حصر إجمالي للأصناف المطلوبة.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Branch Switch Control (Admin Only) */}
          {isAdmin && (
            <Paper elevation={0} sx={{ borderRadius: '12px', p: 0.5, bgcolor: '#F1F5F9', border: '1px solid #E2E8F0' }}>
              <Tabs
                value={selectedBranchId || 'all'}
                onChange={(e, val) => setSelectedBranchId(val)}
                sx={{
                  minHeight: 36,
                  '& .MuiTab-root': {
                    minHeight: 36,
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    borderRadius: '8px',
                    mx: 0.2,
                    px: 1.8,
                    color: '#64748B',
                    '&.Mui-selected': { bgcolor: '#FFFFFF', color: '#0F172A', boxShadow: '0 2px 6px rgba(0,0,0,0.08)' }
                  },
                  '& .MuiTabs-indicator': { display: 'none' }
                }}
              >
                <Tab value="all" label="🌐 كل الفروع" />
                <Tab value="b1" label="🏢 فرع عزت" />
                <Tab value="b2" label="🏢 فرع المسلة" />
              </Tabs>
            </Paper>
          )}

          {/* Primary Action Button */}
          <Button
            variant="contained"
            size="large"
            startIcon={<AddIcon />}
            onClick={() => handleOpenCreateModal()}
            sx={{
              borderRadius: '12px',
              px: 3,
              py: 1.2,
              fontWeight: 900,
              fontSize: '1rem',
              bgcolor: '#d97706',
              '&:hover': { bgcolor: '#b45309' },
              boxShadow: '0 8px 20px rgba(217, 119, 6, 0.3)'
            }}
          >
            + إضافة نوتة جديدة 📝
          </Button>
        </Stack>
      </Box>

      {/* Navigation Tabs between Drafts, Collected Table, and Aggregated Items */}
      <Paper elevation={0} sx={{ borderRadius: '16px', border: '1px solid #E2E8F0', mb: 3, bgcolor: '#FFFFFF', p: 0.8 }} className="no-print">
        <Tabs
          value={mainTab}
          onChange={(e, val) => setMainTab(val)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              fontWeight: 800,
              fontSize: '0.95rem',
              py: 1.5,
              px: 3,
              borderRadius: '12px',
              minHeight: 46,
              mx: 0.5,
              transition: 'all 0.2s',
              color: '#64748B',
              '&.Mui-selected': {
                bgcolor: mainTab === 0 ? '#FEF3C7' : (mainTab === 1 ? '#DCFCE7' : '#EFF6FF'),
                color: mainTab === 0 ? '#92400E' : (mainTab === 1 ? '#15803D' : '#1D4ED8'),
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }
            },
            '& .MuiTabs-indicator': { display: 'none' }
          }}
        >
          <Tab
            icon={<StickyNote2 />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>📝 المسودات والنوتات المعلقة</span>
                <Chip label={allDrafts.length} size="small" sx={{ height: 22, fontWeight: 900, bgcolor: '#F59E0B', color: '#FFF' }} />
              </Box>
            }
          />
          <Tab
            icon={<CheckIcon />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>✅ النوتات المحصلة والمنتهية</span>
                <Chip label={allCollectedInvoices.length} size="small" sx={{ height: 22, fontWeight: 900, bgcolor: '#16A34A', color: '#FFF' }} />
              </Box>
            }
          />
          <Tab
            icon={<LayersIcon />}
            iconPosition="start"
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <span>📊 حصر الأصناف المجمعة</span>
                <Chip label={aggregatedItemsData.length} size="small" sx={{ height: 22, fontWeight: 900, bgcolor: '#3B82F6', color: '#FFF' }} />
              </Box>
            }
          />
        </Tabs>
      </Paper>

      {/* ========================================================
          TAB 0: PENDING DRAFTS (المسودات والنوتات المعلقة)
          ======================================================== */}
      {mainTab === 0 && (
        <Box>
          {/* KPI Cards for Drafts */}
          <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 3 }} className="no-print">
            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #d97706', bgcolor: '#fffdf8' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        إجمالي المسودات
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#92400e', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {totalDraftsCount} مسودة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        محفوظة بالداتابيز
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <StickyNote2 sx={{ color: '#d97706', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #16a34a', bgcolor: '#f8fdf9' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        المبالغ التقديرية
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#15803d', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {totalDraftsAmount.toLocaleString()} ج.م
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        قيمة المسودات
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MoneyIcon sx={{ color: '#16a34a', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #2563eb', bgcolor: '#f8faff' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        أصناف النوتات
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#1d4ed8', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {aggregatedItemsData.length} صنف
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        كميات: {aggGrandTotalQty}
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <BagIcon sx={{ color: '#2563eb', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #7c3aed', bgcolor: '#faf5ff' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        مسودات اليوم
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#6d28d9', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {todayDraftsCount} مسودة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        بتاريخ {todayStr}
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#f3e8ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CalendarIcon sx={{ color: '#7c3aed', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

      {/* Quick Summary Banner linking to collected notes and items */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 1.5, p: 1.8, mb: 3, bgcolor: '#FFFBEB', borderRadius: '14px', border: '1.5px solid #FDE68A' }} className="no-print">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <StickyNote2 sx={{ color: '#D97706' }} />
          <Typography variant="body2" fontWeight="800" color="#92400E">
            لديك {allDrafts.length} مسودة معلقة بقيمة {totalDraftsAmount.toLocaleString()} ج.م | تم تحصيل {allCollectedInvoices.length} نوتة بقيمة {totalCollectedAmount.toLocaleString()} ج.م
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
          <Button
            size="small"
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={() => setMainTab(1)}
            sx={{ bgcolor: '#16A34A', '&:hover': { bgcolor: '#15803D' }, fontWeight: 800, borderRadius: '8px' }}
          >
            عرض جدول المحصل ({allCollectedInvoices.length}) ✅
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<LayersIcon />}
            onClick={() => setMainTab(2)}
            sx={{ borderColor: '#D97706', color: '#B45309', fontWeight: 800, borderRadius: '8px' }}
          >
            كشف الأصناف المجمعة 📊
          </Button>
        </Stack>
      </Box>

      {/* ========================================================
          SECTION: DRAFTS CARDS LIST (كروت المسودات)
          ======================================================== */}
      <Box>
          {/* Drafts Search and Filter Bar */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }}>
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid xs={12} md={6}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="ابحث في المسودات (باسم العميل، اسم الصنف، رقم الهاتف، الملاحظات)..."
                  value={draftSearchQuery}
                  onChange={(e) => setDraftSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                      endAdornment: draftSearchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setDraftSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                        </InputAdornment>
                      ) : null
                    }
                  }}
                  sx={{ borderRadius: '10px' }}
                />
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="تصفية بتاريخ المسودة"
                  value={draftDateFilter}
                  onChange={(e) => setDraftDateFilter(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              {draftDateFilter && (
                <Grid xs={12} sm={6} md={3}>
                  <Button
                    variant="text"
                    size="small"
                    startIcon={<ClearIcon />}
                    onClick={() => setDraftDateFilter('')}
                    sx={{ fontWeight: 'bold', color: 'error.main' }}
                  >
                    إلغاء فلتر التاريخ
                  </Button>
                </Grid>
              )}
            </Grid>
          </Paper>

          {/* Cards Grid */}
          {filteredDrafts.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '2px dashed #FDE68A', bgcolor: '#FFFDF5' }}>
              <StickyNote2 sx={{ fontSize: 64, color: '#D97706', mb: 1.5 }} />
              <Typography variant="h6" fontWeight="bold" color="#92400E">
                لا توجد مسودات مطابقة للبحث أو الفلتر
              </Typography>
              <Typography variant="body2" color="#B45309" sx={{ mt: 0.5, mb: 2.5 }}>
                يمكنك كتابة وتسجيل أي طلبات أو أصناف بالكيلو والعدد في مسودة سريعة والرجوع إليها أو تحويلها لفاتورة في أي وقت.
              </Typography>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => handleOpenCreateModal()}
                sx={{ borderRadius: '10px', fontWeight: 'bold', bgcolor: '#D97706', '&:hover': { bgcolor: '#B45309' } }}
              >
                إنشاء مسودة جديدة الآن 📝
              </Button>
            </Paper>
          ) : (
            <Grid container spacing={2.5}>
              {filteredDrafts.map((draft) => (
                <Grid xs={12} sm={6} md={4} key={draft.id}>
                  <Card sx={{
                    borderRadius: '16px',
                    border: '1.5px solid #FDE68A',
                    bgcolor: '#FFFFFF',
                    boxShadow: '0 4px 14px rgba(217, 119, 6, 0.08)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    '&:hover': {
                      transform: 'translateY(-3px)',
                      boxShadow: '0 8px 24px rgba(217, 119, 6, 0.16)',
                      borderColor: '#F59E0B'
                    }
                  }}>
                    <CardContent sx={{ p: 2.5, pb: 1.5 }}>
                      {/* Card Header: Customer name & Date */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1.5 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="900" color="#78350F" sx={{ lineHeight: 1.2 }}>
                            {draft.customer_name}
                          </Typography>
                          <Typography variant="caption" color="#92400E" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.4, fontWeight: 700 }}>
                            <CalendarIcon sx={{ fontSize: 14 }} />
                            {draft.invoice_date?.split('T')[0] || todayStr}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<StickyNote2 sx={{ fontSize: '14px !important' }} />}
                          label="مسودة 📝"
                          size="small"
                          sx={{ bgcolor: '#FEF3C7', color: '#B45309', fontWeight: 900 }}
                        />
                      </Box>

                      {draft.customer_phone && (
                        <Typography variant="caption" color="#78350F" sx={{ display: 'block', mb: 1.5, fontWeight: 700 }}>
                          📞 {draft.customer_phone}
                        </Typography>
                      )}

                      {/* Items List (الصنف، العدد، السعر، المبلغ) */}
                      {Array.isArray(draft.items) && draft.items.length > 0 ? (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '10px', bgcolor: '#F8FAFC', border: '1px solid #E2E8F0' }}>
                          <Typography variant="caption" fontWeight="900" color="#475569" sx={{ display: 'block', mb: 0.8 }}>
                            الأصناف والكميات والأسعار:
                          </Typography>
                          <Stack spacing={0.8}>
                            {draft.items.map((it, i) => {
                              const itemQty = it.kilos || it.quantity || it.qty || 1;
                              const itemPrice = parseFloat(it.price || 0);
                              const itemTotal = parseFloat(it.total || (itemQty * itemPrice));
                              const unitLabel = it.kilos ? 'كجم' : 'عدد';

                              return (
                                <Box key={i} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flex: 1, overflow: 'hidden' }}>
                                    <Typography variant="body2" fontWeight="800" color="#0F172A" noWrap>
                                      {it.product_name || it.description}
                                    </Typography>
                                    <Chip
                                      size="small"
                                      label={`${itemQty} ${unitLabel}`}
                                      sx={{ height: 20, fontSize: '0.72rem', fontWeight: 800, bgcolor: '#FEF3C7', color: '#92400E' }}
                                    />
                                  </Box>
                                  <Box sx={{ textAlign: 'left', pl: 1 }}>
                                    <Typography variant="body2" fontWeight="900" color="#15803D">
                                      {itemTotal.toLocaleString()} ج.م
                                    </Typography>
                                    {itemPrice > 0 && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: '0.7rem' }}>
                                        ({itemPrice} ج.م / {unitLabel})
                                      </Typography>
                                    )}
                                  </Box>
                                </Box>
                              );
                            })}
                          </Stack>
                        </Box>
                      ) : (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '8px', bgcolor: '#FFFDF5', border: '1px dashed #FDE68A' }}>
                          <Typography variant="caption" color="#B45309">
                            مسودة بدون تفاصيل أصناف محددة
                          </Typography>
                        </Box>
                      )}

                      {/* Notes Text */}
                      {draft.notes && (
                        <Box sx={{ p: 1.2, mb: 1.5, borderRadius: '8px', bgcolor: 'rgba(254, 243, 199, 0.4)', borderRight: '3px solid #F59E0B' }}>
                          <Typography variant="body2" color="#78350F" sx={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem' }}>
                            💬 {draft.notes}
                          </Typography>
                        </Box>
                      )}

                      {/* Extra Expenses display if > 0 */}
                      {parseFloat(draft.extra_expenses || 0) > 0 && (
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 1, mb: 1.5, borderRadius: '8px', bgcolor: '#FFFBEB', border: '1px dashed #F59E0B' }}>
                          <Typography variant="body2" fontWeight="700" color="#B45309">
                            ➕ مصاريف إضافية {draft.extra_expenses_notes ? `(${draft.extra_expenses_notes})` : ''}:
                          </Typography>
                          <Typography variant="body2" fontWeight="900" color="#B45309">
                            +{parseFloat(draft.extra_expenses).toLocaleString()} ج.م
                          </Typography>
                        </Box>
                      )}

                      {/* Total Estimated Amount */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1.2, borderTop: '1px dashed #E2E8F0' }}>
                        <Typography variant="body2" color="#78350F" fontWeight="bold">المبلغ المقدر:</Typography>
                        <Typography variant="h6" fontWeight="900" color="#15803D">
                          {parseFloat(draft.amount || 0).toLocaleString()} ج.م
                        </Typography>
                      </Box>
                    </CardContent>

                    {/* Actions Bar */}
                    <Box sx={{ p: 2, pt: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                      {/* Primary Collect and Finish Button */}
                      <Button
                        fullWidth
                        variant="contained"
                        size="medium"
                        startIcon={<CheckIcon />}
                        onClick={() => handleOpenCollectDialog(draft)}
                        sx={{
                          borderRadius: '10px',
                          fontWeight: 900,
                          fontSize: '0.95rem',
                          py: 0.9,
                          bgcolor: '#16a34a',
                          '&:hover': { bgcolor: '#15803d' },
                          boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                          color: '#FFFFFF'
                        }}
                      >
                        تحصيل وإنهاء النوتة 💰✅
                      </Button>

                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Button
                          fullWidth
                          variant="outlined"
                          size="small"
                          startIcon={<EditIcon />}
                          onClick={() => handleOpenCreateModal(draft)}
                          sx={{
                            borderRadius: '8px',
                            fontWeight: 800,
                            borderColor: '#d97706',
                            color: '#d97706',
                            '&:hover': { bgcolor: '#FFFBEB', borderColor: '#b45309' }
                          }}
                        >
                          تعديل النوتة ✏️
                        </Button>

                        <Tooltip title="مشاركة عبر واتساب">
                          <IconButton
                            size="small"
                            component="a"
                            href={getWhatsAppShareUrl(draft)}
                            target="_blank"
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#16A34A' }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="طباعة النوتة">
                          <IconButton
                            size="small"
                            onClick={() => handlePrint(draft)}
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569' }}
                          >
                            <PrintIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="حذف النوتة من قاعدة البيانات">
                          <IconButton
                            size="small"
                            onClick={() => setDeleteTarget(draft)}
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#DC2626' }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Box>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
        </Box>
      )}

      {/* ========================================================
          TAB 1: COLLECTED INVOICES TABLE (جدول النوتات والفواتير المحصلة والمنتهية)
          ======================================================== */}
      {mainTab === 1 && (
        <Box>
          {/* KPI Cards for Collected Invoices */}
          <Grid container spacing={{ xs: 1.5, md: 2 }} sx={{ mb: 3 }} className="no-print">
            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #16a34a', bgcolor: '#f8fdf9' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        إجمالي المحصل
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#15803d', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {totalCollectedAmount.toLocaleString()} ج.م
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        نقدية مستلمة
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <MoneyIcon sx={{ color: '#16a34a', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #059669', bgcolor: '#f0fdf4' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        النوتات المنتهية
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#047857', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {totalCollectedCount} نوتة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        تم تحصيلها
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CheckIcon sx={{ color: '#059669', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #2563eb', bgcolor: '#f8faff' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        تحصيلات اليوم
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#1d4ed8', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {todayCollectedAmount.toLocaleString()} ج.م
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        عدد {todayCollectedCount} نوتة
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CalendarIcon sx={{ color: '#2563eb', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            <Grid xs={6} sm={6} md={3}>
              <Card sx={{ borderRadius: '16px', boxShadow: '0 4px 14px rgba(0,0,0,0.05)', borderRight: '4px solid #d97706', bgcolor: '#fffdf8' }}>
                <CardContent sx={{ p: { xs: 1.5, md: 2 }, '&:last-child': { pb: { xs: 1.5, md: 2 } } }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="caption" color="text.secondary" fontWeight="700" sx={{ fontSize: { xs: '0.7rem', md: '0.75rem' } }} noWrap display="block">
                        المسودات المتبقية
                      </Typography>
                      <Typography variant="h6" fontWeight="900" sx={{ mt: 0.5, color: '#92400e', fontSize: { xs: '1rem', md: '1.25rem' } }} noWrap>
                        {totalDraftsCount} مسودة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
                        بقيمة {totalDraftsAmount.toLocaleString()} ج.م
                      </Typography>
                    </Box>
                    <Box sx={{ width: { xs: 36, md: 46 }, height: { xs: 36, md: 46 }, borderRadius: '12px', bgcolor: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <StickyNote2 sx={{ color: '#d97706', fontSize: { xs: 20, md: 26 } }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Search & Filter Bar for Collected Table */}
          <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: '16px', border: '1px solid #E2E8F0', bgcolor: '#FFFFFF' }} className="no-print">
            <Grid container spacing={2} sx={{ alignItems: 'center' }}>
              <Grid xs={12} md={4}>
                <TextField
                  fullWidth
                  size="small"
                  placeholder="ابحث في المحصل (العميل، الهاتف، الفاتورة)..."
                  value={collectedSearchQuery}
                  onChange={(e) => setCollectedSearchQuery(e.target.value)}
                  slotProps={{
                    input: {
                      startAdornment: <InputAdornment position="start"><SearchIcon color="action" /></InputAdornment>,
                      endAdornment: collectedSearchQuery ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setCollectedSearchQuery('')}><ClearIcon fontSize="small" /></IconButton>
                        </InputAdornment>
                      ) : null
                    }
                  }}
                  sx={{ borderRadius: '10px' }}
                />
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="تصفية بتاريخ التحصيل"
                  value={collectedDateFilter}
                  onChange={(e) => setCollectedDateFilter(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>

              <Grid xs={12} sm={6} md={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>طريقة الدفع</InputLabel>
                  <Select
                    value={collectedMethodFilter}
                    label="طريقة الدفع"
                    onChange={(e) => setCollectedMethodFilter(e.target.value)}
                  >
                    <MenuItem value="all">كافة طرق الدفع</MenuItem>
                    <MenuItem value="cash">💵 كاش الخزنة</MenuItem>
                    <MenuItem value="vodafone_cash">📱 فودافون كاش</MenuItem>
                    <MenuItem value="visa">💳 فيزا / شبكة</MenuItem>
                    <MenuItem value="bank_transfer">🏦 تحويل بنكي</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid xs={12} md={2} sx={{ display: 'flex', gap: 1 }}>
                <Button
                  fullWidth
                  variant="outlined"
                  size="small"
                  startIcon={<PictureAsPdf />}
                  onClick={handlePrintCollectedReport}
                  disabled={filteredCollectedInvoices.length === 0}
                  sx={{
                    borderRadius: '10px',
                    fontWeight: 800,
                    borderColor: '#CBD5E1',
                    color: '#0F172A',
                    py: 1
                  }}
                >
                  طباعة الكشف
                </Button>
                {collectedDateFilter && (
                  <IconButton size="small" onClick={() => setCollectedDateFilter('')} sx={{ color: 'error.main' }}>
                    <ClearIcon fontSize="small" />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          </Paper>

          {/* Table Container */}
          {filteredCollectedInvoices.length === 0 ? (
            <Paper elevation={0} sx={{ p: 6, textAlign: 'center', borderRadius: '16px', border: '2px dashed #BBF7D0', bgcolor: '#F0FDF4' }}>
              <CheckIcon sx={{ fontSize: 64, color: '#16A34A', mb: 1.5 }} />
              <Typography variant="h6" fontWeight="bold" color="#14532D">
                لا توجد نوتات محصلة مطابقة للبحث أو الفلتر
              </Typography>
              <Typography variant="body2" color="#166534" sx={{ mt: 0.5, mb: 2.5 }}>
                عند النقر على زر "تحصيل وإنهاء النوتة" في أي مسودة، ستظهر هنا في هذا السجل مع حفظها بالكامل.
              </Typography>
              <Button
                variant="outlined"
                startIcon={<StickyNote2 />}
                onClick={() => setMainTab(0)}
                sx={{ borderRadius: '10px', fontWeight: 'bold', color: '#16A34A', borderColor: '#16A34A' }}
              >
                الرجوع لقائمة المسودات 📝
              </Button>
            </Paper>
          ) : (
            <>
              {/* Desktop Table */}
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '16px', overflowX: 'auto', display: { xs: 'none', md: 'block' } }}>
                <Table size="small">
                  <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800, width: 50 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>رقم الفاتورة</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>تاريخ التحصيل</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>العميل والهاتف</TableCell>
                      <TableCell sx={{ fontWeight: 800, minWidth: 220 }}>الأصناف والكميات</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>المبلغ الإجمالي</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>المحصل فعلياً</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>طريقة الدفع</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800 }}>الحالة</TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, width: 140 }}>إجراءات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredCollectedInvoices.map((inv, idx) => {
                      const itemsSummary = Array.isArray(inv.items) && inv.items.length > 0
                        ? inv.items.map(it => `${it.product_name || it.description} (${it.kilos || it.quantity || it.qty} ${it.kilos ? 'كجم' : ''})`).join(' ، ')
                        : 'طلب عام';

                      return (
                        <TableRow key={inv.id} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                          <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{idx + 1}</TableCell>
                          <TableCell sx={{ fontWeight: 800, color: '#0F172A' }}>
                            {inv.invoice_number || `#${inv.id?.slice(0, 6)}`}
                          </TableCell>
                          <TableCell sx={{ fontWeight: 700, color: '#475569' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarIcon sx={{ fontSize: 14, color: 'action.active' }} />
                              {inv.invoice_date ? inv.invoice_date.split('T')[0] : '-'}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="800" color="#0F172A">
                              {inv.customer_name}
                            </Typography>
                            {inv.customer_phone && (
                              <Typography variant="caption" color="text.secondary">
                                📞 {inv.customer_phone}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ fontSize: '0.85rem', color: '#334155' }}>
                            {itemsSummary}
                            {parseFloat(inv.extra_expenses || 0) > 0 && (
                              <Typography variant="caption" color="#B45309" sx={{ display: 'block', mt: 0.3, fontWeight: 700 }}>
                                ➕ مصاريف إضافية: {parseFloat(inv.extra_expenses)} ج.م
                              </Typography>
                            )}
                            {inv.notes && (
                              <Typography variant="caption" color="#64748B" sx={{ display: 'block', mt: 0.3 }}>
                                💬 {inv.notes}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                            {parseFloat(inv.amount || 0).toLocaleString()} ج.م
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 900, color: '#15803D', fontSize: '0.95rem' }}>
                            {parseFloat(inv.paid_amount || inv.amount || 0).toLocaleString()} ج.م
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              label={
                                inv.payment_method === 'cash' ? '💵 كاش الخزنة' :
                                inv.payment_method === 'vodafone_cash' ? '📱 فودافون كاش' :
                                inv.payment_method === 'visa' ? '💳 فيزا' :
                                inv.payment_method === 'bank_transfer' ? '🏦 تحويل بنكي' :
                                (inv.payment_method || 'نقدي')
                              }
                              size="small"
                              sx={{ fontWeight: 800, bgcolor: '#DCFCE7', color: '#166534' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Chip
                              icon={<CheckIcon sx={{ fontSize: '14px !important' }} />}
                              label="تم التحصيل ✅"
                              size="small"
                              sx={{ fontWeight: 900, bgcolor: '#BBF7D0', color: '#14532D' }}
                            />
                          </TableCell>
                          <TableCell align="center">
                            <Stack direction="row" spacing={0.5} justifyContent="center">
                              <Tooltip title="مشاركة وصل التحصيل عبر واتساب">
                                <IconButton
                                  size="small"
                                  component="a"
                                  href={getWhatsAppCollectedUrl(inv)}
                                  target="_blank"
                                  sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#16A34A' }}
                                >
                                  <WhatsAppIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="طباعة وصل التحصيل">
                                <IconButton
                                  size="small"
                                  onClick={() => handlePrint(inv)}
                                  sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#475569' }}
                                >
                                  <PrintIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="إلغاء التحصيل وإعادتها كمسودة جارية">
                                <IconButton
                                  size="small"
                                  onClick={() => handleReopenAsDraft(inv)}
                                  sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#D97706' }}
                                >
                                  <UndoIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="حذف السجل">
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteDraft(inv.id)}
                                  sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#DC2626' }}
                                >
                                  <DeleteIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {/* Grand Totals Row */}
                    <TableRow sx={{ bgcolor: '#DCFCE7' }}>
                      <TableCell colSpan={5} sx={{ fontWeight: 900, color: '#14532D', fontSize: '1rem' }}>
                        إجمالي المبالغ المحصلة والمنتهية ({filteredCollectedInvoices.length} فاتورة):
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 800, color: '#14532D', fontSize: '0.95rem' }}>
                        {filteredCollectedInvoices.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 900, color: '#15803D', fontSize: '1.05rem' }}>
                        {filteredCollectedInvoices.reduce((s, r) => s + (parseFloat(r.paid_amount || r.amount) || 0), 0).toLocaleString()} ج.م
                      </TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  </TableBody>
                </Table>
              </TableContainer>

              {/* Mobile Collected Cards (Modern Touch Cards for Phones) */}
              <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
                {filteredCollectedInvoices.map((inv) => {
                  const paidVal = parseFloat(inv.paid_amount || inv.amount || 0);
                  const totalVal = parseFloat(inv.amount || 0);
                  const hasItems = Array.isArray(inv.items) && inv.items.length > 0;

                  return (
                    <Paper
                      key={inv.id}
                      elevation={0}
                      sx={{
                        p: 2,
                        borderRadius: '16px',
                        border: '1px solid #BBF7D0',
                        bgcolor: '#FFFFFF',
                        boxShadow: '0 2px 8px rgba(22, 163, 74, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.2
                      }}
                    >
                      {/* Header: Invoice #, Date & Status */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#14532D' }}>
                            {inv.invoice_number || `#${inv.id?.slice(0, 6)}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 0.3, fontWeight: 700 }}>
                            <CalendarIcon sx={{ fontSize: 13 }} />
                            {inv.invoice_date ? inv.invoice_date.split('T')[0] : todayStr}
                          </Typography>
                        </Box>
                        <Chip
                          icon={<CheckIcon sx={{ fontSize: '13px !important' }} />}
                          label="تم التحصيل ✅"
                          size="small"
                          sx={{ bgcolor: '#DCFCE7', color: '#15803D', fontWeight: 900, height: 24, fontSize: '0.72rem' }}
                        />
                      </Box>

                      {/* Customer Name & Phone */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#1F2937' }}>
                          👤 {inv.customer_name}
                        </Typography>
                        {inv.customer_phone && (
                          <Typography
                            component="a"
                            href={`tel:${inv.customer_phone}`}
                            sx={{ color: '#2563EB', textDecoration: 'none', fontWeight: 700, fontSize: '0.8rem' }}
                          >
                            📞 {inv.customer_phone}
                          </Typography>
                        )}
                      </Box>

                      {/* Payment Method Badge */}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip
                          label={
                            inv.payment_method === 'cash' ? '💵 كاش الخزنة' :
                            inv.payment_method === 'vodafone_cash' ? '📱 فودافون كاش' :
                            inv.payment_method === 'visa' ? '💳 فيزا' :
                            (inv.payment_method || 'نقدي')
                          }
                          size="small"
                          sx={{ fontWeight: 800, bgcolor: '#F1F5F9', color: '#334155', height: 22, fontSize: '0.72rem' }}
                        />
                        {inv.notes && (
                          <Typography variant="caption" sx={{ color: '#64748B', fontStyle: 'italic' }}>
                            💬 {inv.notes}
                          </Typography>
                        )}
                      </Box>

                      {/* Items Preview */}
                      {hasItems && (
                        <Box sx={{ p: 1, bgcolor: '#F8FAFC', borderRadius: '10px', display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                          {inv.items.map((it, i) => (
                            <Chip
                              key={i}
                              label={`${it.product_name || it.description} (${it.kilos || it.quantity || it.qty} ${it.kilos ? 'كجم' : ''})`}
                              size="small"
                              sx={{ bgcolor: '#FFFFFF', border: '1px solid #E2E8F0', fontWeight: 700, fontSize: '0.7rem', height: 22 }}
                            />
                          ))}
                        </Box>
                      )}

                      {/* Amount & Actions */}
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #F1F5F9' }}>
                        <Box>
                          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', fontWeight: 700, fontSize: '0.7rem' }}>
                            المبلغ المحصل:
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803D', fontSize: '1.1rem' }}>
                            {paidVal.toLocaleString()} ج.م
                          </Typography>
                        </Box>

                        <Stack direction="row" spacing={0.8} alignItems="center">
                          <IconButton
                            size="small"
                            component="a"
                            href={getWhatsAppCollectedUrl(inv)}
                            target="_blank"
                            sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#16A34A', bgcolor: '#F0FDF4' }}
                          >
                            <WhatsAppIcon fontSize="small" />
                          </IconButton>
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<PrintIcon sx={{ fontSize: '16px !important' }} />}
                            onClick={() => handlePrint(inv)}
                            sx={{ borderRadius: '8px', fontWeight: 800, fontSize: '0.75rem', px: 1 }}
                          >
                            طباعة
                          </Button>
                          <Tooltip title="إعادة كمسودة">
                            <IconButton
                              size="small"
                              onClick={() => handleReopenAsDraft(inv)}
                              sx={{ border: '1px solid #CBD5E1', borderRadius: '8px', color: '#D97706', bgcolor: '#FFFBEB' }}
                            >
                              <UndoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Box>
                    </Paper>
                  );
                })}

                {/* Mobile Grand Total Summary Banner */}
                <Paper elevation={0} sx={{ p: 2, borderRadius: '14px', bgcolor: '#DCFCE7', border: '1.5px solid #86EFAC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ fontWeight: 900, color: '#14532D' }}>
                    إجمالي محصل ({filteredCollectedInvoices.length} نوتة):
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 900, color: '#15803D' }}>
                    {filteredCollectedInvoices.reduce((s, r) => s + (parseFloat(r.paid_amount || r.amount) || 0), 0).toLocaleString()} ج.م
                  </Typography>
                </Paper>
              </Box>
            </>
          )}
        </Box>
      )}

      {/* ========================================================
          TAB 2: AGGREGATED ITEMS TABLE (حصر الأصناف المجمعة في المسودات)
          ======================================================== */}
      {mainTab === 2 && (
        <Paper 
          elevation={0}
          sx={{ 
            p: 2.5, 
            mb: 4, 
            borderRadius: '16px', 
            border: '1.5px solid #E2E8F0', 
            bgcolor: '#FFFFFF',
            boxShadow: '0 4px 16px rgba(0,0,0,0.04)'
          }}
          className="no-print"
        >
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2, mb: 2.5 }}>
            <Box>
              <Typography variant="h6" fontWeight="900" sx={{ color: '#0F172A', display: 'flex', alignItems: 'center', gap: 1 }}>
                <LayersIcon sx={{ color: '#d97706' }} />
                جدول إجمالي الأصناف والكميات في كافة المسودات والنوتات 📊
              </Typography>
              <Typography variant="caption" color="text.secondary">
                حصر مجمع لكافة الأصناف والكيلوهات المطلوبة في النوتات مع إمكانية التصفية بحسب التاريخ والبحث.
              </Typography>
            </Box>

            <Button
              variant="outlined"
              size="small"
              startIcon={<PictureAsPdf />}
              onClick={handlePrintAggregatedReport}
              disabled={aggregatedItemsData.length === 0}
              sx={{
                borderRadius: '10px',
                fontWeight: 800,
                color: '#0F172A',
                borderColor: '#CBD5E1',
                '&:hover': { bgcolor: '#F8FAFC' }
              }}
            >
              طباعة كشف الأصناف المجمعة (PDF)
            </Button>
          </Box>

          {/* Filter Toolbar for the Aggregated Table */}
          <Grid container spacing={1.5} sx={{ alignItems: 'center', mb: 2, p: 1.5, bgcolor: '#F8FAFC', borderRadius: '12px' }}>
            <Grid xs={12} sm={4} md={3}>
              <TextField
                fullWidth
                size="small"
                placeholder="بحث باسم الصنف..."
                value={aggSearchItem}
                onChange={(e) => setAggSearchItem(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" color="action" /></InputAdornment>,
                    endAdornment: aggSearchItem ? (
                      <InputAdornment position="end">
                        <IconButton size="small" onClick={() => setAggSearchItem('')}><ClearIcon fontSize="small" /></IconButton>
                      </InputAdornment>
                    ) : null
                  }
                }}
                sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}
              />
            </Grid>

            <Grid xs={12} sm={4} md={3}>
              <FormControl fullWidth size="small" sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}>
                <InputLabel>فترة التقرير والتاريخ</InputLabel>
                <Select
                  value={aggDatePreset}
                  label="فترة التقرير والتاريخ"
                  onChange={(e) => setAggDatePreset(e.target.value)}
                >
                  <MenuItem value="all">📅 كل الفترات (كافة المسودات)</MenuItem>
                  <MenuItem value="today">⭐ اليوم ({todayStr})</MenuItem>
                  <MenuItem value="yesterday">🕒 أمس</MenuItem>
                  <MenuItem value="week">📊 آخر 7 أيام</MenuItem>
                  <MenuItem value="month">🗓️ هذا الشهر</MenuItem>
                  <MenuItem value="custom">🔍 يوم مخصص...</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {aggDatePreset === 'custom' && (
              <Grid xs={12} sm={4} md={3}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="اختر التاريخ"
                  value={aggCustomDate}
                  onChange={(e) => setAggCustomDate(e.target.value)}
                  slotProps={{ inputLabel: { shrink: true } }}
                  sx={{ bgcolor: '#FFFFFF', borderRadius: '8px' }}
                />
              </Grid>
            )}

            <Grid xs={12} sm={aggDatePreset === 'custom' ? 12 : 4} md={aggDatePreset === 'custom' ? 3 : 6} sx={{ textAlign: { xs: 'left', sm: 'right' } }}>
              <Chip
                label={`عدد الأصناف المحصورة: ${aggregatedItemsData.length} صنف | إجمالي: ${aggGrandTotalQty} كجم/قطعة`}
                sx={{ fontWeight: 800, bgcolor: '#FEF3C7', color: '#92400E' }}
              />
            </Grid>
          </Grid>

          {/* Table Container */}
          {aggregatedItemsData.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center', bgcolor: '#F8FAFC', borderRadius: '12px' }}>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">
                لا توجد أصناف مطابقة للفترة المحددة في المسودات المسجلة.
              </Typography>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #E2E8F0', borderRadius: '12px', overflowX: 'auto' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F1F5F9' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800, width: 60 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800, minWidth: 200 }}>اسم الصنف</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>إجمالي العدد / الكمية</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>عدد النوتات المسجل بها</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800 }}>متوسط السعر</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 800 }}>إجمالي المبلغ التقديري</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {aggregatedItemsData.map((row, idx) => (
                    <TableRow key={idx} hover sx={{ '&:nth-of-type(even)': { bgcolor: '#F8FAFC' } }}>
                      <TableCell sx={{ fontWeight: 700, color: 'text.secondary' }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#0F172A', fontSize: '0.95rem' }}>
                        {row.name}
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${row.totalQty} ${row.unit}`}
                          size="small"
                          sx={{ fontWeight: 900, bgcolor: '#DBEAFE', color: '#1D4ED8', fontSize: '0.85rem' }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#64748B' }}>
                        {row.notesCount} مسودة
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#475569' }}>
                        {row.avgPrice > 0 ? `${row.avgPrice.toFixed(2)} ج.م` : '-'}
                      </TableCell>
                      <TableCell align="left" sx={{ fontWeight: 900, color: '#15803D', fontSize: '0.95rem' }}>
                        {row.totalAmount.toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  ))}

                  {/* Grand Totals Row */}
                  <TableRow sx={{ bgcolor: '#FEF3C7' }}>
                    <TableCell colSpan={2} sx={{ fontWeight: 900, color: '#92400E', fontSize: '0.95rem' }}>
                      الإجمالي الكلي لجميع الأصناف:
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 900, color: '#92400E', fontSize: '1rem' }}>
                      {aggGrandTotalQty} (كجم / قطع)
                    </TableCell>
                    <TableCell align="center" sx={{ fontWeight: 800, color: '#92400E' }}>
                      {allDrafts.length} مسودة
                    </TableCell>
                    <TableCell align="center">-</TableCell>
                    <TableCell align="left" sx={{ fontWeight: 900, color: '#92400E', fontSize: '1.05rem' }}>
                      {aggGrandTotalAmount.toLocaleString()} ج.م
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Paper>
      )}

      {/* ========================================================
          DIALOG: COLLECT & COMPLETE NOTE (نافذة تحصيل وإنهاء النوتة)
          ======================================================== */}
      <Dialog
        open={collectDialogOpen}
        onClose={() => setCollectDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckIcon sx={{ color: '#16A34A', fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="900" color="#166534">
                تحصيل وإنهاء النوتة 💰
              </Typography>
              <Typography variant="caption" color="text.secondary">
                تسجيل استلام النقدية ونقل النوتة لجدول النوتات المنتهية
              </Typography>
            </Box>
          </Box>
          <IconButton size="small" onClick={() => setCollectDialogOpen(false)}>
            <ClearIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
          {/* Note Info Banner */}
          <Paper elevation={0} sx={{ p: 2, bgcolor: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: '14px' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1" fontWeight="900" color="#14532D">
                👤 العميل: {selectedNoteForCollect?.customer_name}
              </Typography>
              {selectedNoteForCollect?.customer_phone && (
                <Typography variant="caption" fontWeight="700" color="#166534">
                  📞 {selectedNoteForCollect.customer_phone}
                </Typography>
              )}
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px dashed #86EFAC' }}>
              <Typography variant="body2" fontWeight="700" color="#166534">
                المبلغ المقدر للنوتة:
              </Typography>
              <Typography variant="h5" fontWeight="900" color="#15803D">
                {parseFloat(selectedNoteForCollect?.amount || 0).toLocaleString()} ج.م
              </Typography>
            </Box>
          </Paper>

          {/* Amount to collect */}
          <TextField
            fullWidth
            label="المبلغ المحصل فعلياً (ج.م)"
            type="number"
            value={collectAmount}
            onChange={(e) => setCollectAmount(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start">ج.م</InputAdornment>
              }
            }}
            helperText={
              parseFloat(collectAmount || 0) < parseFloat(selectedNoteForCollect?.amount || 0)
                ? `⚠️ تحصيل جزئي: سيتبقى ${(parseFloat(selectedNoteForCollect?.amount || 0) - parseFloat(collectAmount || 0)).toLocaleString()} ج.م`
                : 'سيتم تسجيل النوتة كمدفوعة ومحصلة بالكامل'
            }
          />

          {/* Payment Method */}
          <FormControl fullWidth>
            <InputLabel>طريقة التحصيل / الدفع</InputLabel>
            <Select
              value={collectMethod}
              label="طريقة التحصيل / الدفع"
              onChange={(e) => setCollectMethod(e.target.value)}
            >
              <MenuItem value="cash">💵 كاش الخزنة (نقدية بالدرج)</MenuItem>
              <MenuItem value="vodafone_cash">📱 فودافون كاش / محفظة إلكترونية</MenuItem>
              <MenuItem value="visa">💳 فيزا / شبكة بنكية</MenuItem>
              <MenuItem value="bank_transfer">🏦 تحويل بنكي / إنستاباي</MenuItem>
            </Select>
          </FormControl>

          {/* Collection Date */}
          <TextField
            fullWidth
            type="date"
            label="تاريخ التحصيل"
            value={collectDate}
            onChange={(e) => setCollectDate(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />

          {/* Notes */}
          <TextField
            fullWidth
            multiline
            rows={2}
            label="ملاحظات التحصيل (اختياري)"
            placeholder="مثال: تم الاستلام نقداً من العميل يد بيد بالفرع..."
            value={collectNotes}
            onChange={(e) => setCollectNotes(e.target.value)}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2.5, gap: 1 }}>
          <Button
            variant="outlined"
            onClick={() => setCollectDialogOpen(false)}
            sx={{ borderRadius: '10px', fontWeight: 800, color: 'text.secondary' }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            disabled={isSubmittingCollect || !collectAmount || parseFloat(collectAmount) <= 0}
            onClick={handleConfirmCollect}
            sx={{
              borderRadius: '10px',
              fontWeight: 900,
              bgcolor: '#16A34A',
              '&:hover': { bgcolor: '#15803D' },
              px: 3
            }}
          >
            {isSubmittingCollect ? 'جاري التحصيل...' : 'تأكيد التحصيل وإنهاء النوتة ✅'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ========================================================
          DIALOG: ADD / EDIT DRAFT NOTE (نافذة إضافة مسودة سهلة وسريعة)
          ======================================================== */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '20px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.25rem', color: '#92400E', display: 'flex', alignItems: 'center', gap: 1 }}>
          <StickyNote2 sx={{ color: '#D97706' }} />
          {editingDraftId ? 'تعديل المسودة / النوتة 📝' : 'إضافة مسودة / نوتة جديدة 📝'}
        </DialogTitle>

        <DialogContent dividers>
          {formError && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
              {formError}
            </Alert>
          )}

          <Grid container spacing={2}>
            {/* Customer name / Note title */}
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                required
                label="اسم العميل أو عنوان النوتة (باسم مين؟)"
                placeholder="مثال: أمر الله، الحاج إبراهيم، طلب الحفلة..."
                value={formData.customer_name}
                onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                autoFocus
              />
            </Grid>

            {/* Note Date */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                type="date"
                label="تاريخ المسودة"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>

            {/* Phone */}
            <Grid xs={12} sm={3}>
              <TextField
                fullWidth
                label="رقم الهاتف (اختياري)"
                placeholder="010..."
                value={formData.customer_phone}
                onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
              />
            </Grid>

            {/* ADD ITEM SECTION (Free text or autocomplete without touching inventory/products) */}
            <Grid xs={12}>
              <Paper variant="outlined" sx={{ p: 2, borderRadius: '14px', bgcolor: '#FFFDF8', border: '1.5px solid #FDE68A' }}>
                <Typography variant="subtitle2" fontWeight="900" sx={{ display: 'flex', alignItems: 'center', gap: 0.8, color: '#92400E', mb: 1.5 }}>
                  <Scale sx={{ fontSize: 20, color: '#D97706' }} />
                  إضافة أصناف النوتة (اكتب أي صنف بحرية أو اختر من القائمة):
                </Typography>

                <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', md: 'nowrap' }, alignItems: 'center' }}>
                  <Autocomplete
                    freeSolo
                    sx={{ flex: { xs: '1 1 100%', md: 2.5 } }}
                    options={(products || []).map(p => p.name)}
                    value={newItem.product_name}
                    onInputChange={(e, val) => handleProductSelect(val)}
                    onChange={(e, val) => handleProductSelect(val || '')}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        size="small"
                        label="اسم الصنف (حر أو من القائمة)"
                        placeholder="اكتب أي صنف مثلاً: بصل، عجين، حواوشي..."
                      />
                    )}
                  />

                  <TextField
                    size="small"
                    type="number"
                    label="العدد / الوزن ⚖️"
                    placeholder="1"
                    sx={{ flex: { xs: '1 1 45%', md: 1.2 } }}
                    value={newItem.quantity}
                    onChange={(e) => handleItemQuantityChange(e.target.value)}
                    slotProps={{
                      htmlInput: { step: 'any', min: '0' },
                      input: {
                        endAdornment: <InputAdornment position="end">كجم/عدد</InputAdornment>
                      }
                    }}
                  />

                  <TextField
                    size="small"
                    type="number"
                    label="سعر الوحدة (ج.م)"
                    placeholder="0.00"
                    sx={{ flex: { xs: '1 1 45%', md: 1.2 } }}
                    value={newItem.price}
                    onChange={(e) => handleItemPriceChange(e.target.value)}
                    slotProps={{
                      htmlInput: { step: 'any', min: '0' },
                      input: {
                        endAdornment: <InputAdornment position="end">ج.م</InputAdornment>
                      }
                    }}
                  />

                  <Button
                    variant="contained"
                    onClick={handleAddItemToDraft}
                    disabled={!newItem.product_name.trim()}
                    startIcon={<AddIcon />}
                    sx={{
                      borderRadius: '8px',
                      px: 2.5,
                      py: 1,
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                      bgcolor: '#D97706',
                      '&:hover': { bgcolor: '#B45309' }
                    }}
                  >
                    + إضافة الصنف
                  </Button>
                </Box>

                {/* Table of added items */}
                {formData.items.length > 0 && (
                  <Box sx={{ mt: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ bgcolor: '#FEF3C7' }}>
                          <TableCell sx={{ fontWeight: 800 }}>اسم الصنف</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>العدد / الوزن</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>سعر الوحدة</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>الإجمالي</TableCell>
                          <TableCell align="center" sx={{ fontWeight: 800 }}>حذف</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {formData.items.map((item, idx) => (
                          <TableRow key={idx} hover>
                            <TableCell sx={{ fontWeight: 800 }}>{item.product_name || item.description}</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 700 }}>{item.kilos || item.quantity || item.qty}</TableCell>
                            <TableCell align="center">{parseFloat(item.price || 0).toLocaleString()} ج.م</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 900, color: '#15803D' }}>{parseFloat(item.total || 0).toLocaleString()} ج.م</TableCell>
                            <TableCell align="center">
                              <IconButton size="small" color="error" onClick={() => handleRemoveItem(idx)}>
                                <DeleteIcon fontSize="small" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Extra Expenses Section (مصاريف إضافية) */}
            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                type="number"
                label="مصاريف إضافية (توصيل، خدمة، تغليف...)"
                placeholder="0.00"
                value={formData.extra_expenses}
                onChange={(e) => handleExtraExpensesChange(e.target.value)}
                slotProps={{
                  htmlInput: { step: 'any', min: '0' },
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
              />
            </Grid>

            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                label="بيان المصاريف الإضافية (اختياري)"
                placeholder="مثال: دليفري، علب وتغليف، تجهيز صواني..."
                value={formData.extra_expenses_notes}
                onChange={(e) => setFormData(prev => ({ ...prev, extra_expenses_notes: e.target.value }))}
              />
            </Grid>

            {/* Notes */}
            <Grid xs={12} sm={8}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="ملاحظات المسودة"
                placeholder="أدخل أي تفاصيل خاصة بالطلب أو العنوان أو العميل..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </Grid>

            {/* Total Estimated Amount */}
            <Grid xs={12} sm={4}>
              <TextField
                fullWidth
                type="number"
                label="المبلغ المقدر الإجمالي (ج.م)"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                slotProps={{
                  input: {
                    endAdornment: <InputAdornment position="end">ج.م</InputAdornment>,
                  }
                }}
                helperText="يُحسب تلقائياً من مجموع الأصناف والمصاريف الإضافية"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, justifyContent: 'space-between' }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            إلغاء
          </Button>

          <Button
            variant="contained"
            onClick={handleSaveDraft}
            startIcon={<CheckIcon />}
            disabled={loading}
            sx={{
              borderRadius: '10px',
              fontWeight: 900,
              px: 3,
              py: 1,
              bgcolor: '#D97706',
              '&:hover': { bgcolor: '#B45309' }
            }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'حفظ المسودة بالداتابيز 💾'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px', p: 1 } }}
      >
        <DialogTitle sx={{ fontWeight: 900, color: '#DC2626', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeleteIcon color="error" />
          تأكيد حذف النوتة 🗑️
        </DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1, color: '#1E293B', fontWeight: 800 }}>
            هل أنت متأكد من رغبتك في حذف نوتة "{deleteTarget?.customer_name}" نهائياً من قاعدة البيانات؟
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            هذا الإجراء سيقوم بمسح النوتة وأصنافها المسجلة من النظام.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1, justifyContent: 'space-between' }}>
          <Button onClick={() => setDeleteTarget(null)} sx={{ fontWeight: 'bold', color: 'text.secondary' }}>
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={async () => {
              if (deleteTarget?.id) {
                await deleteCustomInvoice(deleteTarget.id);
                setDeleteTarget(null);
              }
            }}
            sx={{ borderRadius: '8px', fontWeight: 900, px: 2.5, bgcolor: '#DC2626', '&:hover': { bgcolor: '#B91C1C' } }}
          >
            نعم، حذف النوتة 🗑️
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
