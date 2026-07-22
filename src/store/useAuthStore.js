"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Default route presets per role
export const ROLE_PERMISSIONS = {
  admin: ['/', '/products', '/orders', '/tables', '/customers', '/shift-summary', '/delivery', '/inventory', '/salaries', '/reports', '/admin', '/settings'],
  cashier: ['/', '/orders', '/tables', '/customers', '/shift-summary', '/delivery'],
  driver: ['/delivery', '/orders'],
  kitchen: ['/orders']
};

export const ALL_SYSTEM_SCREENS = [
  { path: '/', name: 'الرئيسية (الكاشير والـ POS)' },
  { path: '/products', name: 'إدارة المنتجات والمنيو' },
  { path: '/orders', name: 'سجل الطلبات والفواتير' },
  { path: '/tables', name: 'إدارة الصالة والطاولات' },
  { path: '/customers', name: 'إدارة العملاء والبحث بالهاتف' },
  { path: '/shift-summary', name: 'تقفيل الشيفتات والخزنة' },
  { path: '/delivery', name: 'إدارة الدليفري والطيارين' },
  { path: '/inventory', name: 'المخزن والمواد الخام' },
  { path: '/salaries', name: 'المرتبات والسلف للموظفين' },
  { path: '/reports', name: 'التقارير والإحصائيات الحية' },
  { path: '/admin', name: 'إدارة المستخدمين والأدمن' },
  { path: '/settings', name: 'إعدادات النظام والبرنتر' },
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
      },

      hasPermission: (pathname) => {
        const user = get().user;
        if (!user) return false;

        // Custom granular screen permissions set on user
        if (Array.isArray(user.permissions) && user.permissions.length > 0) {
          if (pathname === '/') return user.permissions.includes('/');
          return user.permissions.some(r => r !== '/' && pathname.startsWith(r));
        }

        const role = user.role || 'cashier';
        const allowedRoutes = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
        if (pathname === '/') return allowedRoutes.includes('/');
        return allowedRoutes.some(r => r !== '/' && pathname.startsWith(r));
      }
    }),
    {
      name: 'el-baraday-auth-v3',
    }
  )
);
