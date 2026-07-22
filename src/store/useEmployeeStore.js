"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const defaultEmployees = [
  { id: 'e1', name: 'محمد علي الصوفي', role: 'طيار دليفري', phone: '01012345678', baseSalary: 4500, bonus: 500, deductions: 0, advances: 1000, status: 'مستحق' },
  { id: 'e2', name: 'أحمد عبد الفتاح', role: 'طيار دليفري', phone: '01098765432', baseSalary: 4500, bonus: 300, deductions: 200, advances: 500, status: 'مستحق' },
  { id: 'e3', name: 'محمود السويفي', role: 'طيار دليفري', phone: '01123456789', baseSalary: 4500, bonus: 0, deductions: 0, advances: 0, status: 'تم الصرف' },
  { id: 'e4', name: 'خالد طارق', role: 'طيار دليفري', phone: '01234567890', baseSalary: 4500, bonus: 200, deductions: 100, advances: 800, status: 'مستحق' },
  { id: 'e5', name: 'عمر حسن', role: 'كاشير', phone: '01056789012', baseSalary: 5000, bonus: 0, deductions: 0, advances: 2000, status: 'مستحق' },
  { id: 'e6', name: 'يوسف إبراهيم', role: 'شيف مطبخ', phone: '01067890123', baseSalary: 6000, bonus: 500, deductions: 300, advances: 0, status: 'تم الصرف' },
];

export const useEmployeeStore = create(
  persist(
    (set, get) => ({
      employees: defaultEmployees,
      loading: false,

      fetchEmployees: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/employees');
          if (res.ok) {
            const rows = await res.json();
            if (rows.length > 0) {
              set({
                employees: rows.map(r => ({
                  id: r.id,
                  name: r.name,
                  role: r.role || 'موظف',
                  phone: r.phone || '',
                  baseSalary: parseFloat(r.base_salary || 4000),
                  bonus: parseFloat(r.bonus || 0),
                  deductions: parseFloat(r.deductions || 0),
                  advances: parseFloat(r.total_advances || 0),
                  status: r.status || 'مستحق'
                })),
                loading: false
              });
            } else {
              set({ loading: false });
            }
          }
        } catch (err) {
          console.warn('⚠️ Using cached employees:', err.message);
          set({ loading: false });
        }
      },

      addAdvance: async (employeeId, amount) => {
        const val = parseFloat(amount) || 0;
        set((state) => ({
          employees: state.employees.map(e =>
            e.id === employeeId ? { ...e, advances: (e.advances || 0) + val } : e
          )
        }));

        try {
          await fetch(`/api/employees/${employeeId}/advances`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: val, month: new Date().toISOString().substring(0, 7) })
          });
        } catch (e) {}
      },

      markAsPaid: (employeeId) => set((state) => ({
        employees: state.employees.map(e =>
          e.id === employeeId ? { ...e, status: 'تم الصرف' } : e
        )
      })),

      addEmployee: async (emp) => {
        const newId = `emp_${Date.now()}`;
        const newEmp = { id: newId, bonus: 0, deductions: 0, advances: 0, status: 'مستحق', ...emp };
        set((state) => ({ employees: [...state.employees, newEmp] }));
        try {
          await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newEmp.name,
              phone: newEmp.phone,
              role: newEmp.role,
              base_salary: newEmp.baseSalary
            })
          });
        } catch (e) {}
      }
    }),
    {
      name: 'el-baraday-employees-v1',
    }
  )
);
