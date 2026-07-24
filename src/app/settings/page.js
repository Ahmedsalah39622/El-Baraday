'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, TextField, Button, Grid, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Edit as EditIcon, Store, AccessTime, Security } from '@mui/icons-material';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useBranchStore } from '@/store/useBranchStore';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export default function SettingsPage() {
  const [tabValue, setTabValue] = useState(0);
  const { settings, updateSettings } = useSettingsStore();
  const { branches, fetchBranches, addBranch, updateBranch } = useBranchStore();

  const [localSettings, setLocalSettings] = useState({ companyName: '', address: '', phone: '', taxRate: 0, minTableCharge: 0, delivery_timer_minutes: 30 });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Branch Dialog
  const [branchDialogOpen, setBranchDialogOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState(null);
  const [newBranchName, setNewBranchName] = useState('');
  const [newBranchPhone, setNewBranchPhone] = useState('');
  const [newBranchAddress, setNewBranchAddress] = useState('');

  useEffect(() => {
    async function loadAllSettings() {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setLocalSettings(prev => ({
            ...prev,
            ...data,
            delivery_timer_minutes: parseInt(data.delivery_timer_minutes || 30)
          }));
        }
      } catch (err) {
        console.error(err);
      }
      fetchBranches();
    }
    loadAllSettings();
  }, []);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleSaveSettings = async () => {
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localSettings)
      });
      if (res.ok) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Save settings error:', err);
    }
  };

  const handleOpenAddBranch = () => {
    setEditingBranch(null);
    setNewBranchName('');
    setNewBranchPhone('');
    setNewBranchAddress('');
    setBranchDialogOpen(true);
  };

  const handleOpenEditBranch = (branch) => {
    setEditingBranch(branch);
    setNewBranchName(branch.name || '');
    setNewBranchPhone(branch.phone || '');
    setNewBranchAddress(branch.address || '');
    setBranchDialogOpen(true);
  };

  const handleSaveBranchSubmit = async () => {
    if (!newBranchName.trim()) return;

    if (editingBranch) {
      await updateBranch(editingBranch.id, {
        name: newBranchName.trim(),
        phone: newBranchPhone.trim(),
        address: newBranchAddress.trim()
      });
    } else {
      await addBranch({
        name: newBranchName.trim(),
        phone: newBranchPhone.trim(),
        address: newBranchAddress.trim()
      });
    }

    setBranchDialogOpen(false);
    setEditingBranch(null);
    setNewBranchName('');
    setNewBranchPhone('');
    setNewBranchAddress('');
    fetchBranches();
  };

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: '900px', mx: 'auto', pb: { xs: 10, md: 4 } }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 3 }}>
        إعدادات النظام وإدارة الفروع
      </Typography>

      {savedSuccess && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: '12px', fontWeight: 700 }}>
          تم حفظ الإعدادات ومدة تايمر الدليفري بنجاح!
        </Alert>
      )}

      <Paper sx={{ width: '100%', mb: 2, borderRadius: '14px' }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="إعدادات الشركة والأمان" icon={<Security />} iconPosition="start" />
          <Tab label="إدارة الفروع" icon={<Store />} iconPosition="start" />
        </Tabs>
      </Paper>

      {/* Tab 1: Company & Security & Timer Settings */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <Typography variant="h6" fontWeight={800} sx={{ mb: 2.5, color: '#1A1A2E' }}>
            ⚙️ البيانات الأساسية وتايمر الدليفري
          </Typography>
          <Grid container spacing={3}>
            <Grid xs={12} sm={6}>
              <TextField 
                label="اسم المطعم / الشركة" 
                fullWidth 
                value={localSettings.companyName || localSettings.company_name || ''} 
                onChange={e => setLocalSettings({...localSettings, companyName: e.target.value, company_name: e.target.value})} 
              />
            </Grid>
            <Grid xs={12} sm={6}>
              <TextField 
                label="التليفون الرئيسي" 
                fullWidth 
                value={localSettings.phone || localSettings.company_phone || ''} 
                onChange={e => setLocalSettings({...localSettings, phone: e.target.value, company_phone: e.target.value})} 
              />
            </Grid>
            <Grid xs={12}>
              <TextField 
                label="العنوان الرئيسي" 
                fullWidth 
                value={localSettings.address || localSettings.company_address || ''} 
                onChange={e => setLocalSettings({...localSettings, address: e.target.value, company_address: e.target.value})} 
              />
            </Grid>

            {/* Delivery Timer Security Setting */}
            <Grid xs={12}>
              <Paper sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#FFFBEB', border: '1.5px solid #F59E0B' }}>
                <Typography variant="subtitle1" fontWeight={800} sx={{ color: '#B45309', mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTime sx={{ color: '#D97706' }} /> مدة التوصيل المسموح بها لتايمر الدليفري (الأدمن فقط):
                </Typography>
                <Typography variant="body2" sx={{ color: '#78350F', mb: 2 }}>
                  هذه المدة تحدد العداد التنازلي الحسي للطلب بمجرد خروج الطيار بالطلب. التايمر يغير لونه من الأخضر إلى البرتقالي ثم الأحمر فور تجاوز هذه الدقائق.
                </Typography>
                <TextField 
                  label="وقت التوصيل المسموح (بالدقائق)" 
                  type="number"
                  fullWidth
                  value={localSettings.delivery_timer_minutes || 30} 
                  onChange={e => setLocalSettings({...localSettings, delivery_timer_minutes: parseInt(e.target.value) || 30})}
                  sx={{ bgcolor: '#FFF', maxWidth: '300px' }}
                />
              </Paper>
            </Grid>

            <Grid xs={12}>
              <Button variant="contained" size="large" onClick={handleSaveSettings} sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 4, py: 1.2, fontWeight: 800 }}>
                حفظ كافة الإعدادات والتايمر
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      {/* Tab 2: Multi-Branch Management */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1A1A2E">
                🏢 الفروع المسجلة للنظام ({branches.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                يمكن إضافة وتعديل الفروع وتعيين الكاشيرات والطيارين بكل فرع
              </Typography>
            </Box>
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleOpenAddBranch} sx={{ bgcolor: '#10B981', borderRadius: '10px', fontWeight: 800 }}>
              إضافة فرع جديد
            </Button>
          </Box>

          <List sx={{ border: '1px solid #E5E7EB', borderRadius: '14px', bgcolor: '#FAFCFF' }}>
            {branches.map(branch => (
              <ListItem key={branch.id} divider sx={{ py: 2 }}>
                <ListItemText 
                  primary={<Typography variant="subtitle1" fontWeight={800} color="#1A1A2E">{branch.name}</Typography>}
                  secondary={`العنوان: ${branch.address || 'غير محدد'} | الهاتف: ${branch.phone || 'غير محدد'}`} 
                />
                <ListItemSecondaryAction>
                  <Tooltip title="تعديل بيانات الفرع">
                    <IconButton color="primary" onClick={() => handleOpenEditBranch(branch)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        </Paper>
      </TabPanel>

      {/* Add / Edit Branch Dialog */}
      <Dialog open={branchDialogOpen} onClose={() => setBranchDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {editingBranch ? '✏️ تعديل بيانات الفرع' : '🏢 تسجيل فرع جديد للمحل'}
        </DialogTitle>
        <DialogContent sx={{ pt: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="اسم الفرع *" fullWidth size="small" value={newBranchName} onChange={e => setNewBranchName(e.target.value)} sx={{ mt: 1 }} />
          <TextField label="تليفون الفرع" fullWidth size="small" value={newBranchPhone} onChange={e => setNewBranchPhone(e.target.value)} />
          <TextField label="عنوان الفرع" fullWidth size="small" value={newBranchAddress} onChange={e => setNewBranchAddress(e.target.value)} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBranchDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSaveBranchSubmit} sx={{ bgcolor: '#4285F4', fontWeight: 800 }}>
            {editingBranch ? 'حفظ التعديلات' : 'حفظ الفرع'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
