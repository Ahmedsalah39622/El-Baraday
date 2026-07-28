"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEmployeeStore = create(
  persist(
    (set, get) => ({
      employees: [],
      loading: false,

      fetchEmployees: async () => {
        set({ loading: true });
        try {
          const res = await fetch('/api/employees');
          if (res.ok) {
            const rows = await res.json();
            set({
              employees: (rows || []).map(r => ({
                id: r.id,
                name: r.name,
                role: r.role || 'موظف',
                phone: r.phone || '',
                baseSalary: parseFloat(r.base_salary || 4000),
                hourlyRate: parseFloat(r.hourly_rate || 0),
                overtimeHours: parseFloat(r.overtime_hours || 0),
                deductionHours: parseFloat(r.deduction_hours || 0),
                bonus: parseFloat(r.bonus || 0),
                deductions: parseFloat(r.deductions || 0),
                advances: parseFloat(r.total_advances || 0),
                status: r.status || 'مستحق',
                branchId: r.branch_id || 'b1',
                branchName: r.branch_name || 'الفرع الأول - الرئيسي'
              })),
              loading: false
            });
          } else {
            set({ employees: [], loading: false });
          }
        } catch (err) {
          console.warn('⚠️ Using cached employees:', err.message);
          set({ loading: false });
        }
      },

      addAdvance: async (employeeId, amount, notes = '') => {
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
            body: JSON.stringify({
              amount: val,
              month: new Date().toISOString().substring(0, 7),
              notes: notes || 'سلفة مالية'
            })
          });
        } catch (e) {}
      },

      markAsPaid: async (employeeId, calcDetails = null) => {
        const emp = get().employees.find(e => e.id === employeeId);
        set((state) => ({
          employees: state.employees.map(e =>
            e.id === employeeId ? { ...e, status: 'تم الصرف' } : e
          )
        }));

        try {
          await fetch(`/api/employees/${employeeId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'تم الصرف' })
          });
        } catch (e) {}

        if (emp && calcDetails) {
          try {
            await fetch('/api/employees/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee_id: emp.id,
                employee_name: emp.name,
                base_salary: calcDetails.base,
                hourly_rate: calcDetails.hourlyRate,
                overtime_hours: calcDetails.overtimeHours,
                overtime_amount: calcDetails.overtimeAmount,
                deduction_hours: calcDetails.deductionHours,
                deduction_amount: calcDetails.deductionAmount,
                bonus_amount: calcDetails.directBonus,
                direct_deductions: calcDetails.directDeductions,
                advances_amount: calcDetails.advances,
                net_paid: calcDetails.net,
                month: new Date().toISOString().substring(0, 7),
                notes: 'تم صرف راتب الشهر'
              })
            });
          } catch (e) {}
        }
      },

      addEmployee: async (emp) => {
        const newId = `emp_${Date.now()}`;
        const newEmp = { 
          id: newId, 
          hourlyRate: 0,
          overtimeHours: 0,
          deductionHours: 0,
          bonus: 0, 
          deductions: 0, 
          advances: 0, 
          status: 'مستحق', 
          ...emp 
        };
        set((state) => ({ employees: [...state.employees, newEmp] }));
        try {
          const res = await fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: newEmp.name,
              phone: newEmp.phone,
              role: newEmp.role,
              base_salary: newEmp.baseSalary,
              hourly_rate: newEmp.hourlyRate || 0,
              overtime_hours: newEmp.overtimeHours || 0,
              deduction_hours: newEmp.deductionHours || 0,
              bonus: newEmp.bonus || 0,
              deductions: newEmp.deductions || 0,
              branch_id: newEmp.branchId || newEmp.branch_id || 'b1'
            })
          });
          if (res.ok) {
            get().fetchEmployees();
            try {
              const { useCustomerStore } = await import('@/store/useCustomerStore');
              useCustomerStore.getState().fetchDrivers();
            } catch (err) {}
          }
        } catch (e) {}
      },

      updateEmployee: async (id, updates) => {
        set((state) => ({
          employees: state.employees.map(e => e.id === id ? { ...e, ...updates } : e)
        }));
        try {
          await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: updates.name,
              phone: updates.phone,
              role: updates.role,
              base_salary: updates.baseSalary,
              hourly_rate: updates.hourlyRate,
              overtime_hours: updates.overtimeHours,
              deduction_hours: updates.deductionHours,
              bonus: updates.bonus,
              deductions: updates.deductions,
              status: updates.status,
              branch_id: updates.branchId || updates.branch_id
            })
          });
          get().fetchEmployees();
          try {
            const { useCustomerStore } = await import('@/store/useCustomerStore');
            useCustomerStore.getState().fetchDrivers();
          } catch (err) {}
        } catch (e) {}
      },

      deleteEmployee: async (id) => {
        set((state) => ({ employees: state.employees.filter(e => e.id !== id) }));
        try {
          await fetch(`/api/employees/${id}`, { method: 'DELETE' });
          get().fetchEmployees();
        } catch (e) {}
      },

      settleEmployeeAccount: async (id) => {
        set((state) => ({
          employees: state.employees.map(e =>
            e.id === id ? { ...e, status: 'تمت التصفية' } : e
          )
        }));
        try {
          await fetch(`/api/employees/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'تمت التصفية' })
          });
        } catch (e) {}
      }
    }),
    {
      name: 'el-baraday-employees-v6',
    }
  )
);
