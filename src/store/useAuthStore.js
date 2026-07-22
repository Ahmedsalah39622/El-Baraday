"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: {
        id: 'u_default',
        username: 'administrator',
        name: 'المدير العام',
        role: 'admin'
      },
      isAuthenticated: true,

      login: (userData) => {
        set({ user: userData, isAuthenticated: true });
      },

      logout: () => {
        set({ user: null, isAuthenticated: false });
      }
    }),
    {
      name: 'el-baraday-auth-v1',
    }
  )
);
