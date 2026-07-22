'use client';

import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Tabs, Tab, LinearProgress,
} from '@mui/material';
import {
  AdminPanelSettingsOutlined, PersonOutlined, Add, EditOutlined,
  DeleteOutlined, LockOutlined, SecurityOutlined,
} from '@mui/icons-material';

const mockUsers = [
  { id: 1, name: 'أحمد محمود', username: 'admin', role: 'مدير النظام', permissions: 'كامل', status: 'نشط', lastLogin: '21/07/2026 06:00 PM' },
  { id: 2, name: 'عمر حسن', username: 'cashier1', role: 'كاشير', permissions: 'نقاط البيع فقط', status: 'نشط', lastLogin: '21/07/2026 05:30 PM' },
  { id: 3, name: 'محمد علي', username: 'driver1', role: 'طيار دليفري', permissions: 'عرض الطلبات', status: 'نشط', lastLogin: '21/07/2026 04:00 PM' },
  { id: 4, name: 'يوسف إبراهيم', username: 'chef1', role: 'شيف مطبخ', permissions: 'شاشة المطبخ', status: 'غير نشط', lastLogin: '20/07/2026 11:00 PM' },
];

export default function AdminPage() {
  const [users, setUsers] = useState(mockUsers);
  const [tabValue, setTabValue] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState({ name: '', username: '', role: 'كاشير', password: '' });

  const handleOpenDialog = (user = null) => {
    if (user) {
      setCurrentUser({ ...user, password: '' });
    } else {
      setCurrentUser({ id: '', name: '', username: '', role: 'كاشير', password: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!currentUser.name.trim()) return;
    if (currentUser.id) {
      setUsers((prev) => prev.map((u) => (u.id === currentUser.id ? { ...u, ...currentUser } : u)));
    } else {
      setUsers((prev) => [...prev, { ...currentUser, id: Date.now(), status: 'نشط', lastLogin: '-', permissions: 'نقاط البيع فقط' }]);
    }
    setDialogOpen(false);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: { xs: 10, md: 4 } }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AdminPanelSettingsOutlined sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.3rem', md: '1.8rem' } }}>
              لوحة الأدمن
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إدارة المستخدمين والصلاحيات وإعدادات النظام
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700 }}
        >
          إضافة مستخدم
        </Button>
      </Box>

      {/* Stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {[
          { label: 'إجمالي المستخدمين', value: users.length, color: '#4285F4', icon: <PersonOutlined /> },
          { label: 'نشط حالياً', value: users.filter((u) => u.status === 'نشط').length, color: '#34D399', icon: <SecurityOutlined /> },
          { label: 'الأدوار المتاحة', value: '4 أدوار', color: '#FF8C42', icon: <LockOutlined /> },
        ].map((s, i) => (
          <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: `${s.color}15`, color: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {s.icon}
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>{s.label}</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '1.1rem' }}>{s.value}</Typography>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Users Table */}
      <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700 }}>الاسم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>اسم المستخدم</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الدور</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الصلاحيات</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>الحالة</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>آخر دخول</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700 }}>الإجراءات</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {users.map((user) => (
              <TableRow key={user.id}>
                <TableCell sx={{ fontWeight: 800 }}>{user.name}</TableCell>
                <TableCell sx={{ color: '#6B7280', fontFamily: 'monospace' }}>{user.username}</TableCell>
                <TableCell>
                  <Chip label={user.role} size="small" sx={{ fontWeight: 700, bgcolor: '#EFF6FF', color: '#1E40AF' }} />
                </TableCell>
                <TableCell sx={{ color: '#6B7280', fontSize: '0.85rem' }}>{user.permissions}</TableCell>
                <TableCell>
                  <Chip
                    label={user.status}
                    size="small"
                    sx={{
                      fontWeight: 700,
                      bgcolor: user.status === 'نشط' ? '#D1FAE5' : '#FEE2E2',
                      color: user.status === 'نشط' ? '#065F46' : '#991B1B',
                    }}
                  />
                </TableCell>
                <TableCell sx={{ fontSize: '0.85rem', color: '#6B7280' }}>{user.lastLogin}</TableCell>
                <TableCell align="center">
                  <IconButton onClick={() => handleOpenDialog(user)} sx={{ color: '#4285F4' }}>
                    <EditOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                  <IconButton sx={{ color: '#EF4444' }}>
                    <DeleteOutlined sx={{ fontSize: 18 }} />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Add/Edit User Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle component="div" sx={{ fontWeight: 800 }}>
          {currentUser.id ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField fullWidth label="الاسم بالكامل" value={currentUser.name} onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })} />
            <TextField fullWidth label="اسم المستخدم" value={currentUser.username} onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })} />
            <TextField fullWidth label="كلمة المرور" type="password" value={currentUser.password} onChange={(e) => setCurrentUser({ ...currentUser, password: e.target.value })} />
            <TextField fullWidth select label="الدور" value={currentUser.role} onChange={(e) => setCurrentUser({ ...currentUser, role: e.target.value })} SelectProps={{ native: true }}>
              <option value="مدير النظام">مدير النظام</option>
              <option value="كاشير">كاشير</option>
              <option value="طيار دليفري">طيار دليفري</option>
              <option value="شيف مطبخ">شيف مطبخ</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#4285F4', borderRadius: '10px', fontWeight: 700 }}>حفظ</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
