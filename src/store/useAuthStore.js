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
  admin:   ['/', '/invoices', '/returns', '/products', '/prizes', '/orders', '/tables', '/customers', '/finances', '/shift-summary', '/delivery', '/attendance', '/inventory', '/branches-inventory', '/salaries', '/reports', '/admin', '/settings'],
  cashier: ['/', '/invoices', '/returns', '/prizes', '/orders', '/tables', '/customers', '/finances', '/shift-summary', '/delivery', '/attendance'],
  driver:  ['/delivery', '/attendance', '/orders'],
  kitchen: ['/orders'],
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

      hasPermission: (pathname) => {
        const { user, isAuthenticated } = get();

        // Unauthenticated = no access to anything
        if (!isAuthenticated || !user) return false;

        const role = user.role || 'cashier';

        // Admin always has full access
        if (role === 'admin') return true;

        // Custom per-user permissions set by Admin
        if (Array.isArray(user.permissions) && user.permissions.length > 0) {
          // Always allow attendance for any logged in user
          if (pathname === '/attendance') return true;
          // Match by full path or short path (e.g. 'pos' matches '/', 'orders' matches '/orders')
          return user.permissions.some(p => {
            const normalized = p.startsWith('/') ? p : `/${p}`;
            if (normalized === '/pos' || normalized === '/') {
              return pathname === '/';
            }
            return pathname === normalized || pathname.startsWith(normalized + '/');
          });
        }

        // Fall back to role defaults
        const allowed = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
        if (pathname === '/') return allowed.includes('/');
        return allowed.some(r => r !== '/' && pathname.startsWith(r));
      }
    }),
    {
      name: 'el-baraday-auth-session-v1',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
