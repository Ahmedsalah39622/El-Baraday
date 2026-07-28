'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, TextField, Button, Grid, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip,
  FormControlLabel, Switch, FormControl, InputLabel, Select, MenuItem
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon, Edit as EditIcon, Store, AccessTime, Security, WhatsApp } from '@mui/icons-material';
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

  const [localSettings, setLocalSettings] = useState({
    companyName: '', address: '', phone: '', taxRate: 0, minTableCharge: 0, delivery_timer_minutes: 30,
    whatsapp_enabled: 'true',
    whatsapp_mode: 'browser',
    whatsapp_provider: 'ultramsg',
    whatsapp_instance_id: '',
    whatsapp_token: '',
    whatsapp_api_url: ''
  });
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

    try {
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
    } catch (err) {
      alert('❌ حدث خطأ أثناء حفظ الفرع: ' + (err.message || 'خطأ غير معروف'));
    }
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
          <Tab label="رسائل الواتساب والتنبيهات" icon={<WhatsApp sx={{ color: '#25D366' }} />} iconPosition="start" />
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

      {/* Tab 3: WhatsApp Automatic Messaging & API Settings */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 4, borderRadius: '20px', border: '1px solid #E5E7EB' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: '#DCFCE7', color: '#15803D', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <WhatsApp sx={{ fontSize: 28 }} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight={800} color="#1A1A2E">
                📱 إعدادات إرسال رسائل الواتساب والتنبيهات للعملاء
              </Typography>
              <Typography variant="caption" color="text.secondary">
                إرسال رسالة أوتوماتيكية للعميل فور إنشاء طلب دليفري تحتوي على التفاصيل ورقم تليفون طيار التوصيل
              </Typography>
            </Box>
          </Box>

          <Grid container spacing={3}>
            {/* Enable/Disable Toggle */}
            <Grid xs={12}>
              <Paper sx={{ p: 2.5, borderRadius: '14px', bgcolor: '#F9FAFB', border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight={800} color="#1A1A2E">
                    تفعيل إرسال الرسائل الأوتوماتيكية عند إنشاء طلب الدليفري
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    عند تفعيل هذا الخيار، سيتم تجهيز وإرسال تفاصيل الطلب ورقم الطيار للعميل فوراً بعد الضغط على إتمام الطلب
                  </Typography>
                </Box>
                <Switch
                  checked={localSettings.whatsapp_enabled !== 'false'}
                  onChange={e => setLocalSettings({ ...localSettings, whatsapp_enabled: e.target.checked ? 'true' : 'false' })}
                  color="success"
                />
              </Paper>
            </Grid>

            {/* Mode Selection */}
            <Grid xs={12} sm={6}>
              <FormControl fullWidth size="small">
                <InputLabel>طريقة الإرسال المفضلة</InputLabel>
                <Select
                  value={localSettings.whatsapp_mode || 'browser'}
                  label="طريقة الإرسال المفضلة"
                  onChange={e => setLocalSettings({ ...localSettings, whatsapp_mode: e.target.value })}
                  sx={{ borderRadius: '10px' }}
                >
                  <MenuItem value="browser">🌐 فتح الواتساب مباشر في المتصفح / التطبيق (مجاني 100%)</MenuItem>
                  <MenuItem value="api">⚡ إرسال أوتوماتيكي صامت في الخلفية عبر API Gateway</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Provider Selection (If API mode chosen) */}
            {localSettings.whatsapp_mode === 'api' && (
              <Grid xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>مزود خدمة الواتساب (API Provider)</InputLabel>
                  <Select
                    value={localSettings.whatsapp_provider || 'ultramsg'}
                    label="مزود خدمة الواتساب (API Provider)"
                    onChange={e => setLocalSettings({ ...localSettings, whatsapp_provider: e.target.value })}
                    sx={{ borderRadius: '10px' }}
                  >
                    <MenuItem value="ultramsg">UltraMsg API (ربط واتساب مباشر)</MenuItem>
                    <MenuItem value="greenapi">Green API (بوابة الواتساب)</MenuItem>
                    <MenuItem value="webhook">Custom Webhook (رابط سيرفر خاص)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            )}

            {/* API Credentials Inputs (If API mode chosen) */}
            {localSettings.whatsapp_mode === 'api' && localSettings.whatsapp_provider !== 'webhook' && (
              <>
                <Grid xs={12} sm={6}>
                  <TextField
                    label="معرف الجلسة (Instance ID / IdInstance) *"
                    fullWidth
                    size="small"
                    value={localSettings.whatsapp_instance_id || ''}
                    onChange={e => setLocalSettings({ ...localSettings, whatsapp_instance_id: e.target.value })}
                    placeholder="مثال: instance123456"
                  />
                </Grid>
                <Grid xs={12} sm={6}>
                  <TextField
                    label="رمز الوصول (Token / ApiTokenInstance) *"
                    fullWidth
                    size="small"
                    type="password"
                    value={localSettings.whatsapp_token || ''}
                    onChange={e => setLocalSettings({ ...localSettings, whatsapp_token: e.target.value })}
                    placeholder="أدخل رمز الـ Token"
                  />
                </Grid>
              </>
            )}

            {localSettings.whatsapp_mode === 'api' && localSettings.whatsapp_provider === 'webhook' && (
              <Grid xs={12}>
                <TextField
                  label="رابط الـ Webhook (API URL) *"
                  fullWidth
                  size="small"
                  value={localSettings.whatsapp_api_url || ''}
                  onChange={e => setLocalSettings({ ...localSettings, whatsapp_api_url: e.target.value })}
                  placeholder="https://your-api.com/send-whatsapp"
                />
              </Grid>
            )}

            {/* Template Info Alert */}
            <Grid xs={12}>
              <Alert severity="info" sx={{ borderRadius: '12px', fontWeight: 700 }}>
                💡 <b>ملاحظة:</b> يتم تنسيق الرسالة أوتوماتيكياً باللغة العربية متضمنة اسم المطعم، الأصناف والأسعار، عنوان التوصيل ورقم الدور والشقة، واسم طيار الدليفري ورقم هاتفه المباشر لضمان وسيلة تواصل سريعة وموثوقة مع العميل.
              </Alert>
            </Grid>

            {/* Save Button */}
            <Grid xs={12}>
              <Button
                variant="contained"
                size="large"
                onClick={handleSaveSettings}
                startIcon={<WhatsApp />}
                sx={{ bgcolor: '#25D366', color: '#FFF', borderRadius: '12px', px: 4, py: 1.2, fontWeight: 800, '&:hover': { bgcolor: '#15803D' } }}
              >
                حفظ إعدادات الواتساب والتنبيهات
              </Button>
            </Grid>
          </Grid>
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
