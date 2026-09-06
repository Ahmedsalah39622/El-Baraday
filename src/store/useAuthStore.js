"use client";

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Clear legacy persistent localStorage auth data so credentials never survive browser restarts
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('el-baraday-auth-v5');
    localStorage.removeItem('el-baraday-auth-v4');
    localStorage.removeItem('el-baraday-auth-v3');
    localStorage.removeItem('el-baraday-auth-v2');
    localStorage.removeItem('el-baraday-auth-v1');
    localStorage.removeItem('el-baraday-auth');
  } catch (e) {}
}

export const ROLE_PERMISSIONS = {
  admin:   ['/', '/invoices', '/returns', '/products', '/prizes', '/orders', '/tables', '/customers', '/finances', '/shift-summary', '/delivery', '/attendance', '/fingerprint', '/inventory', '/branches-inventory', '/salaries', '/reports', '/admin', '/settings', 'show_safe_balance'],
  cashier: ['/', '/invoices', '/returns', '/prizes', '/orders', '/tables', '/customers', '/finances', '/shift-summary', '/delivery', '/attendance', '/fingerprint', 'show_safe_balance'],
  driver:  ['/delivery', '/attendance', '/fingerprint', '/orders'],
  kitchen: ['/orders', '/fingerprint'],
};

export const ALL_SYSTEM_SCREENS = [
  { path: '/',              name: 'الرئيسية (الكاشير والـ POS)' },
  { path: '/invoices',      name: 'الفواتير والتحصيل المالي' },
  { path: '/returns',       name: 'إدارة المرتجعات واسترداد النقدية' },
  { path: '/products',      name: 'إدارة المنتجات والمنيو' },
  { path: '/prizes',        name: 'السحب والجوائز وعجلة الحظ' },
  { path: '/orders',        name: 'سجل الطلبات والفواتير' },
  { path: '/tables',        name: 'إدارة الصالة والطاولات' },
  { path: '/customers',     name: 'إدارة العملاء والبحث بالهاتف' },
  { path: '/finances',      name: 'الإيرادات والمصروفات والديون' },
  { path: '/shift-summary', name: 'تقفيل الشيفتات والخزنة' },
  { path: '/delivery',      name: 'إدارة الدليفري والطيارين' },
  { path: '/attendance',    name: 'تمامات الموظفين والطيارين' },
  { path: '/fingerprint',   name: 'البصمة (حضور وانصراف سريع)' },
  { path: '/inventory',     name: 'المخزن والمواد الخام' },
  { path: '/branches-inventory', name: 'جرد ومتابعة خامات الفروع والتحويلات' },
  { path: '/salaries',      name: 'المرتبات والسلف للموظفين' },
  { path: '/reports',       name: 'التقارير والإحصائيات الحية' },
  { path: '/admin',         name: 'إدارة المستخدمين والأدمن' },
  { path: '/settings',      name: 'إعدادات النظام والبرنتر' },
];

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,

      login: (userData) => {
        set({ user: userData, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
        if (typeof window !== 'undefined') {
          try { sessionStorage.clear(); } catch (e) {}
        }
      },

      syncUserWithServer: async () => {
        const { user, isAuthenticated, logout } = get();
        if (!isAuthenticated || !user) return;
        try {
          const res = await fetch('/api/auth/verify-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: user.id, username: user.username })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.exists) {
              if (data.status === 'inactive') {
                logout();
                return;
              }
              set((state) => ({
                user: {
                  ...state.user,
                  id: data.id || state.user?.id,
                  name: data.name,
                  role: data.role,
                  permissions: Array.isArray(data.permissions) ? data.permissions : [],
                  branch_id: data.branch_id || state.user?.branch_id || 'b1',
                  status: data.status || 'active'
                }
              }));
            }
          }
        } catch (e) {
          // ignore network failures silently
        }
      },

      canViewSafeBalance: () => {
        const { user, isAuthenticated } = get();
        if (!isAuthenticated || !user) return false;
        const role = user.role || 'cashier';
        if (role === 'admin') return true;

        if (Array.isArray(user.permissions)) {
          return user.permissions.includes('show_safe_balance');
        }

        const defaultPerms = ROLE_PERMISSIONS[role] || [];
        return defaultPerms.includes('show_safe_balance');
      },

      hasPermission: (pathname) => {
        const { user, isAuthenticated } = get();

        // Unauthenticated = no access to anything
        if (!isAuthenticated || !user) return false;

        // Custom per-user permissions set by Admin (applicable to all roles including admin)
        if (Array.isArray(user.permissions) && user.permissions.length > 0) {
          // Match by full path or short path (e.g. 'pos' matches '/', 'orders' matches '/orders')
          return user.permissions.some(p => {
            if (p === 'show_safe_balance') return false;
            const normalized = p.startsWith('/') ? p : `/${p}`;
            if (normalized === '/pos' || normalized === '/') {
              return pathname === '/';
            }
            return pathname === normalized || pathname.startsWith(normalized + '/');
          });
        }

        const role = user.role || 'cashier';

        // Admin role defaults to full access ONLY when no specific permissions array is defined
        if (role === 'admin') return true;

        // Fall back to role defaults
        const allowed = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
        if (pathname === '/') return allowed.includes('/');
        return allowed.some(r => r !== '/' && r !== 'show_safe_balance' && pathname.startsWith(r));
      }
    }),
    {
      name: 'el-baraday-auth-session-v1',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
