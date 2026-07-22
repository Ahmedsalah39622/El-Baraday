'use client';

import { useState } from 'react';
import { 
  Box, Typography, Tabs, Tab, TextField, Button, Grid, Card, CardContent,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem,
  InputAdornment, FormControl, InputLabel, List, ListItem, ListItemText, ListItemSecondaryAction
} from '@mui/material';
import { 
  Add as AddIcon, Search as SearchIcon, Edit as EditIcon, Delete as DeleteIcon 
} from '@mui/icons-material';
import { useCustomerStore } from '@/store/useCustomerStore';
import { useInvoiceStore } from '@/store/useInvoiceStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function DeliveryPage() {
  const [tabValue, setTabValue] = useState(0);
  const { customers, addCustomer, updateCustomer, deleteCustomer, areas, addArea, deleteArea } = useCustomerStore();
  const { invoices } = useInvoiceStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [currentCustomer, setCurrentCustomer] = useState({ phone: '', name: '', address: '', area: '' });
  
  const [areaDialogOpen, setAreaDialogOpen] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  // Filtered Customers
  const filteredCustomers = customers.filter(c => 
    c.name.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  const handleSaveCustomer = () => {
    if (currentCustomer.id) {
      updateCustomer(currentCustomer.id, currentCustomer);
    } else {
      addCustomer({ ...currentCustomer, id: Date.now(), totalDealings: 0 });
    }
    setCustomerDialogOpen(false);
    setCurrentCustomer({ phone: '', name: '', address: '', area: '' });
  };

  const handleEditCustomer = (customer) => {
    setCurrentCustomer(customer);
    setCustomerDialogOpen(true);
  };

  const handleDeleteClick = (id) => {
    setItemToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteCustomer = () => {
    deleteCustomer(itemToDelete);
    setDeleteDialogOpen(false);
  };

  const handleSaveArea = () => {
    if (newAreaName) {
      addArea({ id: Date.now(), name: newAreaName });
      setNewAreaName('');
      setAreaDialogOpen(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        إدارة الدليفري
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="إدارة العملاء" />
          <Tab label="التعاملات" />
          <Tab label="غير مسددة" />
          <Tab label="المناطق" />
        </Tabs>
      </Paper>

      {/* Tab 1: Customers */}
      <TabPanel value={tabValue} index={0}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <TextField
            placeholder="بحث برقم التليفون أو الاسم..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment>,
            }}
            sx={{ width: '300px' }}
          />
          <Button 
            variant="contained" 
            startIcon={<AddIcon />} 
            onClick={() => {
              setCurrentCustomer({ phone: '', name: '', address: '', area: '' });
              setCustomerDialogOpen(true);
            }}
          >
            إضافة عميل جديد
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ bgcolor: 'background.default' }}>
                <TableCell fontWeight="bold">التليفون</TableCell>
                <TableCell fontWeight="bold">الاسم</TableCell>
                <TableCell fontWeight="bold">العنوان</TableCell>
                <TableCell fontWeight="bold">المنطقة</TableCell>
                <TableCell fontWeight="bold">حجم التعاملات</TableCell>
                <TableCell fontWeight="bold">إجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredCustomers.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{row.phone}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.address}</TableCell>
                  <TableCell>{row.area}</TableCell>
                  <TableCell>{row.totalDealings} ج.م</TableCell>
                  <TableCell>
                    <IconButton color="primary" onClick={() => handleEditCustomer(row)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDeleteClick(row.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {filteredCustomers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center">لا يوجد عملاء مطابقين للبحث</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* Tab 2: Dealings */}
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography color="text.secondary">إجمالي التعاملات</Typography><Typography variant="h5">0 ج.م</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography color="text.secondary">عدد الطلبات</Typography><Typography variant="h5">0</Typography></CardContent></Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card><CardContent><Typography color="text.secondary">آخر تعامل</Typography><Typography variant="h5">-</Typography></CardContent></Card>
          </Grid>
        </Grid>
        <Typography variant="body1" color="text.secondary" align="center">
          يرجى اختيار عميل لعرض سجل التعاملات الخاص به.
        </Typography>
      </TabPanel>

      {/* Tab 3: Unpaid */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="body1" color="text.secondary" align="center">
          لا يوجد طلبات دليفري غير مسددة.
        </Typography>
      </TabPanel>

      {/* Tab 4: Areas */}
      <TabPanel value={tabValue} index={3}>
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 3 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAreaDialogOpen(true)}>
            إضافة منطقة جديدة
          </Button>
        </Box>
        <Paper>
          <List>
            {areas?.map((area) => (
              <ListItem key={area.id} divider>
                <ListItemText primary={area.name} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" color="error" onClick={() => deleteArea(area.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {(!areas || areas.length === 0) && (
              <ListItem><ListItemText primary="لا يوجد مناطق مضافة." sx={{ textAlign: 'center', color: 'text.secondary' }}/></ListItem>
            )}
          </List>
        </Paper>
      </TabPanel>

      {/* Dialogs */}
      <Dialog open={customerDialogOpen} onClose={() => setCustomerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{currentCustomer.id ? 'تعديل بيانات العميل' : 'إضافة عميل جديد'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField label="التليفون" value={currentCustomer.phone} onChange={(e) => setCurrentCustomer({...currentCustomer, phone: e.target.value})} fullWidth />
            <TextField label="الاسم" value={currentCustomer.name} onChange={(e) => setCurrentCustomer({...currentCustomer, name: e.target.value})} fullWidth />
            <TextField label="العنوان" value={currentCustomer.address} onChange={(e) => setCurrentCustomer({...currentCustomer, address: e.target.value})} fullWidth />
            <FormControl fullWidth>
              <InputLabel>المنطقة</InputLabel>
              <Select value={currentCustomer.area} label="المنطقة" onChange={(e) => setCurrentCustomer({...currentCustomer, area: e.target.value})}>
                {areas?.map(a => <MenuItem key={a.id} value={a.name}>{a.name}</MenuItem>)}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomerDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveCustomer} variant="contained" color="primary">حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={areaDialogOpen} onClose={() => setAreaDialogOpen(false)}>
        <DialogTitle>إضافة منطقة جديدة</DialogTitle>
        <DialogContent>
          <TextField autoFocus margin="dense" label="اسم المنطقة" fullWidth variant="outlined" value={newAreaName} onChange={(e) => setNewAreaName(e.target.value)} sx={{ mt: 1 }}/>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAreaDialogOpen(false)}>إلغاء</Button>
          <Button onClick={handleSaveArea} variant="contained">حفظ</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>تأكيد الحذف</DialogTitle>
        <DialogContent>هل أنت متأكد من حذف هذا العميل نهائياً؟</DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button color="error" variant="contained" onClick={confirmDeleteCustomer}>حذف</Button>
        </DialogActions>
      </Dialog>

    </Box>
  );
}

