'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, Stack, Divider, Alert, CircularProgress,
  IconButton, Autocomplete, InputAdornment
} from '@mui/material';
import {
  CardGiftcard, EmojiEvents, Casino, Refresh, Print, TableChart,
  Celebration, Star, LocalOffer, CheckCircle, Person, Phone, Search,
  ConfirmationNumber, AutoAwesome, Replay, PictureAsPdf, WorkspacePremium,
  FlashOn, Style, DoneAll
} from '@mui/icons-material';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';
import { generateReportPDF } from '@/lib/reportPdfExport';
import { exportToExcel } from '@/lib/exportToExcel';
import { printRaffleCoupon } from '@/lib/printReceipt';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3, pb: 4 }}>{children}</Box>}
    </div>
  );
}

const WHEEL_SECTORS = [
  { label: '🥪 حواوشي ميكس', color: '#EF4444', text: '#FFF' },
  { label: '🥤 مشروب مجاني', color: '#3B82F6', text: '#FFF' },
  { label: '🏷️ خصم 20%', color: '#10B981', text: '#FFF' },
  { label: '🍟 بطاطس فارم', color: '#F59E0B', text: '#FFF' },
  { label: '🎟️ تذكرة السحب', color: '#8B5CF6', text: '#FFF' },
  { label: '🎁 وجبة كاملة', color: '#EC4899', text: '#FFF' },
  { label: '🥩 طاجن لحمة', color: '#14B8A6', text: '#FFF' },
  { label: '🌟 100 ج.م كاش', color: '#6366F1', text: '#FFF' },
];

