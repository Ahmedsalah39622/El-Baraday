'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, MenuItem, Select, FormControl, InputLabel,
  Card, CardContent, Grid, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Tabs, Tab, Stack, Divider, Alert, CircularProgress,
  IconButton
} from '@mui/material';
import {
  CardGiftcard, EmojiEvents, Casino, Refresh, Print, TableChart,
  Celebration, Star, LocalOffer, CheckCircle, Person, Phone, Search,
  ConfirmationNumber, AutoAwesome, Replay, PictureAsPdf
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

  // WHEEL OF FORTUNE STATES
  const [spinName, setSpinName] = useState('');
  const [spinPhone, setSpinPhone] = useState('');
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [wheelWinner, setWheelWinner] = useState(null);
  const [wheelDialogOpen, setWheelDialogOpen] = useState(false);

  // RAFFLE DRAWER STATES
  const [rafflePrizeTitle, setRafflePrizeTitle] = useState('شاشة 55 بوصة سمارت - سحب البرادعي الكبرى 📺');
  const [raffleFilter, setRaffleFilter] = useState('all'); // 'all', 'monthly', 'vip'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTickerName, setCurrentTickerName] = useState('اضغط لبدء السحب العشوائي');
  const [tickerIndex, setTickerIndex] = useState(0);
  const [raffleWinner, setRaffleWinner] = useState(null);
  const [winnerDialogOpen, setWinnerDialogOpen] = useState(false);

  // HISTORY STATES
  const [drawsHistory, setDrawsHistory] = useState([]);
  const [spinsHistory, setSpinsHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

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
    fetchHistory();
  }, []);

  // Filter Raffle Candidates Pool
  const getCandidatesPool = () => {
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
        { id: '1', name: 'أحمد محمود العبد', phone: '01012345678', ordersCount: 15 },
        { id: '2', name: 'محمد علي الصوفي', phone: '01198765432', ordersCount: 22 },
        { id: '3', name: 'خالد عبد الفتاح', phone: '01234567890', ordersCount: 9 },
        { id: '4', name: 'محمود السويفي', phone: '01555544332', ordersCount: 18 },
        { id: '5', name: 'إبراهيم حسن', phone: '01099887766', ordersCount: 12 },
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
        // Final Pick
        const winningIndex = Math.floor(Math.random() * pool.length);
        const finalWinner = pool[winningIndex];

        setRaffleWinner(finalWinner);
        setIsDrawing(false);
        setWinnerDialogOpen(true);

        // Save winner to DB
        fetch('/api/prizes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prize_title: rafflePrizeTitle,
            winner_name: finalWinner.name,
            winner_phone: finalWinner.phone,
            customer_id: finalWinner.id,
            draw_type: 'raffle',
            notes: `سحب قرعة عشوائية (${raffleFilter === 'vip' ? 'VIP' : 'كافة العملاء'})`
          })
        }).then(() => fetchHistory());
      }
    }, 90);
  };

  // Wheel of Fortune Spin Handler
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

      // Save Spin Winner to DB
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

  // Print PDF Certificate / Report
  const handlePrintWinnersPDF = () => {
    const stats = [
      { title: 'إجمالي السحوبات والجوائز', value: `${drawsHistory.length + spinsHistory.length} فائز` },
      { title: 'سحوبات القرعة العشوائية', value: `${drawsHistory.length} جائزة` },
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
      title: 'تقرير وفائزين سحب الجوائز وعجلة الحظ',
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: 'الفرع الرئيسي',
      dateRangeStr: new Date().toLocaleDateString('ar-EG'),
      stats,
      columns,
      data: drawsHistory
    });
  };

  // Export Excel
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

  // INSTANT THERMAL RAFFLE COUPON PRINT HANDLER
  const [printCustomerName, setPrintCustomerName] = useState('');
  const [printCustomerPhone, setPrintCustomerPhone] = useState('');

  const handleDirectPrintCoupon = () => {
    if (!printCustomerName.trim()) return;
    const cNum = Math.floor(100000 + Math.random() * 900000);
    printRaffleCoupon({
      couponNumber: cNum,
      customerName: printCustomerName.trim(),
      customerPhone: printCustomerPhone.trim(),
      raffleTitle: rafflePrizeTitle,
      dateStr: new Date().toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }),
      branchName: 'مطعم البرادعي للحواوشي'
    });
    setPrintCustomerName('');
    setPrintCustomerPhone('');
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 52, height: 52, borderRadius: '16px', bgcolor: 'rgba(236, 72, 153, 0.1)', color: '#EC4899', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CardGiftcard sx={{ fontSize: 32 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1A1A2E', fontSize: { xs: '1.4rem', md: '1.8rem' } }}>
              السحب على الجوائز وعجلة الحظ 🎁
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إدارة القرعة العشوائية للعملاء، تجربة عجلة الحظ الفورية، وتوثيق أسماء الفائزين
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} flexWrap="wrap">
          <Button
            variant="contained"
            startIcon={<PictureAsPdf />}
            onClick={handlePrintWinnersPDF}
            sx={{ borderRadius: '12px', fontWeight: 800, bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }}
          >
            طباعة شهادات التقرير (PDF)
          </Button>

          <Button
            variant="contained"
            color="success"
            startIcon={<TableChart />}
            onClick={handleExportWinnersExcel}
            sx={{ borderRadius: '12px', fontWeight: 800 }}
          >
            تصدير Excel
          </Button>
        </Stack>
      </Box>

      {/* QUICK INSTANT RAFFLE TICKET THERMAL PRINTER CARD */}
      <Paper sx={{ p: 3, borderRadius: '20px', border: '2px solid #F59E0B', bgcolor: '#FFFBEB', boxShadow: '0 4px 20px rgba(245, 158, 11, 0.12)' }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: '#B45309', display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <ConfirmationNumber sx={{ fontSize: 26, color: '#D97706' }} />
          🎟️ طباعة إيصال / كوبون سحب حراري فوري (لوضعه في صندوق السحب)
        </Typography>
        <Typography variant="caption" sx={{ color: '#78350F', fontWeight: 700, display: 'block', mb: 2 }}>
          يكتب الكاشير/الموظف اسم العميل ورقم هاتفه ويضغط "طباعة الكوبون"، ليتم طباعة كوبون حراري مقاس 80mm فوري يُوضع في صندوق القرعة العلنية السحب!
        </Typography>

        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={5}>
            <TextField
              fullWidth
              required
              label="اسم العميل *"
              placeholder="أدخل اسم العميل..."
              value={printCustomerName}
              onChange={(e) => setPrintCustomerName(e.target.value)}
              sx={{ bgcolor: '#FFF', borderRadius: '12px' }}
            />
          </Grid>

          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              label="رقم الهاتف (اختياري)"
              placeholder="01012345678"
              value={printCustomerPhone}
              onChange={(e) => setPrintCustomerPhone(e.target.value)}
              sx={{ bgcolor: '#FFF', borderRadius: '12px' }}
            />
          </Grid>

          <Grid item xs={12} sm={3}>
            <Button
              fullWidth
              variant="contained"
              size="large"
              disabled={!printCustomerName.trim()}
              onClick={handleDirectPrintCoupon}
              startIcon={<Print fontSize="large" />}
              sx={{
                py: 1.6,
                borderRadius: '12px',
                fontWeight: 900,
                fontSize: '1.05rem',
                bgcolor: '#D97706',
                color: '#FFF',
                '&:hover': { bgcolor: '#B45309' },
                boxShadow: '0 6px 16px rgba(217, 119, 6, 0.3)'
              }}
            >
              طباعة الكوبون الآن 🎟️
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Tabs Navigation Bar */}
      <Paper elevation={2} sx={{ borderRadius: '16px', border: '1.5px solid #CBD5E1', bgcolor: '#FFF', sticky: 'top', top: 0, zIndex: 20 }}>
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="secondary"
          textColor="secondary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            minHeight: 54,
            '& .MuiTab-root': {
              minHeight: 54,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              fontWeight: 900,
              px: { xs: 2, md: 3 },
              color: '#475569',
              '&.Mui-selected': { color: '#EC4899', fontWeight: 900 }
            }
          }}
        >
          <Tab icon={<Casino sx={{ fontSize: 22 }} />} iconPosition="start" label="🎡 عجلة الحظ التفاعلية (Wheel of Fortune)" />
          <Tab icon={<ConfirmationNumber sx={{ fontSize: 22 }} />} iconPosition="start" label="🎟️ السحب العشوائي والقرعة الكبرى (Live Ticker)" />
          <Tab icon={<EmojiEvents sx={{ fontSize: 22, color: '#F59E0B' }} />} iconPosition="start" label="🏆 سجل ولوحة الفائزين السابقين" />
        </Tabs>
      </Paper>

      {/* TAB 0: INTERACTIVE WHEEL OF FORTUNE */}
      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3} alignItems="center">
          {/* Wheel Control Form & Inputs */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1.5px solid #CBD5E1', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoAwesome sx={{ color: '#EC4899' }} />
                بيانات العميل لتجربة عجلة الحظ
              </Typography>

              <Alert severity="info" sx={{ fontWeight: 700, borderRadius: '12px' }}>
                💡 أدخل اسم العميل ورقم هاتفه للتدوير، وسيتم تسجيل الجائزة المكسوبة في سجله فوراً!
              </Alert>

              <TextField
                fullWidth
                label="اسم العميل *"
                placeholder="مثال: أحمد محمود"
                value={spinName}
                onChange={(e) => setSpinName(e.target.value)}
              />

              <TextField
                fullWidth
                label="رقم الهاتف (اختياري)"
                placeholder="01012345678"
                value={spinPhone}
                onChange={(e) => setSpinPhone(e.target.value)}
              />

              <Button
                variant="contained"
                size="large"
                disabled={isSpinning}
                onClick={handleSpinWheel}
                startIcon={<Casino fontSize="large" />}
                sx={{
                  py: 1.8,
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  background: 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)',
                  boxShadow: '0 8px 24px rgba(236, 72, 153, 0.35)',
                  '&:hover': { background: 'linear-gradient(135deg, #DB2777 0%, #7C3AED 100%)' }
                }}
              >
                {isSpinning ? 'جاري تدوير العجلة...' : 'تدوير عجلة الحظ الآن 🎲'}
              </Button>
            </Paper>
          </Grid>

          {/* Graphical Rendered Spinning Wheel */}
          <Grid item xs={12} md={7} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <Box sx={{ position: 'relative', width: 340, height: 340, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {/* Pointer Indicator */}
              <Box
                sx={{
                  position: 'absolute',
                  top: -16,
                  zIndex: 10,
                  width: 0,
                  height: 0,
                  borderLeft: '16px solid transparent',
                  borderRight: '16px solid transparent',
                  borderTop: '28px solid #1E293B',
                  filter: 'drop-shadow(0 4px 6px rgba(0,0,0,0.3))'
                }}
              />

              {/* Outer Wheel Circle Container */}
              <Box
                sx={{
                  width: 320,
                  height: 320,
                  borderRadius: '50%',
                  border: '8px solid #1E293B',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.2)',
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
                {/* Sector Labels Rendering */}
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
                      <Typography variant="caption" sx={{ fontWeight: 900, color: sec.text, fontSize: '0.72rem', textShadow: '0 1px 3px rgba(0,0,0,0.6)' }}>
                        {sec.label}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Wheel Center Pin */}
              <Box
                sx={{
                  position: 'absolute',
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  bgcolor: '#FFFFFF',
                  border: '5px solid #1E293B',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  zIndex: 5
                }}
              >
                <Star sx={{ color: '#F59E0B', fontSize: 26 }} />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 1: LIVE TICKER RAFFLE DRAWER */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>
          {/* Raffle Controls */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ p: 3, borderRadius: '20px', border: '1.5px solid #CBD5E1', bgcolor: '#FFFFFF', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 900, color: '#1E293B', display: 'flex', alignItems: 'center', gap: 1 }}>
                <ConfirmationNumber sx={{ color: '#3B82F6' }} />
                إعدادات مسابقة السحب العشوائي
              </Typography>

              <TextField
                fullWidth
                label="عنوان الجائزة المسحوب عليها *"
                value={rafflePrizeTitle}
                onChange={(e) => setRafflePrizeTitle(e.target.value)}
              />

              <FormControl fullWidth>
                <InputLabel>نطاق الفئة المستهدفة للسحب</InputLabel>
                <Select
                  value={raffleFilter}
                  label="نطاق الفئة المستهدفة للسحب"
                  onChange={(e) => setRaffleFilter(e.target.value)}
                >
                  <MenuItem value="all">👥 جميع العملاء المسجلين بالمحل</MenuItem>
                  <MenuItem value="monthly">🧾 عملاء أوردرات الشهر الحالي</MenuItem>
                  <MenuItem value="vip">👑 كبار العملاء VIP (أعلى 20 عميل شراءً)</MenuItem>
                </Select>
              </FormControl>

              <Alert severity="warning" sx={{ fontWeight: 700, borderRadius: '12px' }}>
                🎟️ إجمالي المرشحين القابلين للدخول في هذا السحب: <strong>{getCandidatesPool().length} عميل</strong>
              </Alert>

              <Button
                variant="contained"
                size="large"
                disabled={isDrawing}
                onClick={handleStartRaffleDraw}
                startIcon={<Celebration fontSize="large" />}
                sx={{
                  py: 1.8,
                  borderRadius: '14px',
                  fontWeight: 900,
                  fontSize: '1.1rem',
                  bgcolor: '#3B82F6',
                  '&:hover': { bgcolor: '#2563EB' },
                  boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)'
                }}
              >
                {isDrawing ? 'جاري دوران العداد والسحب...' : 'بدء السحب العشوائي الآن 🚀'}
              </Button>
            </Paper>
          </Grid>

          {/* Live Slot Machine Ticker Display */}
          <Grid item xs={12} md={7}>
            <Paper
              sx={{
                p: 4,
                height: '100%',
                minHeight: 320,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
                color: '#FFFFFF',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                textAlign: 'center',
                boxShadow: '0 12px 36px rgba(0,0,0,0.3)',
                border: '2px solid #38BDF8'
              }}
            >
              <Typography variant="overline" sx={{ color: '#38BDF8', fontWeight: 900, fontSize: '1rem', letterSpacing: 2 }}>
                LIVE RANDOM WINNER TICKER
              </Typography>

              {/* Ticker Box */}
              <Box
                sx={{
                  my: 3,
                  py: 2.5,
                  px: 4,
                  width: '100%',
                  maxWidth: 420,
                  borderRadius: '20px',
                  bgcolor: 'rgba(255, 255, 255, 0.06)',
                  border: '2px solid #F59E0B',
                  boxShadow: 'inset 0 2px 12px rgba(0,0,0,0.5)',
                  transition: 'all 0.1s ease'
                }}
              >
                <Typography
                  variant="h3"
                  sx={{
                    fontWeight: 900,
                    color: isDrawing ? '#F59E0B' : '#FFFFFF',
                    fontSize: { xs: '1.4rem', md: '1.9rem' },
                    textShadow: isDrawing ? '0 0 16px rgba(245, 158, 11, 0.8)' : 'none'
                  }}
                >
                  {currentTickerName}
                </Typography>
              </Box>

              <Typography variant="body2" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                {isDrawing ? '⏳ العداد يدور عشوائياً بين كافة العملاء المرشحين...' : 'اضغط على زر "بدء السحب" لإتاحة إجراء القرعة العشوائية مباشرة أمام الحاضرين'}
              </Typography>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* TAB 2: HISTORICAL WINNERS WALL */}
      <TabPanel value={tabValue} index={2}>
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>تاريخ ووقت الفوز</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>اسم الفائز</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>رقم الهاتف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الجائزة المكسوبة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>نوع السحب</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
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
                    لا يوجد فائزين مسجلين سابقاً. قم بتجربة السحب العشوائي أو عجلة الحظ.
                  </TableCell>
                </TableRow>
              ) : (
                [...drawsHistory, ...spinsHistory.map(s => ({ id: s.id, winner_name: s.customer_name, winner_phone: s.customer_phone, prize_title: s.prize_won, draw_type: 'wheel', created_at: s.created_at }))].map((r, idx) => (
                  <TableRow key={r.id || idx} hover>
                    <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                    <TableCell sx={{ fontSize: '0.82rem', color: '#64748B' }}>
                      {r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : 'اليوم'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#1E293B' }}>{r.winner_name}</TableCell>
                    <TableCell sx={{ color: '#475569', fontWeight: 700 }}>{r.winner_phone || '—'}</TableCell>
                    <TableCell sx={{ fontWeight: 900, color: '#EC4899' }}>{r.prize_title}</TableCell>
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

      {/* WHEEL WINNER POPUP CELEBRATION MODAL */}
      <Dialog open={wheelDialogOpen} onClose={() => setWheelDialogOpen(false)} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1, textAlign: 'center' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.4rem', color: '#EC4899' }}>
          🎉 مبروووك الجائزة! 🎉
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <EmojiEvents sx={{ fontSize: 64, color: '#F59E0B' }} />
          <Typography variant="body1" sx={{ color: '#475569', fontWeight: 700 }}>
            مبروك للعميل <strong>{spinName || 'عميل المحل'}</strong> الفوز بجائزة عجلة الحظ:
          </Typography>
          <Paper variant="outlined" sx={{ p: 2, width: '100%', bgcolor: '#FDF2F8', borderColor: '#F472B6', borderRadius: '16px' }}>
            <Typography variant="h5" sx={{ fontWeight: 900, color: '#DB2777' }}>
              {wheelWinner?.label}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setWheelDialogOpen(false)} variant="contained" color="secondary" size="large" sx={{ borderRadius: '12px', fontWeight: 900, px: 4 }}>
            تم التسليم والإغلاق 👍
          </Button>
        </DialogActions>
      </Dialog>

      {/* RAFFLE WINNER CELEBRATION MODAL */}
      <Dialog open={winnerDialogOpen} onClose={() => setWinnerDialogOpen(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: '24px', p: 1.5, textAlign: 'center' } }}>
        <DialogTitle sx={{ fontWeight: 900, fontSize: '1.6rem', color: '#1E293B' }}>
          👑 الفائز بالجائزة الكبرى! 🏆
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, pt: 1 }}>
          <Celebration sx={{ fontSize: 72, color: '#3B82F6' }} />
          <Typography variant="subtitle1" sx={{ color: '#64748B', fontWeight: 700 }}>
            الجائزة: <strong>{rafflePrizeTitle}</strong>
          </Typography>

          <Paper elevation={3} sx={{ p: 3, width: '100%', bgcolor: '#EFF6FF', border: '2px solid #3B82F6', borderRadius: '20px' }}>
            <Typography variant="h4" sx={{ fontWeight: 900, color: '#1D4ED8', mb: 1 }}>
              🎉 {raffleWinner?.name} 🎉
            </Typography>
            <Typography variant="body1" sx={{ color: '#1E40AF', fontWeight: 800 }}>
              📞 رقم الهاتف: {raffleWinner?.phone}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'center' }}>
          <Button onClick={() => setWinnerDialogOpen(false)} variant="contained" size="large" sx={{ borderRadius: '14px', fontWeight: 900, px: 5, bgcolor: '#3B82F6' }}>
            اعتماد وتسليم الجائزة 🎁
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
