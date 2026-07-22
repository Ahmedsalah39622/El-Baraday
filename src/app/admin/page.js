'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, MenuItem, Select, FormControl,
  InputLabel, Checkbox, FormControlLabel, Grid, CircularProgress, Divider
} from '@mui/material';
import {
  AdminPanelSettingsOutlined, PersonOutlined, Add, EditOutlined,
  DeleteOutlined, LockOutlined, SecurityOutlined, CheckCircle, BlockOutlined
} from '@mui/icons-material';
import { ALL_SYSTEM_SCREENS, ROLE_PERMISSIONS } from '@/store/useAuthStore';

const ROLE_OPTIONS = [
  { value: 'admin', label: 'مدير النظام' },
  { value: 'cashier', label: 'كاشير' },
  { value: 'driver', label: 'طيار دليفري' },
  { value: 'kitchen', label: 'شيف مطبخ' },
  { value: 'custom', label: 'مخصص' }
];

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);

  const [currentUser, setCurrentUser] = useState({
    id: '',
    name: '',
    username: '',
    pin: '',
    role: 'cashier',
    permissions: ROLE_PERMISSIONS.cashier,
    status: 'active'
  });

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenDialog = (user = null) => {
    if (user) {
      setCurrentUser({
        id: user.id,
        name: user.name || '',
        username: user.username || '',
        pin: user.pin || '1234',
        role: user.role || 'cashier',
        permissions: Array.isArray(user.permissions) && user.permissions.length > 0
          ? user.permissions
          : (ROLE_PERMISSIONS[user.role] || ROLE_PERMISSIONS.cashier),
        status: user.status || 'active'
      });
    } else {
      setCurrentUser({
        id: '',
        name: '',
        username: '',
        pin: '',
        role: 'cashier',
        permissions: [...ROLE_PERMISSIONS.cashier],
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleRoleChange = (newRole) => {
    const defaultPerms = ROLE_PERMISSIONS[newRole] || ROLE_PERMISSIONS.cashier;
    setCurrentUser((prev) => ({
      ...prev,
      role: newRole,
      permissions: newRole === 'custom' ? prev.permissions : defaultPerms
    }));
  };

  const handleTogglePermission = (path) => {
    setCurrentUser((prev) => {
      const exists = prev.permissions.includes(path);
      const updated = exists
        ? prev.permissions.filter((p) => p !== path)
        : [...prev.permissions, path];
      return {
        ...prev,
        role: 'custom',
        permissions: updated
      };
    });
  };

  const handleSave = async () => {
    if (!currentUser.name.trim() || !currentUser.username.trim() || !currentUser.pin.trim()) {
      alert('برجاء استكمال الاسم واسم المستخدم ورمز الـ PIN!');
      return;
    }

    try {
      if (currentUser.id) {
        // Update user in Supabase DB
        const res = await fetch(`/api/users/${currentUser.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser)
        });
        if (res.ok) fetchUsers();
      } else {
        // Create user in Supabase DB
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(currentUser)
        });
        if (res.ok) fetchUsers();
      }
    } catch (err) {
      console.error('Error saving user:', err);
    } finally {
      setDialogOpen(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    try {
      await fetch(`/api/users/${userToDelete.id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (err) {
      console.error('Error deleting user:', err);
    } finally {
      setDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return <Chip label="مدير النظام" size="small" sx={{ bgcolor: '#DBEAFE', color: '#1E40AF', fontWeight: 800 }} />;
      case 'cashier':
        return <Chip label="كاشير" size="small" sx={{ bgcolor: '#FEF3C7', color: '#92400E', fontWeight: 800 }} />;
      case 'driver':
        return <Chip label="طيار دليفري" size="small" sx={{ bgcolor: '#E0E7FF', color: '#3730A3', fontWeight: 800 }} />;
      case 'kitchen':
        return <Chip label="شيف مطبخ" size="small" sx={{ bgcolor: '#FCE7F3', color: '#9D174D', fontWeight: 800 }} />;
      default:
        return <Chip label="مخصص" size="small" sx={{ bgcolor: '#F3F4F6', color: '#374151', fontWeight: 800 }} />;
    }
  };

  const getPermissionsSummary = (perms) => {
    if (!perms || perms.length === 0) return 'بلا صلاحيات';
    if (perms.length === ALL_SYSTEM_SCREENS.length) return 'كامل الصلاحيات';
    return `${perms.length} شاشات مسموحة`;
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
              إدارة المستخدمين والصلاحيات
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              التحكم في أدوار المستخدمين وتخصيص الشاشات والصلاحيات لكل حساب
            </Typography>
          </Box>
        </Box>

        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpenDialog()}
          sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700 }}
        >
          إضافة مستخدم جديد
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2 }}>
        {[
          { label: 'إجمالي المستخدمين', value: users.length, color: '#4285F4', icon: <PersonOutlined /> },
          { label: 'الحسابات النشطة', value: users.filter((u) => u.status === 'active').length, color: '#10B981', icon: <SecurityOutlined /> },
          { label: 'الأدوار المقترحة', value: '4 أدوار', color: '#FF8C42', icon: <LockOutlined /> },
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
        {loading ? (
          <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress size={32} /></Box>
        ) : (
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>الاسم</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>اسم المستخدم</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الدور</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الشاشات والصلاحيات</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>آخر دخول</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>الإجراءات</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} hover>
                  <TableCell sx={{ fontWeight: 700, color: '#1A1A2E' }}>{u.name}</TableCell>
                  <TableCell sx={{ fontFamily: 'monospace', color: '#4B5563' }}>{u.username}</TableCell>
                  <TableCell>{getRoleBadge(u.role)}</TableCell>
                  <TableCell>
                    <Chip
                      label={getPermissionsSummary(u.permissions)}
                      size="small"
                      variant="outlined"
                      sx={{ fontWeight: 700, borderColor: '#D1D5DB' }}
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={u.status === 'active' ? 'نشط' : 'غير نشط'}
                      size="small"
                      sx={{
                        bgcolor: u.status === 'active' ? '#D1FAE5' : '#FEE2E2',
                        color: u.status === 'active' ? '#065F46' : '#991B1B',
                        fontWeight: 700,
                      }}
                    />
                  </TableCell>
                  <TableCell sx={{ fontSize: '0.813rem', color: '#6B7280' }}>
                    {u.last_login ? new Date(u.last_login).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'لم يدخل بعد'}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => handleOpenDialog(u)} sx={{ color: '#4285F4' }}>
                      <EditOutlined fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => { setUserToDelete(u); setDeleteDialogOpen(true); }}
                      sx={{ color: '#EF4444' }}
                    >
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </TableContainer>

      {/* User Add / Edit & Permissions Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1, bgcolor: '#FAFBFC', borderBottom: '1px solid #E5E7EB' }}>
          {currentUser.id ? 'تعديل المستخدم والصلاحيات' : 'إضافة مستخدم جديد وترخيص الصلاحيات'}
        </DialogTitle>

        <DialogContent sx={{ p: 3, display: 'flex', flexDirection: 'column', gap: 2.5, mt: 1 }}>
          {/* Form Fields: Name, Username, PIN, Role, Status */}
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="الاسم الكامل"
                placeholder="أحمد محمود"
                value={currentUser.name}
                onChange={(e) => setCurrentUser({ ...currentUser, name: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="اسم المستخدم (User ID)"
                placeholder="cashier1"
                value={currentUser.username}
                onChange={(e) => setCurrentUser({ ...currentUser, username: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                type="password"
                label="رمز الـ PIN (4 أرقام)"
                placeholder="1234"
                value={currentUser.pin}
                onChange={(e) => setCurrentUser({ ...currentUser, pin: e.target.value })}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>الدور (Role)</InputLabel>
                <Select
                  value={currentUser.role}
                  label="الدور (Role)"
                  onChange={(e) => handleRoleChange(e.target.value)}
                >
                  {ROLE_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>حالة الحساب</InputLabel>
                <Select
                  value={currentUser.status}
                  label="حالة الحساب"
                  onChange={(e) => setCurrentUser({ ...currentUser, status: e.target.value })}
                >
                  <MenuItem value="active">نشط (مسموح بالدخول)</MenuItem>
                  <MenuItem value="inactive">غير نشط (معطل)</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Divider sx={{ my: 1 }} />

          {/* Granular Screen Permissions Checkboxes Grid */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#1A1A2E' }}>
              🎯 تحديد الشاشات والصلاحيات المسموحة لهذا المستخدم:
            </Typography>
            <Typography variant="caption" sx={{ color: '#6B7280' }}>
              سيتم ظهور الشاشات المحددة فقط في القائمة الجانبية والشريط العلوي للمستخدم، وسيتم حجب أي شاشة غير مسموحة تلقائياً.
            </Typography>

            <Grid container spacing={1.5} sx={{ mt: 1 }}>
              {ALL_SYSTEM_SCREENS.map((screen) => {
                const isChecked = currentUser.permissions.includes(screen.path);
                return (
                  <Grid item xs={12} sm={6} md={4} key={screen.path}>
                    <Paper
                      onClick={() => handleTogglePermission(screen.path)}
                      sx={{
                        p: 1.2,
                        borderRadius: '12px',
                        border: '1.5px solid',
                        borderColor: isChecked ? '#4285F4' : '#E5E7EB',
                        bgcolor: isChecked ? '#F0F7FF' : '#FFFFFF',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        transition: 'all 0.2s ease',
                        '&:hover': { borderColor: '#4285F4' }
                      }}
                    >
                      <Checkbox
                        checked={isChecked}
                        onChange={() => handleTogglePermission(screen.path)}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="body2" sx={{ fontWeight: isChecked ? 800 : 500, color: isChecked ? '#1E40AF' : '#374151', fontSize: '0.85rem' }}>
                        {screen.name}
                      </Typography>
                    </Paper>
                  </Grid>
                );
              })}
            </Grid>
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 2.5, bgcolor: '#FAFBFC', borderTop: '1px solid #E5E7EB', gap: 1 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: '#6B7280', fontWeight: 700 }}>
            إلغاء
          </Button>
          <Button variant="contained" onClick={handleSave} sx={{ bgcolor: '#4285F4', borderRadius: '10px', px: 3, fontWeight: 700 }}>
            حفظ المستخدم والصلاحيات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ fontWeight: 800 }}>تأكيد حذف المستخدم</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            هل أنت تأكد من رغبتك في حذف الحساب "{userToDelete?.name}" ({userToDelete?.username})؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteDialogOpen(false)}>إلغاء</Button>
          <Button variant="contained" color="error" onClick={handleDeleteUser}>تأكيد الحذف</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
