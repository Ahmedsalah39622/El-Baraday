'use client';

import { useState } from 'react';
import { 
  Box, Typography, Tabs, Tab, TextField, Button, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  InputAdornment, Dialog, DialogTitle, DialogContent, DialogActions, Grid
} from '@mui/material';
import { Search as SearchIcon, Replay as ReturnIcon } from '@mui/icons-material';
import { useInvoiceStore } from '@/store/useInvoiceStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function InvoicesPage() {
  const [tabValue, setTabValue] = useState(0);
  const { invoices } = useInvoiceStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [returnQty, setReturnQty] = useState(1);
  const [returnReason, setReturnReason] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleReturnClick = (item) => {
    setSelectedItem(item);
    setReturnQty(1);
    setReturnReason('');
    setReturnDialogOpen(true);
  };

  const confirmReturn = () => {
    // Process return logic here
    setReturnDialogOpen(false);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        الفواتير والمرتجعات
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="بحث / إرجاع منتج" />
          <Tab label="تقرير مرتجعات عام" />
          <Tab label="تقرير مرتجعات يوم محدد" />
        </Tabs>
      </Paper>

      {/* Tab 1: Search & Return */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ mb: 3 }}>
          <TextField
            placeholder="بحث برقم الفاتورة..."
            variant="outlined"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            slotProps={{
              input: {
                startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
              }
            }}
            sx={{ width: '400px' }}
          />
        </Box>
        <Typography color="text.secondary" align="center" sx={{ my: 4 }}>
          أدخل رقم الفاتورة للبحث وعرض عناصرها
        </Typography>
      </TabPanel>

      {/* Tab 2: General Returns Report */}
      <TabPanel value={tabValue} index={1}>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell fontWeight="bold">رقم الفاتورة</TableCell>
                <TableCell fontWeight="bold">المنتج</TableCell>
                <TableCell fontWeight="bold">الكمية</TableCell>
                <TableCell fontWeight="bold">المبلغ</TableCell>
                <TableCell fontWeight="bold">السبب</TableCell>
                <TableCell fontWeight="bold">التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} align="center">لا يوجد مرتجعات مسجلة</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 3: Specific Date Returns */}
      <TabPanel value={tabValue} index={2}>
        <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
          <TextField
            type="date"
            label="تاريخ البحث"
            slotProps={{ inputLabel: { shrink: true } }}
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            sx={{ width: '250px' }}
          />
          <Button variant="contained" size="large">عرض</Button>
        </Box>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell fontWeight="bold">رقم الفاتورة</TableCell>
                <TableCell fontWeight="bold">المنتج</TableCell>
                <TableCell fontWeight="bold">الكمية</TableCell>
                <TableCell fontWeight="bold">المبلغ</TableCell>
                <TableCell fontWeight="bold">السبب</TableCell>
                <TableCell fontWeight="bold">التاريخ</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} align="center">الرجاء اختيار تاريخ لعرض المرتجعات</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Return Dialog */}
      <Dialog open={returnDialogOpen} onClose={() => setReturnDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>إرجاع منتج</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Typography variant="subtitle1">المنتج: {selectedItem?.name || '-'}</Typography>
            <TextField 
              type="number" 
              label="الكمية المرتجعة" 
              value={returnQty} 
              onChange={(e) => setReturnQty(Math.max(1, parseInt(e.target.value) || 1))} 
              fullWidth 
            />
            <TextField 
              label="سبب الإرجاع" 
              value={returnReason} 
              onChange={(e) => setReturnReason(e.target.value)} 
              multiline 
              rows={3} 
              fullWidth 
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReturnDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={confirmReturn}>تأكيد الإرجاع</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

