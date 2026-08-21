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
                salaryType: r.salary_type || 'weekly',
                weeklyRate: parseFloat(r.weekly_rate || 0),
                dailyRate: parseFloat(r.daily_rate || 0),
                baseSalary: parseFloat(r.base_salary || 0),
                hourlyRate: parseFloat(r.hourly_rate || 0),
                shiftHours: parseFloat(r.shift_hours || 8.0),
                workDaysPerWeek: parseInt(r.work_days_per_week || 6),
                shiftStartTime: r.shift_start_time || '12:00',
                gracePeriodMinutes: parseInt(r.grace_period_minutes || 15),
                lateDeductionRate: parseFloat(r.late_deduction_rate || 1.0),
                overtimeHours: parseFloat(r.overtime_hours || 0),
                deductionHours: parseFloat(r.deduction_hours || 0),
                bonus: parseFloat(r.bonus || 0),
                deductions: parseFloat(r.deductions || 0),
                advances: parseFloat(r.total_advances || 0),
                unpaidDaysCount: parseInt(r.unpaid_days_count || 0),
                unpaidWorkingHours: parseFloat(r.unpaid_working_hours || 0),
                unpaidLateHours: parseFloat(r.unpaid_late_hours || 0),
                unpaidLateMinutes: parseInt(r.unpaid_late_minutes || 0),
                unpaidOvertimeHours: parseFloat(r.unpaid_overtime_hours || 0),
                isClockedIn: Boolean(parseInt(r.is_clocked_in || 0) > 0),
                currentCheckInTime: r.current_check_in_time,
                status: r.status || 'مستحق',
                branchId: r.branch_id || 'b1',
                branchName: r.branch_name || 'الفرع الأول - الرئيسي'
              })),
              loading: false
            });
          } else {
            console.error('❌ Failed to fetch employees from server');
            set({ loading: false });
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
          get().fetchEmployees();
        } catch (e) {}
      },

      markAsPaid: async (employeeId, calcDetails = null) => {
        const emp = get().employees.find(e => e.id === employeeId);

        try {
          if (emp && calcDetails) {
            await fetch('/api/employees/payments', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                employee_id: emp.id,
                employee_name: emp.name,
                salary_type: calcDetails.salaryType || emp.salaryType || 'weekly',
                base_salary: calcDetails.base || 0,
                hourly_rate: calcDetails.hourlyRate || 0,
                daily_rate: calcDetails.dailyRate || 0,
                days_attended: calcDetails.daysAttended || 0,
                hours_worked: calcDetails.hoursWorked || 0,
                late_hours: calcDetails.lateHours || 0,
                late_deduction_amount: calcDetails.lateDeductionAmount || 0,
                earned_amount: calcDetails.earnedSoFar || 0,
                overtime_hours: calcDetails.overtimeHours || 0,
                overtime_amount: calcDetails.overtimeAmount || 0,
                deduction_hours: calcDetails.deductionHours || 0,
                deduction_amount: calcDetails.deductionAmount || 0,
                bonus_amount: calcDetails.directBonus || 0,
                direct_deductions: calcDetails.directDeductions || 0,
                advances_amount: calcDetails.advances || 0,
                net_paid: calcDetails.net || 0,
                period_start: calcDetails.periodStart || null,
                period_end: calcDetails.periodEnd || null,
                month: new Date().toISOString().substring(0, 7),
                notes: calcDetails.notes || 'صرف وتصفية مستحقات الأسبوع'
              })
            });
          } else {
            await fetch(`/api/employees/${employeeId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'تم الصرف' })
            });
          }
          await get().fetchEmployees();
        } catch (e) {
          console.error('Error in markAsPaid:', e);
        }
      },

      addEmployee: async (emp) => {
        const newId = `emp_${Date.now()}`;
        const newEmp = { 
          id: newId, 
          salaryType: emp.salaryType || 'weekly',
          weeklyRate: parseFloat(emp.weeklyRate || 0),
          dailyRate: parseFloat(emp.dailyRate || 0),
          baseSalary: parseFloat(emp.baseSalary || 0),
          hourlyRate: parseFloat(emp.hourlyRate || 0),
          shiftHours: parseFloat(emp.shiftHours || 8.0),
          workDaysPerWeek: parseInt(emp.workDaysPerWeek || 6),
          shiftStartTime: emp.shiftStartTime || '12:00',
          gracePeriodMinutes: parseInt(emp.gracePeriodMinutes || 15),
          lateDeductionRate: parseFloat(emp.lateDeductionRate || 1.0),
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
              salary_type: newEmp.salaryType || 'weekly',
              weekly_rate: newEmp.weeklyRate || 0,
              daily_rate: newEmp.dailyRate || 0,
              base_salary: newEmp.baseSalary || 0,
              hourly_rate: newEmp.hourlyRate || 0,
              shift_hours: newEmp.shiftHours || 8.0,
              work_days_per_week: newEmp.workDaysPerWeek || 6,
              shift_start_time: newEmp.shiftStartTime || '12:00',
              grace_period_minutes: newEmp.gracePeriodMinutes || 15,
              late_deduction_rate: newEmp.lateDeductionRate || 1.0,
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
              salary_type: updates.salaryType || updates.salary_type,
              weekly_rate: updates.weeklyRate !== undefined ? updates.weeklyRate : updates.weekly_rate,
              daily_rate: updates.dailyRate !== undefined ? updates.dailyRate : updates.daily_rate,
              base_salary: updates.baseSalary !== undefined ? updates.baseSalary : updates.base_salary,
              hourly_rate: updates.hourlyRate !== undefined ? updates.hourlyRate : updates.hourly_rate,
              shift_hours: updates.shiftHours !== undefined ? updates.shiftHours : updates.shift_hours,
              work_days_per_week: updates.workDaysPerWeek !== undefined ? updates.workDaysPerWeek : updates.work_days_per_week,
              shift_start_time: updates.shiftStartTime !== undefined ? updates.shiftStartTime : updates.shift_start_time,
              grace_period_minutes: updates.gracePeriodMinutes !== undefined ? updates.gracePeriodMinutes : updates.grace_period_minutes,
              late_deduction_rate: updates.lateDeductionRate !== undefined ? updates.lateDeductionRate : updates.late_deduction_rate,
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
          get().fetchEmployees();
        } catch (e) {}
      }
    }),
    {
      name: 'el-baraday-employees-v8',
    }
  )
);

