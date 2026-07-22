"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Allowed routes per role
export const ROLE_PERMISSIONS = {
  admin: ['/', '/orders', '/products', '/tables', '/customers', '/shift-summary', '/salaries', '/inventory', '/delivery', '/reports', '/admin', '/settings'],
  cashier: ['/', '/orders', '/tables', '/customers', '/shift-summary', '/delivery'],
  kitchen: ['/orders']
};

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
        const role = user.role || 'cashier';
        const allowedRoutes = ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.cashier;
        if (pathname === '/') return allowedRoutes.includes('/');
        return allowedRoutes.some(r => r !== '/' && pathname.startsWith(r));
      }
    }),
    {
      name: 'el-baraday-auth-v2',
    }
  )
);
