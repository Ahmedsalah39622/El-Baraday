'use client';

import { useState, useEffect } from 'react';
import { 
  Box, Typography, Tabs, Tab, Paper, TextField, Button, Grid, 
  List, ListItem, ListItemText, ListItemSecondaryAction, IconButton 
} from '@mui/material';
import { Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useCustomerStore } from '@/store/useCustomerStore'; // Reusing for drivers in this example

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
  const [localSettings, setLocalSettings] = useState({ companyName: '', address: '', phone: '', taxRate: 0, minTableCharge: 0 });
  
  // Fake driver state since we might not have a dedicated driver store yet
  const [drivers, setDrivers] = useState([{ id: 1, name: 'محمد علي' }, { id: 2, name: 'أحمد سعيد' }]);
  const [newDriverName, setNewDriverName] = useState('');

  useEffect(() => {
    if (settings) {
      setLocalSettings(settings);
    }
  }, [settings]);

  const handleTabChange = (event, newValue) => setTabValue(newValue);

  const handleSaveSettings = () => {
    updateSettings(localSettings);
    // Could add a toast notification here
  };

  const handleAddDriver = () => {
    if (newDriverName.trim()) {
      setDrivers([...drivers, { id: Date.now(), name: newDriverName }]);
      setNewDriverName('');
    }
  };

  const handleDeleteDriver = (id) => {
    setDrivers(drivers.filter(d => d.id !== id));
  };

  return (
    <Box sx={{ p: 3, maxWidth: '800px', mx: 'auto' }}>
      <Typography variant="h4" gutterBottom fontWeight="bold" sx={{ mb: 4 }}>
        الإعدادات
      </Typography>

      <Paper sx={{ width: '100%', mb: 2 }}>
        <Tabs value={tabValue} onChange={handleTabChange} indicatorColor="primary" textColor="primary" variant="fullWidth">
          <Tab label="إعدادات الشركة" />
          <Tab label="إعدادات العروض" />
          <Tab label="الطيارين" />
        </Tabs>
      </Paper>

      {/* Tab 1: Company Settings */}
      <TabPanel value={tabValue} index={0}>
        <Paper sx={{ p: 4 }}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField 
                label="اسم الشركة" 
                fullWidth 
                value={localSettings.companyName || ''} 
                onChange={e => setLocalSettings({...localSettings, companyName: e.target.value})} 
              />
            </Grid>
            <Grid item xs={12}>
              <TextField 
                label="العنوان" 
                fullWidth 
                value={localSettings.address || ''} 
                onChange={e => setLocalSettings({...localSettings, address: e.target.value})} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="التليفون" 
                fullWidth 
                value={localSettings.phone || ''} 
                onChange={e => setLocalSettings({...localSettings, phone: e.target.value})} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="نسبة الضريبة (%)" 
                type="number" 
                fullWidth 
                value={localSettings.taxRate || 0} 
                onChange={e => setLocalSettings({...localSettings, taxRate: parseFloat(e.target.value) || 0})} 
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField 
                label="الحد الأدنى للطاولة (ج.م)" 
                type="number" 
                fullWidth 
                value={localSettings.minTableCharge || 0} 
                onChange={e => setLocalSettings({...localSettings, minTableCharge: parseFloat(e.target.value) || 0})} 
              />
            </Grid>
            <Grid item xs={12}>
              <Button variant="contained" size="large" onClick={handleSaveSettings} sx={{ mt: 2 }}>
                حفظ الإعدادات
              </Button>
            </Grid>
          </Grid>
        </Paper>
      </TabPanel>

      {/* Tab 2: Offers */}
      <TabPanel value={tabValue} index={1}>
        <Paper sx={{ p: 4, textAlign: 'center', py: 10 }}>
          <Typography variant="h5" color="text.secondary">
            إعدادات العروض - قريباً
          </Typography>
        </Paper>
      </TabPanel>

      {/* Tab 3: Drivers */}
      <TabPanel value={tabValue} index={2}>
        <Paper sx={{ p: 4 }}>
          <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
            <TextField 
              label="اسم الطيار الجديد" 
              fullWidth 
              value={newDriverName} 
              onChange={e => setNewDriverName(e.target.value)} 
            />
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddDriver} sx={{ px: 4 }}>
              إضافة
            </Button>
          </Box>
          <List sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
            {drivers.map(driver => (
              <ListItem key={driver.id} divider>
                <ListItemText primary={driver.name} />
                <ListItemSecondaryAction>
                  <IconButton edge="end" color="error" onClick={() => handleDeleteDriver(driver.id)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
            {drivers.length === 0 && (
              <ListItem>
                <ListItemText primary="لا يوجد طيارين مضافين." sx={{ textAlign: 'center', color: 'text.secondary' }} />
              </ListItem>
            )}
          </List>
        </Paper>
      </TabPanel>
    </Box>
  );
}