export default function PrizesPage() {
  const { customers, fetchCustomers } = useCustomerStore();
  const { invoices, fetchInvoices } = useInvoiceStore();

  const [tabValue, setTabValue] = useState(0);

  // INSTANT TICKET CREATION & CUSTOMER AUTO-FILL STATES
  const [printCustomerName, setPrintCustomerName] = useState('');
  const [printCustomerPhone, setPrintCustomerPhone] = useState('');
  const [selectedCustomerObj, setSelectedCustomerObj] = useState(null);
  const [previewCouponNum, setPreviewCouponNum] = useState(Math.floor(100000 + Math.random() * 900000).toString());
  const [couponsHistory, setCouponsHistory] = useState([]);
  const [isPrinting, setIsPrinting] = useState(false);

  // WHEEL OF FORTUNE STATES
  const [spinName, setSpinName] = useState('');
  const [spinPhone, setSpinPhone] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelWinner, setWheelWinner] = useState(null);
  const [wheelDialogOpen, setWheelDialogOpen] = useState(false);

  // RAFFLE DRAWER STATES
  const [rafflePrizeTitle, setRafflePrizeTitle] = useState('شاشة 55 بوصة سمارت - سحب البرادعي الكبرى 📺');
  const [raffleFilter, setRaffleFilter] = useState('coupons'); // 'coupons', 'all', 'monthly', 'vip'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTickerName, setCurrentTickerName] = useState('اضغط لبدء السحب العشوائي');
  const [raffleWinner, setRaffleWinner] = useState(null);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);

  // HISTORY STATES
  const [drawsHistory, setDrawsHistory] = useState([]);
  const [spinsHistory, setSpinsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchCoupons = async () => {
    try {
      const res = await fetch('/api/prizes/coupons');
      if (res.ok) {
        const data = await res.json();
        setCouponsHistory(data || []);
      }
    } catch (e) { }
  };

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const [dRes, sRes] = await Promise.all([
        fetch('/api/prizes'),
        fetch('/api/prizes/wheel')
      ]);

      if (dRes.ok) {
        const dData = await dRes.json();
        setDrawsHistory(dData || []);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        setSpinsHistory(sData || []);
      }
    } catch (e) {
      console.error('❌ Error fetching prizes history:', e);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    fetchInvoices();
    fetchCoupons();
    fetchHistory();
  }, []);

  // When customer selection changes -> Auto fill Name & Phone
  const handleSelectCustomer = (newValue) => {
    if (typeof newValue === 'string') {
      setPrintCustomerName(newValue);
      setSelectedCustomerObj(null);
    } else if (newValue && newValue.name) {
      setSelectedCustomerObj(newValue);
      setPrintCustomerName(newValue.name);
      setPrintCustomerPhone(newValue.phone || '');
    } else {
      setSelectedCustomerObj(null);
      setPrintCustomerName('');
      setPrintCustomerPhone('');
    }
  };

  // Direct Ticket Printer & DB Persistence
  const handleDirectPrintCoupon = async () => {
    if (!printCustomerName.trim()) return;
    setIsPrinting(true);
    const cNum = previewCouponNum;

    // 1. Print 80mm Thermal Receipt
    printRaffleCoupon({
      couponNumber: cNum,
      customerName: printCustomerName.trim(),
      customerPhone: printCustomerPhone.trim(),
      raffleTitle: rafflePrizeTitle,
      dateStr: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      branchName: 'مطعم البرادعي للحواوشي'
    });

    // 2. POST to Database API (/api/prizes/coupons)
    try {
      await fetch('/api/prizes/coupons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          coupon_number: cNum,
          customer_name: printCustomerName.trim(),
          customer_phone: printCustomerPhone.trim(),
          raffle_title: rafflePrizeTitle,
          printed_by: 'administrator'
        })
      });
      await fetchCoupons();
      await fetchCustomers();
    } catch (e) { }

    setIsPrinting(false);
    setPrintCustomerName('');
    setPrintCustomerPhone('');
    setSelectedCustomerObj(null);
    setPreviewCouponNum(Math.floor(100000 + Math.random() * 900000).toString());
  };

  // Filter Candidate Pool for Raffle
  const getCandidatesPool = () => {
    if (raffleFilter === 'coupons' && couponsHistory.length > 0) {
      return couponsHistory.map(c => ({
        id: c.id,
        name: `${c.customer_name} (كوبون #${c.coupon_number})`,
        phone: c.customer_phone || '—',
        couponNumber: c.coupon_number
      }));
    }

    let pool = (customers || []).map(c => ({
      id: c.id,
      name: c.name || 'عميل المحل',
      phone: c.phone || '—',
      ordersCount: (invoices || []).filter(inv => inv.customerPhone === c.phone || inv.customerName === c.name).length
    }));

    if (raffleFilter === 'monthly') {
      const thisMonth = new Date().toISOString().substring(0, 7);
      const activePhones = new Set((invoices || [])
        .filter(inv => inv.createdAt && inv.createdAt.startsWith(thisMonth))
        .map(inv => inv.customerPhone || inv.customerName));
      pool = pool.filter(c => activePhones.has(c.phone) || activePhones.has(c.name));
    } else if (raffleFilter === 'vip') {
      pool = pool.sort((a, b) => b.ordersCount - a.ordersCount).slice(0, 20);
    }

    if (pool.length === 0) {
      pool = [
        { id: '1', name: 'أحمد محمود العبد', phone: '01012345678' },
        { id: '2', name: 'محمد علي الصوفي', phone: '01198765432' },
        { id: '3', name: 'خالد عبد الفتاح', phone: '01234567890' },
      ];
    }

    return pool;
  };

  // Live Slot Ticker Raffle Animation
  const handleStartRaffleDraw = () => {
    const pool = getCandidatesPool();
    if (pool.length === 0) return;

    setIsDrawing(true);
    let count = 0;
    const totalTicks = 35;

    const interval = setInterval(() => {
      const randomCandidate = pool[Math.floor(Math.random() * pool.length)];
      setCurrentTickerName(randomCandidate.name);
      count++;

      if (count >= totalTicks) {
        clearInterval(interval);
        const winningIndex = Math.floor(Math.random() * pool.length);
        const finalWinner = pool[winningIndex];

        setRaffleWinner(finalWinner);
        setIsDrawing(false);
        setWinnerDialogOpen(true);

        // Save Winner to DB
        fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prize_title: rafflePrizeTitle,
            winner_name: finalWinner.name,
            winner_phone: finalWinner.phone,
            customer_id: finalWinner.id,
            draw_type: 'raffle',
            notes: `سحب قرعة علنية (${raffleFilter})`
          })
        }).then(() => fetchHistory());
      }
    }, 90);
  };

  // Wheel Spin Handler
  const handleSpinWheel = () => {
    if (isSpinning) return;
    setIsSpinning(true);
    setWheelWinner(null);

    const randomSectorIndex = Math.floor(Math.random() * WHEEL_SECTORS.length);
    const selectedPrize = WHEEL_SECTORS[randomSectorIndex];

    const sectorAngle = 360 / WHEEL_SECTORS.length;
    const extraSpins = 5 * 360;
    const targetAngle = extraSpins + (360 - (randomSectorIndex * sectorAngle) - (sectorAngle / 2));

    const finalRotation = wheelRotation + targetAngle;
    setWheelRotation(finalRotation);

    setTimeout(() => {
      setIsSpinning(false);
      setWheelWinner(selectedPrize);
      setWheelDialogOpen(true);

      fetch('/api/prizes/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: spinName.trim() || 'عميل المحل',
          customer_phone: spinPhone.trim() || '',
          prize_won: selectedPrize.label
        })
      }).then(() => fetchHistory());
    }, 4500);
  };

  // Print PDF Certificate Report
  const handlePrintWinnersPDF = () => {
    const stats = [
      { title: 'إجمالي الكوبونات بالداتابيز', value: `${couponsHistory.length} كوبون` },
      { title: 'إجمالي الفائزين بالقرعة', value: `${drawsHistory.length} فائز` },
      { title: 'جوائز عجلة الحظ', value: `${spinsHistory.length} جائزة` },
      { title: 'تاريخ التقرير', value: new Date().toLocaleDateString('ar-EG') }
    ];

    const columns = [
      { label: '#', accessor: (_, idx) => idx + 1 },
      { label: 'تاريخ الفوز', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : 'اليوم' },
      { label: 'اسم الفائز', accessor: 'winner_name' },
      { label: 'رقم الهاتف', accessor: (r) => r.winner_phone || '—' },
      { label: 'الجائزة المكسوبة', accessor: 'prize_title' },
      { label: 'نوع السحب', accessor: (r) => r.draw_type === 'wheel' ? '🎡 عجلة الحظ' : '🎟️ قرعة عشوائية' }
    ];

    generateReportPDF({
      title: 'تقرير الفائزين بالجوائز والكوبونات',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: 'الفرع الرئيسي',
      dateRangeStr: new Date().toLocaleDateString('ar-EG'),
      stats,
      columns,
      data: drawsHistory
    });
  };

  const handleExportWinnersExcel = () => {
    const columns = [
      { label: 'التاريخ والوقت', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : '' },
      { label: 'اسم الفائز', accessor: 'winner_name' },
      { label: 'رقم الهاتف', accessor: 'winner_phone' },
      { label: 'الجائزة', accessor: 'prize_title' },
      { label: 'نوع السحب', accessor: 'draw_type' }
    ];
    exportToExcel('سجل_الفائزين_بالجوائز', columns, drawsHistory);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, minHeight: '100vh', width: '100%', bgcolor: '#0B0F19', color: '#F8FAFC', pb: 14, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>
      
      {/* LUXURY NEON PAGE HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1E1B4B 0%, #0F172A 50%, #311042 100%)',
          border: '1px solid rgba(236, 72, 153, 0.3)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2.5
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 25px rgba(236, 72, 153, 0.5)'
            }}
          >
            <WorkspacePremium sx={{ fontSize: 38, color: '#FFF' }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#FFFFFF', fontSize: { xs: '1.5rem', md: '2rem' }, letterSpacing: 0.5 }}>
              مركز السحب على الجوائز والقرعة الكبرى 🎁
            </Typography>
            <Typography variant="body2" sx={{ color: '#A5B4FC', fontWeight: 700, mt: 0.5 }}>
              نظام إصدار الكوبونات الحرارية، السحب العشوائي الحي، وعجلة الحظ التفاعلية لعملاء مطعم البرادعي
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handlePrintWinnersPDF}
            sx={{ borderRadius: '14px', fontWeight: 900, py: 1.2, px: 2.5, bgcolor: '#1E293B', color: '#38BDF8', border: '1px solid #38BDF8', '&:hover': { bgcolor: '#334155' } }}
          >
            تقرير الفائزين (PDF)
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={<TableChart />}
            onClick={handleExportWinnersExcel}
            sx={{ borderRadius: '14px', fontWeight: 900, py: 1.2, px: 2.5, bgcolor: '#059669', '&:hover': { bgcolor: '#047857' } }}
          >
            تصدير Excel
          </Button>
        </Stack>
      </Paper>

      {/* DYNAMIC METRIC CARDS */}
      <Grid container spacing={2.5}>
        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ConfirmationNumber sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>إجمالي الكوبونات الصادرة</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#F59E0B' }}>{couponsHistory.length} كوبون</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <EmojiEvents sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>فائزين القرعة الكبرى</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#60A5FA' }}>{drawsHistory.length} فائز</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(236, 72, 153, 0.15)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Casino sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>ألعاب عجلة الحظ</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#F472B6' }}>{spinsHistory.length} لعبة</Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={6} md={3}>
          <Paper sx={{ p: 2.5, borderRadius: '20px', bgcolor: '#1E293B', border: '1px solid #334155', display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Person sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 800 }}>عملاء السيستم القابلين للدخول</Typography>
              <Typography variant="h5" sx={{ fontWeight: 900, color: '#34D399' }}>{customers.length} عميل</Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ULTRA-MODERN INSTANT TICKET GENERATOR & CUSTOMER SELECTOR CARD */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 2.5, md: 3.5 },
          borderRadius: '24px',
          background: 'linear-gradient(135deg, #1E293B 0%, #0F172A 100%)',
          border: '2px solid #F59E0B',
          boxShadow: '0 12px 40px rgba(245, 158, 11, 0.2)'
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 900, color: '#F59E0B', display: 'flex', alignItems: 'center', gap: 1 }}>
            <ConfirmationNumber sx={{ fontSize: 28 }} />
            🎟️ إصدار وطباعة كوبون سحب فوري
          </Typography>
          <Chip label={`رقم الكوبون: #${previewCouponNum}`} color="warning" size="small" sx={{ fontWeight: 900, fontSize: '0.85rem' }} />
        </Box>

        <Grid container spacing={3} alignItems="center">
          {/* Customer Selection & Direct Phone Fill */}
          <Grid item xs={12} md={7}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="caption" sx={{ color: '#CBD5E1', fontWeight: 800 }}>
                💡 اختر العميل من السيستم (أو أدخل بيانات عميل جديد لإصدار الكوبون فوراً):
              </Typography>

              <Autocomplete
                freeSolo
                options={customers || []}
                getOptionLabel={(option) => typeof option === 'string' ? option : `${option.name || ''} ${option.phone ? `(${option.phone})` : ''}`}
                value={selectedCustomerObj}
                onChange={(event, newValue) => handleSelectCustomer(newValue)}
                onInputChange={(event, newInputValue) => {
                  setPrintCustomerName(newInputValue);
                  const matched = (customers || []).find(c => c.phone === newInputValue || c.name === newInputValue);
                  if (matched) {
                    setPrintCustomerName(matched.name);
                    setPrintCustomerPhone(matched.phone || newInputValue);
                  }
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    required
                    label="ابحث باسم العميل أو رقم الهاتف *"
                    placeholder="اختر عميلاً مسجلاً أو أدخل عميلاً جديداً..."
                    slotProps={{
                      input: {
                        ...params.InputProps,
                        startAdornment: <InputAdornment position="start"><Search sx={{ color: '#F59E0B' }} /></InputAdornment>,
                      }
                    }}
                    sx={{
                      bgcolor: '#0F172A',
                      borderRadius: '14px',
                      '& .MuiOutlinedInput-root': { color: '#FFF', borderRadius: '14px' },
                      '& .MuiInputLabel-root': { color: '#94A3B8' }
                    }}
                  />
                )}
              />

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="اسم العميل *"
                    placeholder="اسم العميل..."
                    value={printCustomerName}
                    onChange={(e) => setPrintCustomerName(e.target.value)}
                    sx={{
                      bgcolor: '#0F172A',
                      borderRadius: '14px',
                      '& .MuiOutlinedInput-root': { color: '#FFF', borderRadius: '14px' },
                      '& .MuiInputLabel-root': { color: '#94A3B8' }
                    }}
                  />
                </Grid>

                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="رقم الهاتف *"
                    placeholder="01012345678"
                    value={printCustomerPhone}
                    onChange={(e) => setPrintCustomerPhone(e.target.value)}
                    sx={{
                      bgcolor: '#0F172A',
                      borderRadius: '14px',
                      '& .MuiOutlinedInput-root': { color: '#FFF', borderRadius: '14px' },
                      '& .MuiInputLabel-root': { color: '#94A3B8' }
                    }}
                  />
                </Grid>
              </Grid>

              <Button
                fullWidth
                variant="contained"
                size="large"
                disabled={!printCustomerName.trim() || isPrinting}
                onClick={handleDirectPrintCoupon}
                startIcon={<Print fontSize="large" />}
                sx={{
                  py: 1.8,
                  borderRadius: '16px',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
                  color: '#FFFFFF',
                  boxShadow: '0 8px 24px rgba(245, 158, 11, 0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' }
                }}
              >
                {isPrinting ? 'جاري طباعة الكوبون...' : 'طباعة كوبون السحب 🎟️'}
              </Button>
            </Box>
          </Grid>

          {/* Live Coupon Thermal Ticket Mockup Preview Card */}
          <Grid item xs={12} md={5}>
            <Paper
              elevation={4}
              sx={{
                p: 2.5,
                borderRadius: '20px',
                bgcolor: '#FFFFFF',
                color: '#000000',
                border: '2px dashed #000000',
                boxShadow: '0 10px 30px rgba(0,0,0,0.3)',
                textAlign: 'center',
                fontFamily: 'Cairo, sans-serif'
              }}
            >
              <Typography variant="overline" sx={{ color: '#64748B', fontWeight: 900, fontSize: '0.75rem' }}>
                معاينة شكل ورقة الكوبون الحرارية (80mm Thermal Receipt)
              </Typography>
              
              <Divider sx={{ my: 1, borderColor: '#000' }} />

              <Typography variant="subtitle1" sx={{ fontWeight: 900, color: '#000', fontSize: '1.1rem' }}>
                🎟️ كوبون دخول سحب الجوائز 🎟️
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 800, color: '#334155' }}>
                مطعم البرادعي للحواوشي
              </Typography>

              <Box sx={{ border: '2px solid #000', bgcolor: '#000', color: '#FFF', borderRadius: '8px', py: 1, my: 1.5 }}>
                <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: 1 }}>
                  رقم الكوبون: #{previewCouponNum}
                </Typography>
              </Box>

              <Box sx={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 0.5, px: 1, fontSize: '0.85rem' }}>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  👤 اسم العميل: <strong>{printCustomerName || 'عميل المحل'}</strong>
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 800 }}>
                  📞 رقم الهاتف: <strong>{printCustomerPhone || '—'}</strong>
                </Typography>
                <Typography variant="caption" sx={{ color: '#475569', fontWeight: 700 }}>
                  📅 التاريخ: {new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' })}
                </Typography>
              </Box>

              <Divider sx={{ my: 1.5, borderColor: '#000', borderStyle: 'dashed' }} />
              <Typography variant="caption" sx={{ fontWeight: 800, color: '#000', fontStyle: 'italic', display: 'block' }}>
                ✂️ تُقطع هذه الورقة وتوضع في صندوق السحب لدخول القرعة! 🎁
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </Paper>

      {/* MAIN TABS NAVIGATION BAR */}
      <Paper elevation={0} sx={{ borderRadius: '20px', border: '1px solid #334155', bgcolor: '#1E293B' }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="secondary"
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 56,
            '& .MuiTab-root': {
              minHeight: 56,
              fontSize: { xs: '0.85rem', md: '1rem' },
              fontWeight: 900,
              px: { xs: 2, md: 3 },
              color: '#94A3B8',
              '&.Mui-selected': { color: '#EC4899', fontWeight: 900 }
            }
          }}
        >
          <Tab icon={<Casino sx={{ fontSize: 24 }} />} iconPosition="start" label="🎡 عجلة الحظ التفاعلية (Wheel of Fortune)" />
          <Tab icon={<ConfirmationNumber sx={{ fontSize: 24 }} />} iconPosition="start" label="🎟️ سحب القرعة الكبرى (Live Slot Ticker)" />
          <Tab icon={<EmojiEvents sx={{ fontSize: 24, color: '#F59E0B' }} />} iconPosition="start" label="🏆 سجل الفائزين السابقين" />
        </Tabs>
      </Paper>

      {/* TAB 0: WHEEL OF FORTUNE */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} alignItems="center">
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid #334155', bgcolor: '#1E293B', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#F472B6', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome /> بيانات عميل عجلة الحظ
              </Typography>

              <TextField
                fullWidth
                label="اسم العميل *"
                placeholder="أدخل اسم العميل..."
                value={spinName}
                onChange={(e) => setSpinName(e.target.value)}
                sx={{ bgcolor: '#0F172A', borderRadius: '14px', '& .MuiOutlinedInput-root': { color: '#FFF' }, '& .MuiInputLabel-root': { color: '#94A3B8' } }}
              />

              <TextField
                fullWidth
                label="رقم الهاتف (اختياري)"
                placeholder="01012345678"
                value={spinPhone}
                onChange={(e) => setSpinPhone(e.target.value)}
                sx={{ bgcolor: '#0F172A', borderRadius: '14px', '& .MuiOutlinedInput-root': { color: '#FFF' }, '& .MuiInputLabel-root': { color: '#94A3B8' } }}
              />

              <Button
                variant="contained"
                size="large"
                disabled={isSpinning}
                onClick={handleSpinWheel}
                startIcon={<Casino fontSize="large" />}
                sx={{
                  py: 1.8,
                  borderRadius: '16px',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                  boxShadow: '0 8px 24px rgba(236, 72, 153, 0.4)',
                  '&:hover': { background: 'linear-gradient(135deg, #DB2777 0%, #7C3AED 100%)' }
                }}
              >
                {isSpinning ? 'جاري دوران عجلة الحظ...' : 'تدوير عجلة الحظ الآن 🎲'}
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ position: 'relative', width: 340, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box
                sx={{
                  position: 'absolute',
                  top: -16,
                  zIndex: 10,
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid transparent',
                  borderRight: '16px solid transparent',
                  borderTop: '28px solid #F472B6',
                  filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.5))'
                }}
              />

              <Box
                sx={{
                  width: 320,
                  height: 320,
                  borderRadius: '50%',
                  border: '8px solid #334155',
                  boxShadow: '0 0 40px rgba(236, 72, 153, 0.3)',
                  position: 'relative',
                  overflow: 'hidden',
                  transform: `rotate(${wheelRotation}deg)`,
                  transition: isSpinning ? 'transform 4.5s cubic-bezier(0.15, 0.85, 0.35, 1)' : 'none',
                  background: `conic-gradient(
                    #EF4444 0deg 45deg,
                    #3B82F6 45deg 90deg,
                    #10B981 90deg 135deg,
                    #F59E0B 135deg 180deg,
                    #8B5CF6 180deg 225deg,
                    #EC4899 225deg 270deg,
                    #14B8A6 270deg 315deg,
                    #6366F1 315deg 360deg
                  )`
                }}
              >
                {WHEEL_SECTORS.map((sec, idx) => {
                  const angle = idx * 45 + 22.5;
                  return (
                    <Box
                      key={idx}
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: 140,
                        height: 30,
                        marginTop: '-15px',
                        transformOrigin: '0% 50%',
                        transform: `rotate(${angle}deg)`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        pr: 2
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 900, color: sec.text, fontSize: '0.72rem', textShadow: '0 1px 3px rgba(0,0,0,0.8)' }}>
                        {sec.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              <Box
                sx={{
                  position: 'absolute',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#0F172A',
                  border: '4px solid #F472B6',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                  zIndex: 5
                }}
              >
                <Star sx={{ color: '#F59E0B', fontSize: 28 }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 1: RAFFLE TICKER DRAWER */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: '24px', border: '1px solid #334155', bgcolor: '#1E293B', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#60A5FA', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ConfirmationNumber /> إعدادات السحب الكبرى
              </Typography>

              <TextField
                fullWidth
                label="عنوان الجائزة المسحوب عليها *"
                value={rafflePrizeTitle}
                onChange={(e) => setRafflePrizeTitle(e.target.value)}
                sx={{ bgcolor: '#0F172A', borderRadius: '14px', '& .MuiOutlinedInput-root': { color: '#FFF' }, '& .MuiInputLabel-root': { color: '#94A3B8' } }}
              />

              <FormControl fullWidth>
                <InputLabel sx={{ color: '#94A3B8' }}>نطاق الفئة المستهدفة للسحب</InputLabel>
                <Select
                  value={raffleFilter}
                  label="نطاق الفئة المستهدفة للسحب"
                  onChange={(e) => setRaffleFilter(e.target.value)}
                  sx={{ bgcolor: '#0F172A', color: '#FFF', borderRadius: '14px' }}
                >
                  <MenuItem value="coupons">🎟️ الكوبونات المسجلة بالداتابيز ({couponsHistory.length} كوبون)</MenuItem>
                  <MenuItem value="all">👥 جميع العملاء المسجلين بالمحل</MenuItem>
                  <MenuItem value="monthly">🧾 عملاء أوردرات هذا الشهر</MenuItem>
                  <MenuItem value="vip">👑 كبار العملاء VIP (الأكثر شراءً)</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="warning" sx={{ fontWeight: 800, borderRadius: '14px', bgcolor: '#451A03', color: '#FCD34D' }}>
                🎟️ إجمالي المرشحين داخل صندوق السحب: <strong>{getCandidatesPool().length} مرشح</strong>
              </Alert>

              <Button
                variant="contained"
                size="large"
                disabled={isDrawing}
                onClick={handleStartRaffleDraw}
                startIcon={<Celebration fontSize="large" />}
                sx={{
                  py: 1.8,
                  borderRadius: '16px',
                  fontWeight: 900,
                  fontSize: '1.15rem',
                  bgcolor: '#3B82F6',
                  '&:hover': { bgcolor: '#2563EB' },
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.4)'
                }}
              >
                {isDrawing ? 'جاري تدوير العداد والسحب...' : 'بدء السحب العشوائي الآن 🚀'}
              </Button>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper
              sx={{
                p: 4,
                minHeight: 320,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E1B4B 100%)',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                border: '2px solid #F59E0B'
              }}
            >
              <Typography variant="overline" sx={{ color: '#F59E0B', fontWeight: 900, fontSize: '1rem', letterSpacing: 2 }}>
                🎰 VEGAS RANDOM WINNER TICKER
              </Typography>

              <Box
                sx={{
                  my: 3,
                  py: 2.5,
                  px: 4,
                  width: '100%',
                  maxWidth: 420,
                  borderRadius: '20px',
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  border: '2px solid #F59E0B',
                  boxShadow: '0 0 20px rgba(245, 158, 11, 0.3)'
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    color: isDrawing ? '#F59E0B' : '#FFFFFF',
                    fontSize: { xs: '1.3rem', md: '1.8rem' }
                  }}
                >
                  {currentTickerName}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 700 }}>
                {isDrawing ? '⏳ جاري اختيار الفائز عشوائياً بين كافة المرشحين...' : 'اضغط على زر "بدء السحب" لبدء العداد التفاعلي مباشرة'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 2: HISTORICAL AUDIT TABLE */}
      <TabPanel value={tabValue} index={2}>
        <TableContainer component={Paper} sx={{ borderRadius: '20px', bgcolor: '#1E293B', border: '1px solid #334155' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#0F172A' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>#</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>تاريخ ووقت الفوز</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>اسم الفائز</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>رقم الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>الجائزة المكسوبة</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>نوع السحب</TableCell>
                <TableCell sx={{ fontWeight: 900, color: '#F8FAFC' }}>الحالة</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loadingHistory ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4 }}><CircularProgress /></TableCell>
                </TableRow>
              ) : (drawsHistory.length === 0 && spinsHistory.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#94A3B8', fontWeight: 700 }}>
                    لا يوجد فائزين مسجلين سابقاً.
                  </TableCell>
                </TableRow>
              ) : (
                [...drawsHistory, ...spinsHistory.map(s => ({ id: s.id, winner_name: s.customer_name, winner_phone: s.customer_phone, prize_title: s.prize_won, draw_type: 'wheel', created_at: s.created_at }))].map((r, idx) => (
                  <TableRow key={r.id || idx} hover sx={{ '&:hover': { bgcolor: '#334155' } }}>
                    <TableCell sx={{ fontWeight: 800, color: '#CBD5E1' }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#94A3B8' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : 'اليوم'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#FFF' }}>{r.winner_name}</TableCell>
                    <TableCell sx={{ color: '#CBD5E1', fontWeight: 700 }}>{r.winner_phone || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#F472B6' }}>{r.prize_title}</TableCell>
                    <TableCell>
                      <Chip
                        label={r.draw_type === 'wheel' ? '🎡 عجلة الحظ' : '🎟️ قرعة عشوائية'}
                        color={r.draw_type === 'wheel' ? 'secondary' : 'primary'}
                        size="small"
                        sx={{ fontWeight: 800 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip label="تم التسليم 🎉" color="success" size="small" sx={{ fontWeight: 800 }} />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* WHEEL WINNER CELEBRATION MODAL */}
      <Dialog open={wheelDialogOpen} onClose={() => setWheelDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1, textAlign: 'center', bgcolor: '#1E293B', color: '#FFF' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#EC4899' }}>
          🎉 مبروووك الجائزة! 🎉
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <EmojiEvents sx={{ fontSize: 64, color: '#F59E0B' }} />
          <Typography variant="body1" sx={{ color: '#CBD5E1', fontWeight: 700 }}>
            مبروك للعميل <strong>{spinName || 'عميل المحل'}</strong> الفوز بجائزة عجلة الحظ:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, width: '100%', bgcolor: '#831843', borderColor: '#F472B6', borderRadius: '16px' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#FFF' }}>
              {wheelWinner?.label}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setWheelDialogOpen(false)} variant="contained" color="secondary" size="large" sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}>
            تسليم الجائزة والإغلاق 👍
          </Button>
        </DialogActions>
      </Dialog>

      {/* RAFFLE WINNER CELEBRATION MODAL */}
      <Dialog open={winnerDialogOpen} onClose={() => setWinnerDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1.5, textAlign: 'center', bgcolor: '#0F172A', color: '#FFF' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#F59E0B' }}>
          👑 الفائز بالجائزة الكبرى! 🏆
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <Celebration sx={{ fontSize: 72, color: '#F59E0B' }} />
          <Typography variant="subtitle1" sx={{ color: '#94A3B8', fontWeight: 700 }}>
            الجائزة: <strong>{rafflePrizeTitle}</strong>
          </Typography>

          <Paper elevation={4} sx={{ p: 3, width: '100%', bgcolor: '#1E1B4B', border: '2px solid #F59E0B', borderRadius: '20px' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#F59E0B', mb: 1 }}>
              🎉 {raffleWinner?.name} 🎉
            </Typography>
            <Typography variant="body1" sx={{ color: '#93C5FD', fontWeight: 800 }}>
              📞 رقم الهاتف: {raffleWinner?.phone}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setWinnerDialogOpen(false)} variant="contained" size="large" sx={{ borderRadius: '14px', fontWeight: 900, px: 5, bgcolor: '#F59E0B', color: '#000', '&:hover': { bgcolor: '#D97706' } }}>
            اعتماد وتسليم الجائزة 🎁
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
