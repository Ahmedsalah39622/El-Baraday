'use client';

import { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, MenuItem, Select, FormControl, InputLabel,
  Tooltip, Alert, Grid, Stack, Card, CardContent, Divider, CircularProgress, Tabs, Tab
} from '@mui/material';
import {
  AccountBalanceWallet, Add, MoneyOutlined,
  PersonOutlined, CalendarMonth, EditOutlined, DeleteOutlined,
  Store, CheckCircleOutlined, AccessTime as TimeIcon,
  TrendingUp, TrendingDown, Calculate as CalcIcon,
  CardGiftcard as BonusIcon, Warning as WarningIcon,
  RemoveCircle as DeductionIcon, Star as StarIcon,
  PictureAsPdf, TableChart as ExcelIcon, AssessmentOutlined,
  ReceiptLong, FilterList, Refresh
} from '@mui/icons-material';
import { useEmployeeStore } from '@/store/useEmployeeStore';
import { useBranchStore } from '@/store/useBranchStore';
import { useAuthStore } from '@/store/useAuthStore';
import { generateReportPDF } from '@/lib/reportPdfExport';
import { exportToExcel } from '@/lib/exportToExcel';

function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 2.5, pb: 4 }}>{children}</Box>}
    </div>
  );
}

// Helper for exact hourly & net salary calculations
export function calculateEmployeeSalary(emp) {
  if (!emp) return { base: 0, hourlyRate: 0, overtimeHours: 0, overtimeAmount: 0, deductionHours: 0, deductionAmount: 0, directBonus: 0, directDeductions: 0, advances: 0, totalBonus: 0, totalDeductions: 0, net: 0 };

  const base = parseFloat(emp.baseSalary || 0);
  // Default hourly rate = base / 240 (30 days * 8 hrs/day) if not explicitly set
  const hourlyRate = (emp.hourlyRate && parseFloat(emp.hourlyRate) > 0) 
    ? parseFloat(emp.hourlyRate) 
    : (base > 0 ? base / 240 : 0);

  const overtimeHours = parseFloat(emp.overtimeHours || 0);
  const deductionHours = parseFloat(emp.deductionHours || 0);

  const overtimeAmount = overtimeHours * hourlyRate;
  const deductionAmount = deductionHours * hourlyRate;

  const directBonus = parseFloat(emp.bonus || 0);
  const directDeductions = parseFloat(emp.deductions || 0);
  const advances = parseFloat(emp.advances || 0);

  const totalBonus = overtimeAmount + directBonus;
  const totalDeductions = deductionAmount + directDeductions;
  
  const net = Math.max(0, base + totalBonus - totalDeductions - advances);

  return {
    base,
    hourlyRate,
    overtimeHours,
    overtimeAmount,
    deductionHours,
    deductionAmount,
    directBonus,
    directDeductions,
    advances,
    totalBonus,
    totalDeductions,
    net
  };
}

export default function SalariesPage() {
  const { employees, fetchEmployees, addAdvance, markAsPaid, addEmployee, updateEmployee, deleteEmployee, settleEmployeeAccount } = useEmployeeStore();
  const { branches, selectedBranchId, setSelectedBranchId, fetchBranches } = useBranchStore();
  const { user } = useAuthStore();
  const isAdmin = user?.role === 'admin' || !user?.role;
  const [selectedMonth, setSelectedMonth] = useState('يوليو 2026');

  // Main Page Tabs (0: شاشة المرتبات والعمليات الحية, 1: تقارير القبض وصرف المرتبات, 2: تقارير السُلف والمسحوبات, 3: تقارير البونص والخصومات)
  const [tabValue, setTabValue] = useState(0);

  // Dialog states
  const [advanceDialog, setAdvanceDialog] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [advanceAmount, setAdvanceAmount] = useState('');
  const [advanceNotes, setAdvanceNotes] = useState('');

  // Advances History Dialog State (سجل السلف والبيان)
  const [advancesHistoryDialog, setAdvancesHistoryDialog] = useState(false);
  const [advancesList, setAdvancesList] = useState([]);
  const [loadingAdvances, setLoadingAdvances] = useState(false);
  const [historyEmp, setHistoryEmp] = useState(null);

  const [addEmpDialog, setAddEmpDialog] = useState(false);
  const [newEmpData, setNewEmpData] = useState({
    name: '',
    role: 'طيار دليفري',
    phone: '',
    baseSalary: 4500,
    hourlyRate: 0,
    overtimeHours: 0,
    deductionHours: 0,
    branchId: 'b1',
    cashierPin: '',
  });

  // Edit Employee Dialog
  const [editEmpDialog, setEditEmpDialog] = useState(false);
  const [editEmpData, setEditEmpData] = useState(null);

  // Hourly Adjustments Dialog
  const [hoursDialog, setHoursDialog] = useState(false);
  const [hoursEmpData, setHoursEmpData] = useState(null);

  // Global Bonus Dialog State
  const [bonusModalOpen, setBonusModalOpen] = useState(false);
  const [bonusForm, setBonusForm] = useState({
    employeeId: '',
    type: 'full_attendance',
    value: '500',
    notes: 'بونص التزام وحضور كافة الساعات الأساسية'
  });

  // Global Deduction Dialog State
  const [deductionModalOpen, setDeductionModalOpen] = useState(false);
  const [deductionForm, setDeductionForm] = useState({
    employeeId: '',
    type: 'deduction_hours',
    value: '2',
    notes: 'تأخير عن مواعيد الشيفت الرسمي'
  });

  // Delete Employee Dialog
  const [deleteEmpDialog, setDeleteEmpDialog] = useState(false);
  const [empToDelete, setEmpToDelete] = useState(null);

  // Settle Account Dialog
  const [settleDialog, setSettleDialog] = useState(false);
  const [empToSettle, setEmpToSettle] = useState(null);

  // REPORTS SYSTEM STATES (تقارير القبض والسلف والبونص)
  const [selectedReportEmp, setSelectedReportEmp] = useState('all');
  const [reportPaymentsList, setReportPaymentsList] = useState([]);
  const [reportAdvancesList, setReportAdvancesList] = useState([]);
  const [reportBonusList, setReportBonusList] = useState([]);
  const [loadingReports, setLoadingReports] = useState(false);

  useEffect(() => {
    fetchEmployees();
    if (fetchBranches) fetchBranches();
  }, []);

  // Fetch Reports Data when switching report tabs or changing selected employee filter
  const fetchReportsData = async () => {
    setLoadingReports(true);
    try {
      const empQuery = selectedReportEmp && selectedReportEmp !== 'all' ? `?employee_id=${selectedReportEmp}` : '';

      // 1. Fetch Salary Payments History
      const payRes = await fetch(`/api/employees/payments${empQuery}`);
      if (payRes.ok) {
        const payData = await payRes.json();
        setReportPaymentsList(payData || []);
      }

      // 2. Fetch Advances History
      const advRes = await fetch(`/api/employees/advances${empQuery}`);
      if (advRes.ok) {
        const advData = await advRes.json();
        setReportAdvancesList(advData || []);
      }

      // 3. Fetch Bonus & Deductions History
      const bdRes = await fetch(`/api/employees/bonus-deductions${empQuery}`);
      if (bdRes.ok) {
        const bdData = await bdRes.json();
        setReportBonusList(bdData || []);
      }
    } catch (e) {
      console.error('❌ Error fetching reports data:', e);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (tabValue > 0) {
      fetchReportsData();
    }
  }, [tabValue, selectedReportEmp]);

  const totalSalaries = (employees || []).reduce((sum, e) => {
    const calc = calculateEmployeeSalary(e);
    return sum + calc.net;
  }, 0);

  const totalAdvances = (employees || []).reduce((sum, e) => sum + (e.advances || 0), 0);
  const paidCount = (employees || []).filter((e) => e.status === 'تم الصرف' || e.status === 'تمت التصفية').length;

  const handleOpenAdvance = (emp) => {
    setSelectedEmployee(emp);
    setAdvanceAmount('');
    setAdvanceNotes('');
    setAdvanceDialog(true);
  };

  const handleConfirmAdvance = async () => {
    if (!selectedEmployee || !advanceAmount || !advanceNotes.trim()) return;
    await addAdvance(selectedEmployee.id, advanceAmount, advanceNotes.trim());
    setAdvanceDialog(false);
    setAdvanceAmount('');
    setAdvanceNotes('');
    fetchEmployees();
  };

  const handleOpenAdvancesHistory = async (emp) => {
    setHistoryEmp(emp);
    setLoadingAdvances(true);
    setAdvancesHistoryDialog(true);
    try {
      const res = await fetch(`/api/employees/${emp.id}/advances`);
      if (res.ok) {
        const data = await res.json();
        setAdvancesList(data || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdvances(false);
    }
  };

  const handleAddEmployeeSubmit = async () => {
    if (!newEmpData.name.trim()) return;
    if (newEmpData.role === 'كاشير' && (!newEmpData.cashierPin || newEmpData.cashierPin.trim().length < 4)) {
      alert('رمز PIN مطلوب للكاشير ويجب أن يكون 4 أرقام على الأقل!');
      return;
    }
    await addEmployee({
      name: newEmpData.name.trim(),
      role: newEmpData.role,
      phone: newEmpData.phone.trim(),
      baseSalary: parseFloat(newEmpData.baseSalary) || 4000,
      hourlyRate: parseFloat(newEmpData.hourlyRate) || 0,
      overtimeHours: parseFloat(newEmpData.overtimeHours) || 0,
      deductionHours: parseFloat(newEmpData.deductionHours) || 0,
      branchId: newEmpData.branchId || 'b1'
    });
    if (newEmpData.role === 'كاشير' && newEmpData.cashierPin.trim()) {
      let username = newEmpData.name.trim().toLowerCase().replace(/\s+/g, '_');
      if (!username || username === '_') {
        username = `cashier_${Date.now().toString().slice(-4)}`;
      }
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username,
            name: newEmpData.name.trim(),
            pin: newEmpData.cashierPin.trim(),
            role: 'cashier',
            permissions: ['pos', 'tables', 'delivery'],
            status: 'active',
            branch_id: newEmpData.branchId || 'b1',
          }),
        });
      } catch (e) {
        console.error('Failed to create user for cashier:', e);
      }
    }
    setAddEmpDialog(false);
    setNewEmpData({
      name: '',
      role: 'طيار دليفري',
      phone: '',
      baseSalary: 4500,
      hourlyRate: 0,
      overtimeHours: 0,
      deductionHours: 0,
      branchId: 'b1',
      cashierPin: '',
    });
  };

  const handleOpenEdit = (emp) => {
    setEditEmpData({
      id: emp.id,
      name: emp.name || '',
      role: emp.role || 'طيار دليفري',
      phone: emp.phone || '',
      baseSalary: emp.baseSalary || 4000,
      hourlyRate: emp.hourlyRate || 0,
      overtimeHours: emp.overtimeHours || 0,
      deductionHours: emp.deductionHours || 0,
      bonus: emp.bonus || 0,
      deductions: emp.deductions || 0,
      branchId: emp.branchId || 'b1'
    });
    setEditEmpDialog(true);
  };

  const handleConfirmEdit = async () => {
    if (!editEmpData || !editEmpData.name.trim()) return;
    await updateEmployee(editEmpData.id, editEmpData);
    setEditEmpDialog(false);
    setEditEmpData(null);
  };

  const handleOpenHoursModal = (emp) => {
    setHoursEmpData({
      id: emp.id,
      name: emp.name || '',
      baseSalary: emp.baseSalary || 4000,
      hourlyRate: emp.hourlyRate || 0,
      overtimeHours: emp.overtimeHours || 0,
      deductionHours: emp.deductionHours || 0,
      bonus: emp.bonus || 0,
      deductions: emp.deductions || 0,
      advances: emp.advances || 0
    });
    setHoursDialog(true);
  };

  const handleSaveHours = async () => {
    if (!hoursEmpData) return;
    await updateEmployee(hoursEmpData.id, {
      hourlyRate: parseFloat(hoursEmpData.hourlyRate) || 0,
      overtimeHours: parseFloat(hoursEmpData.overtimeHours) || 0,
      deductionHours: parseFloat(hoursEmpData.deductionHours) || 0,
      bonus: parseFloat(hoursEmpData.bonus) || 0,
      deductions: parseFloat(hoursEmpData.deductions) || 0
    });
    setHoursDialog(false);
    setHoursEmpData(null);
  };

  // Bonus Handler with DB & API Log
  const handleOpenBonusModal = (emp = null) => {
    setBonusForm({
      employeeId: emp ? emp.id : (employees && employees.length > 0 ? employees[0].id : ''),
      type: 'full_attendance',
      value: '500',
      notes: 'بونص التزام وحضور كافة الساعات الأساسية'
    });
    setBonusModalOpen(true);
  };

  const handleConfirmBonus = async () => {
    if (!bonusForm.employeeId || !bonusForm.value) return;
    const targetEmp = employees.find(e => e.id === bonusForm.employeeId);
    if (!targetEmp) return;

    const currentCalc = calculateEmployeeSalary(targetEmp);
    const val = parseFloat(bonusForm.value) || 0;
    let updatedBonus = targetEmp.bonus || 0;
    let updatedOvertime = targetEmp.overtimeHours || 0;

    const calcAmount = bonusForm.type === 'overtime_hours' ? (val * currentCalc.hourlyRate) : val;

    if (bonusForm.type === 'overtime_hours') {
      updatedOvertime += val;
    } else {
      updatedBonus += val;
    }

    await updateEmployee(targetEmp.id, {
      bonus: updatedBonus,
      overtimeHours: updatedOvertime
    });

    // Log in employee_bonus_deductions DB
    try {
      await fetch('/api/employees/bonus-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: targetEmp.id,
          employee_name: targetEmp.name,
          type: 'bonus',
          category: bonusForm.type,
          value_hours: bonusForm.type === 'overtime_hours' ? val : 0,
          amount: calcAmount,
          month: new Date().toISOString().substring(0, 7),
          notes: bonusForm.notes || 'إضافة بونص ومكافأة'
        })
      });
    } catch (e) {}

    setBonusModalOpen(false);
    fetchReportsData();
  };

  // Deduction Handler with DB & API Log
  const handleOpenDeductionModal = (emp = null) => {
    setDeductionForm({
      employeeId: emp ? emp.id : (employees && employees.length > 0 ? employees[0].id : ''),
      type: 'deduction_hours',
      value: '2',
      notes: 'تأخير عن مواعيد الشيفت الرسمي'
    });
    setDeductionModalOpen(true);
  };

  const handleConfirmDeduction = async () => {
    if (!deductionForm.employeeId || !deductionForm.value) return;
    const targetEmp = employees.find(e => e.id === deductionForm.employeeId);
    if (!targetEmp) return;

    const currentCalc = calculateEmployeeSalary(targetEmp);
    const val = parseFloat(deductionForm.value) || 0;
    let updatedDeductions = targetEmp.deductions || 0;
    let updatedDeductionHours = targetEmp.deductionHours || 0;

    const calcAmount = deductionForm.type === 'deduction_hours' ? (val * currentCalc.hourlyRate) : val;

    if (deductionForm.type === 'deduction_hours') {
      updatedDeductionHours += val;
    } else {
      updatedDeductions += val;
    }

    await updateEmployee(targetEmp.id, {
      deductions: updatedDeductions,
      deductionHours: updatedDeductionHours
    });

    // Log in employee_bonus_deductions DB
    try {
      await fetch('/api/employees/bonus-deductions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: targetEmp.id,
          employee_name: targetEmp.name,
          type: 'deduction',
          category: deductionForm.type,
          value_hours: deductionForm.type === 'deduction_hours' ? val : 0,
          amount: calcAmount,
          month: new Date().toISOString().substring(0, 7),
          notes: deductionForm.notes || 'تسجيل خصم وجزاء'
        })
      });
    } catch (e) {}

    setDeductionModalOpen(false);
    fetchReportsData();
  };

  const handleConfirmMarkAsPaid = async (emp) => {
    const calc = calculateEmployeeSalary(emp);
    await markAsPaid(emp.id, calc);
    fetchReportsData();
  };

  const handleOpenDelete = (emp) => {
    setEmpToDelete(emp);
    setDeleteEmpDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!empToDelete) return;
    await deleteEmployee(empToDelete.id);
    setDeleteEmpDialog(false);
    setEmpToDelete(null);
  };

  const handleOpenSettle = (emp) => {
    setEmpToSettle(emp);
    setSettleDialog(true);
  };

  const handleConfirmSettle = async () => {
    if (!empToSettle) return;
    await settleEmployeeAccount(empToSettle.id);
    setSettleDialog(false);
    setEmpToSettle(null);
  };

  const selectedBonusEmp = employees?.find(e => e.id === bonusForm.employeeId);
  const selectedDeductionEmp = employees?.find(e => e.id === deductionForm.employeeId);
  const selectedEmpName = selectedReportEmp === 'all' ? 'كافة الموظفين' : (employees?.find(e => e.id === selectedReportEmp)?.name || 'الموظف المحدد');

  // PRINT PDF REPORT (A4 Corporate ERP Format)
  const handleExportPDFReport = () => {
    let reportTitle = '';
    let columns = [];
    let reportData = [];
    let stats = [];
    let totals = {};

    if (tabValue === 1) {
      // Salaries Payment Payout Report
      reportTitle = `تقرير صرف القبض والرواتب - ${selectedEmpName}`;
      reportData = reportPaymentsList;

      const totalPaidSum = reportData.reduce((s, r) => s + (parseFloat(r.net_paid) || 0), 0);
      const totalBaseSum = reportData.reduce((s, r) => s + (parseFloat(r.base_salary) || 0), 0);

      stats = [
        { title: 'إجمالي الراتب المباشر المصروف', value: `${totalPaidSum.toLocaleString()} ج.م` },
        { title: 'عدد عمليات الصرف', value: `${reportData.length} عملية` },
        { title: 'إجمالي المرتبات الأساسية', value: `${totalBaseSum.toLocaleString()} ج.م` },
        { title: 'الموظف المحدد', value: selectedEmpName }
      ];

      columns = [
        { label: '#', accessor: (_, idx) => idx + 1 },
        { label: 'تاريخ ووقت الصرف', accessor: (r) => r.payment_date ? new Date(r.payment_date).toLocaleString('ar-EG') : (r.month || '-') },
        { label: 'اسم الموظف', accessor: 'employee_name' },
        { label: 'الوظيفة والفرع', accessor: (r) => `${r.employee_role || 'موظف'} (${r.branch_name || 'الرئيسي'})` },
        { label: 'المرتب الأساسي', accessor: (r) => `${parseFloat(r.base_salary || 0).toLocaleString()} ج.م` },
        { label: 'الإضافي والزيادة', accessor: (r) => `${parseFloat(r.overtime_amount || 0).toLocaleString()} ج.م` },
        { label: 'الخصومات', accessor: (r) => `${parseFloat(r.deduction_amount || 0).toLocaleString()} ج.م` },
        { label: 'السلف المخصومة', accessor: (r) => `${parseFloat(r.advances_amount || 0).toLocaleString()} ج.م` },
        { label: 'الصافي المصروف', accessor: (r) => `${parseFloat(r.net_paid || 0).toLocaleString()} ج.م` },
        { label: 'البيان', accessor: (r) => r.notes || 'صرف مرتب' }
      ];

      totals = {
        0: '', 1: 'الإجمالي الكلي', 2: '', 3: '', 4: `${totalBaseSum.toLocaleString()} ج.م`,
        5: '', 6: '', 7: '', 8: `${totalPaidSum.toLocaleString()} ج.م`, 9: ''
      };
    } else if (tabValue === 2) {
      // Advances Report
      reportTitle = `تقرير السُلف والمسحوبات والبيانات - ${selectedEmpName}`;
      reportData = reportAdvancesList;

      const totalAdvancesSum = reportData.reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

      stats = [
        { title: 'إجمالي السُلف المسحوبة', value: `${totalAdvancesSum.toLocaleString()} ج.م` },
        { title: 'عدد عمليات السُلف', value: `${reportData.length} عملية` },
        { title: 'متوسط قيمة السلفة', value: `${(reportData.length ? totalAdvancesSum / reportData.length : 0).toFixed(0)} ج.م` },
        { title: 'الموظف المحدد', value: selectedEmpName }
      ];

      columns = [
        { label: '#', accessor: (_, idx) => idx + 1 },
        { label: 'تاريخ السلفة', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : (r.month || '-') },
        { label: 'اسم الموظف', accessor: (r) => r.employee_name || 'موظف' },
        { label: 'الوظيفة والفرع', accessor: (r) => `${r.employee_role || 'موظف'} (${r.branch_name || 'الرئيسي'})` },
        { label: 'مبلغ السلفة', accessor: (r) => `${parseFloat(r.amount || 0).toLocaleString()} ج.م` },
        { label: 'البيان وسبب السلفة (إجباري)', accessor: (r) => r.notes || 'سلفة مالية' }
      ];

      totals = {
        0: '', 1: 'الإجمالي الكلي', 2: '', 3: '', 4: `${totalAdvancesSum.toLocaleString()} ج.م`, 5: ''
      };
    } else if (tabValue === 3) {
      // Bonus & Deductions Report
      reportTitle = `تقرير البونص والمكافآت والخصومات - ${selectedEmpName}`;
      reportData = reportBonusList;

      const bonusSum = reportData.filter(r => r.type === 'bonus').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);
      const deductionSum = reportData.filter(r => r.type === 'deduction').reduce((s, r) => s + (parseFloat(r.amount) || 0), 0);

      stats = [
        { title: 'إجمالي المكافآت والبونص', value: `+${bonusSum.toLocaleString()} ج.م` },
        { title: 'إجمالي الخصومات والجزاءات', value: `-${deductionSum.toLocaleString()} ج.م` },
        { title: 'صافي الفارق الإجمالي', value: `${(bonusSum - deductionSum).toLocaleString()} ج.م` },
        { title: 'الموظف المحدد', value: selectedEmpName }
      ];

      columns = [
        { label: '#', accessor: (_, idx) => idx + 1 },
        { label: 'تاريخ التسجيل', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : (r.month || '-') },
        { label: 'اسم الموظف', accessor: 'employee_name' },
        { label: 'نوع العملية', accessor: (r) => r.type === 'bonus' ? '🎁 بونص ومكافأة' : '⚠️ خصم وجزاء' },
        { label: 'التصنيف', accessor: (r) => r.category === 'overtime_hours' ? 'ساعات إضافي' : (r.category === 'deduction_hours' ? 'ساعات خصم' : (r.category === 'full_attendance' ? 'حضور كامل' : 'مباشر')) },
        { label: 'الساعات / القيمة', accessor: (r) => r.value_hours > 0 ? `${r.value_hours} ساعة (${parseFloat(r.amount).toLocaleString()} ج.م)` : `${parseFloat(r.amount).toLocaleString()} ج.م` },
        { label: 'السبب والبيان', accessor: (r) => r.notes || '-' }
      ];

      totals = {
        0: '', 1: 'الإجمالي', 2: '', 3: '', 4: '', 5: `صافي الفارق: ${(bonusSum - deductionSum).toLocaleString()} ج.م`, 6: ''
      };
    }

    generateReportPDF({
      title: reportTitle,
      subtitle: 'مطعم البرادعي للحواوشي',
      branchName: 'جميع الفروع',
      dateRangeStr: selectedMonth,
      stats,
      columns,
      data: reportData,
      totals
    });
  };

  // EXPORT EXCEL REPORT
  const handleExportExcelReport = () => {
    let filename = '';
    let columns = [];
    let data = [];

    if (tabValue === 1) {
      filename = `تقرير_صرف_مرتبات_${selectedEmpName}`;
      columns = [
        { label: 'تاريخ الصرف', accessor: (r) => r.payment_date ? new Date(r.payment_date).toLocaleString('ar-EG') : r.month },
        { label: 'الموظف', accessor: 'employee_name' },
        { label: 'الوظيفة', accessor: 'employee_role' },
        { label: 'المرتب الأساسي', accessor: 'base_salary' },
        { label: 'قيمة الإضافي', accessor: 'overtime_amount' },
        { label: 'قيمة الخصومات', accessor: 'deduction_amount' },
        { label: 'السلف المخصومة', accessor: 'advances_amount' },
        { label: 'الصافي المصروف', accessor: 'net_paid' },
        { label: 'البيان', accessor: 'notes' }
      ];
      data = reportPaymentsList;
    } else if (tabValue === 2) {
      filename = `تقرير_سلف_مسحوبات_${selectedEmpName}`;
      columns = [
        { label: 'تاريخ السلفة', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : r.month },
        { label: 'الموظف', accessor: 'employee_name' },
        { label: 'الوظيفة', accessor: 'employee_role' },
        { label: 'مبلغ السلفة', accessor: 'amount' },
        { label: 'البيان والسبب', accessor: 'notes' }
      ];
      data = reportAdvancesList;
    } else if (tabValue === 3) {
      filename = `تقرير_بونص_خصومات_${selectedEmpName}`;
      columns = [
        { label: 'تاريخ التسجيل', accessor: (r) => r.created_at ? new Date(r.created_at).toLocaleString('ar-EG') : r.month },
        { label: 'الموظف', accessor: 'employee_name' },
        { label: 'نوع العملية', accessor: (r) => r.type === 'bonus' ? 'بونص' : 'خصم' },
        { label: 'التصنيف', accessor: 'category' },
        { label: 'عدد الساعات', accessor: 'value_hours' },
        { label: 'المبلغ', accessor: 'amount' },
        { label: 'السبب والبيان', accessor: 'notes' }
      ];
      data = reportBonusList;
    }

    exportToExcel(filename, columns, data);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, display: 'flex', flexDirection: 'column', gap: 3, height: '100%', overflowY: 'auto', pb: 4 }}>
      {/* Page Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ width: 48, height: 48, borderRadius: '14px', bgcolor: 'rgba(66, 133, 244, 0.1)', color: '#4285F4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AccountBalanceWallet sx={{ fontSize: 26 }} />
          </Box>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: { xs: '1.3rem', md: '1.8rem' } }}>
              المرتبات وتقارير القبض والسلف والبونص
            </Typography>
            <Typography variant="body2" sx={{ color: '#6B7280' }}>
              إدارة المرتبات، إضافة البونص والخصومات بالساعات، وطباعة تقارير القبض والمسحوبات لكل موظف أو للكل
            </Typography>
          </Box>
        </Box>

        <Stack direction="row" spacing={1.5} useFlexGap sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
          {isAdmin && (
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <Select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                sx={{ borderRadius: '12px', bgcolor: '#FFF', fontWeight: 800, height: 42 }}
              >
                <MenuItem value="all">🏢 كافـة الفـروع</MenuItem>
                {branches.map((b) => (
                  <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <Button
            variant="contained"
            color="success"
            startIcon={<BonusIcon />}
            onClick={() => handleOpenBonusModal()}
            sx={{ borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800, background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)' }}
          >
            🎁 إضافة بونص / مكافأة
          </Button>

          <Button
            variant="contained"
            color="error"
            startIcon={<DeductionIcon />}
            onClick={() => handleOpenDeductionModal()}
            sx={{ borderRadius: '12px', px: 2.5, py: 1, fontWeight: 800, background: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)' }}
          >
            ⚠️ تسجيل خصم
          </Button>

          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setAddEmpDialog(true)}
            sx={{ bgcolor: '#4285F4', borderRadius: '12px', px: 2.5, py: 1, fontWeight: 700 }}
          >
            إضافة موظف جديد
          </Button>
        </Stack>
      </Box>

      {/* Main Navigation Tabs Bar */}
      <Paper
        elevation={2}
        sx={{
          borderRadius: '16px',
          border: '1.5px solid #CBD5E1',
          bgcolor: '#FFFFFF',
          position: 'sticky',
          top: 0,
          zIndex: 20,
          boxShadow: '0 4px 20px rgba(0,0,0,0.06)'
        }}
      >
        <Tabs
          value={tabValue}
          onChange={(e, val) => setTabValue(val)}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          allowScrollButtonsMobile
          sx={{
            minHeight: 54,
            '& .MuiTab-root': {
              minHeight: 54,
              fontSize: { xs: '0.85rem', md: '0.95rem' },
              fontWeight: 800,
              px: { xs: 2, md: 3 },
              color: '#475569',
              '&.Mui-selected': {
                color: '#2563EB',
                fontWeight: 900
              }
            }
          }}
        >
          <Tab icon={<AccountBalanceWallet sx={{ fontSize: 22 }} />} iconPosition="start" label="💼 شاشة المرتبات والعمليات الحية" />
          <Tab icon={<ReceiptLong sx={{ fontSize: 22 }} />} iconPosition="start" label="📑 تقارير القبض وصرف المرتبات" />
          <Tab icon={<MoneyOutlined sx={{ fontSize: 22, color: '#EF4444' }} />} iconPosition="start" label="💸 تقارير السُلف والمسحوبات والبيانات" />
          <Tab icon={<BonusIcon sx={{ fontSize: 22, color: '#10B981' }} />} iconPosition="start" label="🎁 تقارير البونص والمكافآت والخصومات" />
        </Tabs>
      </Paper>

      {/* TAB 0: LIVE SALARIES BOARD & EMPLOYEES LIST */}
      <TabPanel value={tabValue} index={0}>
        {/* Stats Cards */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
          {[
            { label: 'إجمالي المرتبات المستحقة', value: `${totalSalaries.toLocaleString()} ج.م`, color: '#4285F4', icon: <MoneyOutlined /> },
            { label: 'إجمالي السلف المسحوبة', value: `${totalAdvances.toLocaleString()} ج.م`, color: '#EF4444', icon: <AccountBalanceWallet /> },
            { label: 'تم صرف / تصفية الرواتب', value: `${paidCount} / ${employees?.length || 0}`, color: '#34D399', icon: <PersonOutlined /> },
            { label: 'الشهر الحالي', value: selectedMonth, color: '#FF8C42', icon: <CalendarMonth /> },
          ].map((stat, i) => (
            <Paper key={i} sx={{ p: 2, borderRadius: '16px', border: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{ width: 44, height: 44, borderRadius: '12px', bgcolor: `${stat.color}15`, color: stat.color, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {stat.icon}
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: '#6B7280', fontWeight: 600 }}>{stat.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#1A1A2E', fontSize: '1.1rem' }}>{stat.value}</Typography>
              </Box>
            </Paper>
          ))}
        </Box>

        {/* Employees Table */}
        <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB', boxShadow: '0 4px 12px rgba(0,0,0,0.03)' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#F8FAFC' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الفرع والوظيفة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>المرتب الأساسي</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>أجر الساعة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ساعات وبونص الزيادة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>ساعات وخصومات</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>السلف المسحوبة</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الصافي المستحق</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>الحالة</TableCell>
                <TableCell align="center" sx={{ fontWeight: 800 }}>إجراءات الإدارة البونص والخصم</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(!employees || employees.length === 0) ? (
                <TableRow>
                  <TableCell colSpan={10} align="center" sx={{ py: 4, color: '#94A3B8', fontWeight: 700 }}>
                    لا يوجد موظفين مسجلين حالياً. اضغط على "إضافة موظف جديد" لبدء السجل.
                  </TableCell>
                </TableRow>
              ) : (
                employees.map((row) => {
                  const calc = calculateEmployeeSalary(row);
                  const isPaid = row.status === 'تم الصرف';
                  const isSettled = row.status === 'تمت التصفية';
                  const branchObj = (branches || []).find(b => b.id === row.branchId) || { name: row.branchName || 'الفرع الأول' };

                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontWeight: 800, color: '#1A1A2E' }}>
                        {row.name}
                        {row.phone && (
                          <Typography variant="caption" display="block" color="text.secondary">
                            📞 {row.phone}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={<Store sx={{ fontSize: '14px !important' }} />}
                          label={branchObj.name}
                          size="small"
                          variant="outlined"
                          sx={{ fontWeight: 700, borderColor: '#CBD5E1', bgcolor: '#F8FAFC', mb: 0.5 }}
                        />
                        <Typography variant="caption" display="block" color="text.secondary" fontWeight="bold">
                          {row.role}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{calc.base.toLocaleString()} ج.م</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0284C7' }}>
                        {calc.hourlyRate.toFixed(1)} ج.م/س
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#166534' }}>
                          +{calc.overtimeHours} ساعة
                        </Typography>
                        <Typography variant="caption" color="success.main" display="block" fontWeight="bold">
                          +{calc.totalBonus.toLocaleString()} ج.م
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 800, color: '#991B1B' }}>
                          -{calc.deductionHours} ساعة
                        </Typography>
                        <Typography variant="caption" color="error.main" display="block" fontWeight="bold">
                          -{calc.totalDeductions.toLocaleString()} ج.م
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          onClick={() => handleOpenAdvancesHistory(row)}
                          sx={{
                            fontWeight: 800,
                            color: '#EF4444',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '&:hover': { textDecoration: 'underline' }
                          }}
                        >
                          {calc.advances.toLocaleString()} ج.م
                          {calc.advances > 0 && <Chip label="البيان 📑" size="small" color="error" variant="outlined" sx={{ height: 18, fontSize: '0.65rem', fontWeight: 800 }} />}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#4285F4', fontSize: '1.05rem' }}>{calc.net.toLocaleString()} ج.م</TableCell>
                      <TableCell>
                        <Chip
                          label={row.status || 'مستحق'}
                          size="small"
                          sx={{
                            bgcolor: isSettled ? '#E0E7FF' : (isPaid ? '#D1FAE5' : '#FEF3C7'),
                            color: isSettled ? '#3730A3' : (isPaid ? '#065F46' : '#92400E'),
                            fontWeight: 800,
                          }}
                        />
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', gap: 0.8, justifyContent: 'center', flexWrap: 'wrap' }}>
                          <Tooltip title="إضافة بونص للموظف">
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              onClick={() => handleOpenBonusModal(row)}
                              disabled={isSettled}
                              sx={{ borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, py: 0.4 }}
                            >
                              🎁 بونص
                            </Button>
                          </Tooltip>

                          <Tooltip title="إضافة خصم على الموظف">
                            <Button
                              size="small"
                              variant="contained"
                              color="error"
                              onClick={() => handleOpenDeductionModal(row)}
                              disabled={isSettled}
                              sx={{ borderRadius: '8px', fontSize: '0.72rem', fontWeight: 800, py: 0.4 }}
                            >
                              ⚠️ خصم
                            </Button>
                          </Tooltip>

                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenHoursModal(row)}
                            disabled={isSettled}
                            sx={{ borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}
                          >
                            ⏱️ الساعات
                          </Button>

                          <Button
                            size="small"
                            variant="outlined"
                            onClick={() => handleOpenAdvance(row)}
                            disabled={isSettled}
                            sx={{ borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700 }}
                          >
                            + سلفة
                          </Button>

                          {!isPaid && !isSettled && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => handleConfirmMarkAsPaid(row)}
                              sx={{ borderRadius: '8px', fontSize: '0.72rem', fontWeight: 700, bgcolor: '#10B981' }}
                            >
                              صرف
                            </Button>
                          )}

                          <IconButton size="small" onClick={() => handleOpenEdit(row)} color="primary">
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenSettle(row)} color="secondary">
                            <CheckCircleOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleOpenDelete(row)} color="error">
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </TabPanel>

      {/* TABS 1, 2, 3: REPORTS SYSTEM PANELS */}
      {tabValue > 0 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Reports Filter & Export Toolbar */}
          <Paper sx={{ p: 2.5, borderRadius: '16px', border: '1.5px solid #CBD5E1', bgcolor: '#FFFFFF' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 220 }}>
                  <InputLabel>فلترة بالموظف *</InputLabel>
                  <Select
                    value={selectedReportEmp}
                    label="فلترة بالموظف *"
                    onChange={(e) => setSelectedReportEmp(e.target.value)}
                    sx={{ borderRadius: '10px', fontWeight: 800 }}
                  >
                    <MenuItem value="all">👥 كافة الموظفين (عرض تقرير شامل)</MenuItem>
                    {(employees || []).map((emp) => (
                      <MenuItem key={emp.id} value={emp.id}>
                        👤 {emp.name} ({emp.role})
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <Button
                  variant="outlined"
                  startIcon={<Refresh />}
                  onClick={fetchReportsData}
                  sx={{ borderRadius: '10px', fontWeight: 800 }}
                >
                  تحديث البيانات
                </Button>
              </Box>

              <Stack direction="row" spacing={1.5}>
                <Button
                  variant="contained"
                  startIcon={<PictureAsPdf />}
                  onClick={handleExportPDFReport}
                  sx={{ borderRadius: '12px', fontWeight: 900, px: 2.5, bgcolor: '#0F172A', '&:hover': { bgcolor: '#1E293B' } }}
                >
                  طباعة التقرير (ERP A4 PDF)
                </Button>

                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ExcelIcon />}
                  onClick={handleExportExcelReport}
                  sx={{ borderRadius: '12px', fontWeight: 900, px: 2.5 }}
                >
                  تصدير Excel
                </Button>
              </Stack>
            </Box>
          </Paper>

          {/* TAB 1: SALARIES PAYMENTS DISBURSEMENT REPORT */}
          <TabPanel value={tabValue} index={1}>
            {loadingReports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : reportPaymentsList.length === 0 ? (
              <Alert severity="info" sx={{ fontWeight: 700 }}>
                لا توجد عمليات صرف رواتب مسجلة في التاريخ المالي لهذا الاختيار.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>تاريخ ووقت الصرف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الوظيفة والفرع</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>المرتب الأساسي</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الإضافي والزيادة</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الخصومات</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>السلف المخصومة</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#10B981' }}>الصافي المصروف (ج.م)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>البيان والملاحظات</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportPaymentsList.map((pay, idx) => (
                      <TableRow key={pay.id || idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {pay.payment_date ? new Date(pay.payment_date).toLocaleString('ar-EG') : (pay.month || '—')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{pay.employee_name}</TableCell>
                        <TableCell>{pay.employee_role || 'موظف'} ({pay.branch_name || 'الرئيسي'})</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>{parseFloat(pay.base_salary || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ color: 'success.main', fontWeight: 800 }}>+{parseFloat(pay.overtime_amount || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ color: 'error.main', fontWeight: 800 }}>-{parseFloat(pay.deduction_amount || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ color: 'error.main', fontWeight: 800 }}>-{parseFloat(pay.advances_amount || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#10B981', fontSize: '1rem' }}>{parseFloat(pay.net_paid || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ color: '#475569' }}>{pay.notes || 'صرف مرتب'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* TAB 2: ADVANCES & STATEMENTS REPORT */}
          <TabPanel value={tabValue} index={2}>
            {loadingReports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : reportAdvancesList.length === 0 ? (
              <Alert severity="info" sx={{ fontWeight: 700 }}>
                لا توجد سُلف ومسحوبات مسجلة لهذا الموظف أو الفترة.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>تاريخ السلفة</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الوظيفة والفرع</TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#EF4444' }}>مبلغ السلفة (ج.م)</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>البيان والسبب التفصيلي (إجباري)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportAdvancesList.map((adv, idx) => (
                      <TableRow key={adv.id || idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {adv.created_at ? new Date(adv.created_at).toLocaleString('ar-EG') : (adv.month || '—')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{adv.employee_name || 'موظف'}</TableCell>
                        <TableCell>{adv.employee_role || 'موظف'} ({adv.branch_name || 'الرئيسي'})</TableCell>
                        <TableCell sx={{ fontWeight: 900, color: '#EF4444', fontSize: '1rem' }}>{parseFloat(adv.amount || 0).toLocaleString()} ج.م</TableCell>
                        <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>{adv.notes || 'سلفة مالية'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* TAB 3: BONUS & DEDUCTIONS REPORT */}
          <TabPanel value={tabValue} index={3}>
            {loadingReports ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>
            ) : reportBonusList.length === 0 ? (
              <Alert severity="info" sx={{ fontWeight: 700 }}>
                لا توجد سجلات مكافآت أو خصومات مسجلة لهذا الموظف أو الفترة.
              </Alert>
            ) : (
              <TableContainer component={Paper} sx={{ borderRadius: '16px', border: '1px solid #E5E7EB' }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>تاريخ التسجيل</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>اسم الموظف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>نوع العملية</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>التصنيف</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>الساعات / المبلغ</TableCell>
                      <TableCell sx={{ fontWeight: 800 }}>السبب والبيان</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reportBonusList.map((bd, idx) => (
                      <TableRow key={bd.id || idx} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                        <TableCell sx={{ fontSize: '0.82rem', color: '#64748B' }}>
                          {bd.created_at ? new Date(bd.created_at).toLocaleString('ar-EG') : (bd.month || '—')}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 800 }}>{bd.employee_name}</TableCell>
                        <TableCell>
                          <Chip
                            label={bd.type === 'bonus' ? '🎁 بونص ومكافأة' : '⚠️ خصم وجزاء'}
                            color={bd.type === 'bonus' ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 800 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>
                          {bd.category === 'overtime_hours' ? 'ساعات إضافي' : (bd.category === 'deduction_hours' ? 'ساعات خصم' : (bd.category === 'full_attendance' ? 'حضور كامل' : 'مباشر'))}
                        </TableCell>
                        <TableCell sx={{ fontWeight: 900, color: bd.type === 'bonus' ? '#10B981' : '#EF4444' }}>
                          {bd.value_hours > 0 ? `${bd.value_hours} ساعة (${parseFloat(bd.amount || 0).toLocaleString()} ج.م)` : `${parseFloat(bd.amount || 0).toLocaleString()} ج.م`}
                        </TableCell>
                        <TableCell sx={{ color: '#334155', fontWeight: 600 }}>{bd.notes || '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>
        </Box>
      )}

      {/* GLOBAL BONUS MODAL */}
      <Dialog open={bonusModalOpen} onClose={() => setBonusModalOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: 'success.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <BonusIcon fontSize="large" />
          إضافة بونص ومكافأة لموظف
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth required>
            <InputLabel>اختيار الموظف المستحق للبونص *</InputLabel>
            <Select
              value={bonusForm.employeeId}
              label="اختيار الموظف المستحق للبونص *"
              onChange={(e) => setBonusForm({ ...bonusForm, employeeId: e.target.value })}
            >
              {(employees || []).map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  👤 <strong>{emp.name}</strong> - {emp.role} ({emp.branchName}) | الأساسي: {emp.baseSalary} ج.م
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع المكافأة / البونص</InputLabel>
                <Select
                  value={bonusForm.type}
                  label="نوع المكافأة / البونص"
                  onChange={(e) => setBonusForm({ ...bonusForm, type: e.target.value })}
                >
                  <MenuItem value="full_attendance">🌟 بونص التزام وحضور كامل الساعات الأساسية</MenuItem>
                  <MenuItem value="overtime_hours">⏱️ ساعات إضافية (أوفر تايم بالساعات)</MenuItem>
                  <MenuItem value="direct_cash">💵 مكافأة مالية مباشرة (بالجنيه)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label={bonusForm.type === 'overtime_hours' ? 'عدد الساعات الإضافية' : 'المبلغ بالجنيه (ج.م)'}
                value={bonusForm.value}
                onChange={(e) => setBonusForm({ ...bonusForm, value: e.target.value })}
              />
            </Grid>

            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="السبب والملاحظات"
                value={bonusForm.notes}
                onChange={(e) => setBonusForm({ ...bonusForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          {/* Live Net Preview */}
          {selectedBonusEmp && (() => {
            const currentCalc = calculateEmployeeSalary(selectedBonusEmp);
            const val = parseFloat(bonusForm.value) || 0;
            const addedBonusAmount = bonusForm.type === 'overtime_hours' ? (val * currentCalc.hourlyRate) : val;
            const newNet = currentCalc.net + addedBonusAmount;

            return (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#ECFDF5', borderColor: '#6EE7B7', borderRadius: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="success.main">
                  💚 معاينة التأثير المالي على راتب {selectedBonusEmp.name}:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2">الراتب الحالي:</Typography>
                  <Typography variant="body2" fontWeight="bold">{currentCalc.net.toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                  <Typography variant="body2" fontWeight="bold">البونص المضاف:</Typography>
                  <Typography variant="body2" fontWeight="bold">+{addedBonusAmount.toLocaleString()} ج.م</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.dark' }}>
                  <Typography variant="body1" fontWeight="900">الصافي الجديد المتوقع:</Typography>
                  <Typography variant="h6" fontWeight="900">{newNet.toLocaleString()} ج.م</Typography>
                </Box>
              </Paper>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setBonusModalOpen(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmBonus} variant="contained" color="success" size="large" sx={{ px: 3, fontWeight: 'bold' }}>
            تأكيد البونص والمكافأة
          </Button>
        </DialogActions>
      </Dialog>

      {/* GLOBAL DEDUCTION MODAL */}
      <Dialog open={deductionModalOpen} onClose={() => setDeductionModalOpen(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '20px', p: 1 } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: 'error.main', display: 'flex', alignItems: 'center', gap: 1 }}>
          <DeductionIcon fontSize="large" />
          تسجيل خصم / جزاء على موظف
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <FormControl fullWidth required>
            <InputLabel>اختيار الموظف *</InputLabel>
            <Select
              value={deductionForm.employeeId}
              label="اختيار الموظف *"
              onChange={(e) => setDeductionForm({ ...deductionForm, employeeId: e.target.value })}
            >
              {(employees || []).map((emp) => (
                <MenuItem key={emp.id} value={emp.id}>
                  👤 <strong>{emp.name}</strong> - {emp.role} ({emp.branchName}) | الأساسي: {emp.baseSalary} ج.م
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Grid container spacing={2}>
            <Grid xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>نوع الخصم</InputLabel>
                <Select
                  value={deductionForm.type}
                  label="نوع الخصم"
                  onChange={(e) => setDeductionForm({ ...deductionForm, type: e.target.value })}
                >
                  <MenuItem value="deduction_hours">⏱️ خصم بالساعات (تأخير / غياب / خروج مبكر)</MenuItem>
                  <MenuItem value="direct_cash">💵 خصم مالي مباشر (جزاء / تلفيات / بالجنيه)</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid xs={12} sm={6}>
              <TextField
                fullWidth
                required
                type="number"
                label={deductionForm.type === 'deduction_hours' ? 'عدد ساعات الخصم' : 'مبلغ الخصم بالجنيه (ج.م)'}
                value={deductionForm.value}
                onChange={(e) => setDeductionForm({ ...deductionForm, value: e.target.value })}
              />
            </Grid>

            <Grid xs={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="سبب الخصم والجزاء"
                value={deductionForm.notes}
                onChange={(e) => setDeductionForm({ ...deductionForm, notes: e.target.value })}
              />
            </Grid>
          </Grid>

          {/* Live Net Preview */}
          {selectedDeductionEmp && (() => {
            const currentCalc = calculateEmployeeSalary(selectedDeductionEmp);
            const val = parseFloat(deductionForm.value) || 0;
            const addedDeductionAmount = deductionForm.type === 'deduction_hours' ? (val * currentCalc.hourlyRate) : val;
            const newNet = Math.max(0, currentCalc.net - addedDeductionAmount);

            return (
              <Paper variant="outlined" sx={{ p: 2, bgcolor: '#FEF2F2', borderColor: '#FCA5A5', borderRadius: '12px' }}>
                <Typography variant="subtitle2" fontWeight="bold" color="error.main">
                  ⚠️ معاينة الخصم من راتب {selectedDeductionEmp.name}:
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                  <Typography variant="body2">الراتب الحالي:</Typography>
                  <Typography variant="body2" fontWeight="bold">{currentCalc.net.toLocaleString()} ج.م</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                  <Typography variant="body2" fontWeight="bold">الخصم المطبق:</Typography>
                  <Typography variant="body2" fontWeight="bold">-{addedDeductionAmount.toLocaleString()} ج.م</Typography>
                </Box>
                <Divider sx={{ my: 0.5 }} />
                <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.dark' }}>
                  <Typography variant="body1" fontWeight="900">الصافي الجديد المتوقع:</Typography>
                  <Typography variant="h6" fontWeight="900">{newNet.toLocaleString()} ج.م</Typography>
                </Box>
              </Paper>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeductionModalOpen(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmDeduction} variant="contained" color="error" size="large" sx={{ px: 3, fontWeight: 'bold' }}>
            تأكيد تطبيق الخصم
          </Button>
        </DialogActions>
      </Dialog>

      {/* HOURLY ADJUSTMENTS DIALOG */}
      <Dialog open={hoursDialog} onClose={() => setHoursDialog(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 800, color: '#0284C7', display: 'flex', alignItems: 'center', gap: 1 }}>
          <TimeIcon />
          تعديل ساعات الخصم والزيادة - {hoursEmpData?.name}
        </DialogTitle>
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          {hoursEmpData && (() => {
            const calc = calculateEmployeeSalary(hoursEmpData);
            return (
              <>
                <Grid container spacing={2}>
                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="المرتب الأساسي (ج.م)"
                      value={hoursEmpData.baseSalary}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, baseSalary: e.target.value })}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="أجر الساعة (ج.م/ساعة)"
                      helperText={parseFloat(hoursEmpData.hourlyRate) === 0 ? `محسوب تلقائياً: ${(parseFloat(hoursEmpData.baseSalary || 0) / 240).toFixed(1)} ج.م/س` : ''}
                      value={hoursEmpData.hourlyRate}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, hourlyRate: e.target.value })}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="ساعات الزيادة / الإضافي (ساعة)"
                      value={hoursEmpData.overtimeHours}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, overtimeHours: e.target.value })}
                      slotProps={{
                        input: {
                          endAdornment: <Typography variant="caption" color="success.main" fontWeight="bold">+{calc.overtimeAmount.toFixed(0)} ج.م</Typography>
                        }
                      }}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="مكافأة مباشرة إضافية (ج.م)"
                      value={hoursEmpData.bonus}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, bonus: e.target.value })}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="ساعات الخصم / التأخير (ساعة)"
                      value={hoursEmpData.deductionHours}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, deductionHours: e.target.value })}
                      slotProps={{
                        input: {
                          endAdornment: <Typography variant="caption" color="error.main" fontWeight="bold">-{calc.deductionAmount.toFixed(0)} ج.م</Typography>
                        }
                      }}
                    />
                  </Grid>

                  <Grid xs={12} sm={6}>
                    <TextField
                      fullWidth
                      type="number"
                      size="small"
                      label="خصم مباشر إضافي (ج.م)"
                      value={hoursEmpData.deductions}
                      onChange={(e) => setHoursEmpData({ ...hoursEmpData, deductions: e.target.value })}
                    />
                  </Grid>
                </Grid>

                {/* Calculation Summary Preview Box */}
                <Paper variant="outlined" sx={{ p: 2, bgcolor: '#F8FAFC', borderRadius: '12px', border: '1.5px solid #CBD5E1' }}>
                  <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1, color: '#0F172A' }}>
                    🧮 المعاينة المباشرة للراتب الصافي:
                  </Typography>
                  <Stack spacing={0.5}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">المرتب الأساسي:</Typography>
                      <Typography variant="body2" fontWeight="bold">{calc.base.toLocaleString()} ج.م</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'success.main' }}>
                      <Typography variant="body2" fontWeight="bold">إجمالي الزيادات (+إضافي +مكافأة):</Typography>
                      <Typography variant="body2" fontWeight="bold">+{calc.totalBonus.toLocaleString()} ج.م</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'error.main' }}>
                      <Typography variant="body2" fontWeight="bold">إجمالي الخصومات (-ساعات -خصم -سلف):</Typography>
                      <Typography variant="body2" fontWeight="bold">-{(calc.totalDeductions + calc.advances).toLocaleString()} ج.م</Typography>
                    </Box>
                    <Divider sx={{ my: 0.5 }} />
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', color: 'primary.main' }}>
                      <Typography variant="body1" fontWeight="900">الصافي النهـائي المستحق:</Typography>
                      <Typography variant="h6" fontWeight="900">{calc.net.toLocaleString()} ج.م</Typography>
                    </Box>
                  </Stack>
                </Paper>
              </>
            );
          })()}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setHoursDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleSaveHours} variant="contained" color="primary" sx={{ px: 3, fontWeight: 'bold' }}>
            حفظ تعديلات الساعات
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advance Dialog with Required Notes/Statement */}
      <Dialog open={advanceDialog} onClose={() => setAdvanceDialog(false)} maxWidth="xs" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#EF4444' }}>💸 تسجيل سلفة جديدة مع البيان</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            الموظف: <strong>{selectedEmployee?.name}</strong> | المرتب الأساسي: <strong>{selectedEmployee?.baseSalary} ج.م</strong>
          </Typography>

          <Alert severity="warning" sx={{ fontWeight: 700, fontSize: '0.8rem' }}>
            ⚠️ يجب كتابة البيان والسبب مع مبلغ السلفة للتوثيق الإداري.
          </Alert>

          <TextField
            fullWidth
            required
            type="number"
            size="small"
            label="مبلغ السلفة (ج.م) *"
            value={advanceAmount}
            onChange={(e) => setAdvanceAmount(e.target.value)}
            autoFocus
          />

          <TextField
            fullWidth
            required
            multiline
            rows={2}
            size="small"
            label="البيان / سبب وتفاصيل السلفة *"
            placeholder="مثال: مصاريف شخصية طارئة / خصم من مرتب الشهر..."
            value={advanceNotes}
            onChange={(e) => setAdvanceNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvanceDialog(false)} variant="outlined">إلغاء</Button>
          <Button
            onClick={handleConfirmAdvance}
            variant="contained"
            color="error"
            disabled={!advanceAmount || !advanceNotes.trim()}
            sx={{ fontWeight: 'bold' }}
          >
            حفظ وتأكيد السلفة
          </Button>
        </DialogActions>
      </Dialog>

      {/* Advances History Dialog */}
      <Dialog open={advancesHistoryDialog} onClose={() => setAdvancesHistoryDialog(false)} maxWidth="sm" fullWidth slotProps={{ paper: { sx: { borderRadius: '16px' } } }}>
        <DialogTitle sx={{ fontWeight: 900, color: '#1E293B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>📑 سجل تفاصيل وبيانات سُلف الموظف ({historyEmp?.name})</span>
          <Chip label={`إجمالي السلف: ${historyEmp?.advances || 0} ج.م`} color="error" size="small" sx={{ fontWeight: 800 }} />
        </DialogTitle>
        <DialogContent dividers sx={{ p: 2 }}>
          {loadingAdvances ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={30} />
            </Box>
          ) : advancesList.length === 0 ? (
            <Alert severity="info" sx={{ fontWeight: 700 }}>
              لا توجد سُلف تفصيلية مسجلة سابقاً لهذا الموظف.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: '12px' }}>
              <Table size="small">
                <TableHead sx={{ bgcolor: '#F8FAFC' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 800 }}>#</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>تاريخ التسجيل</TableCell>
                    <TableCell sx={{ fontWeight: 800 }}>البيان / السبب</TableCell>
                    <TableCell sx={{ fontWeight: 800, color: '#EF4444' }}>مبلغ السلفة</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {advancesList.map((adv, idx) => (
                    <TableRow key={adv.id || idx} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{idx + 1}</TableCell>
                      <TableCell sx={{ fontSize: '0.8rem', color: '#64748B' }}>
                        {adv.created_at ? new Date(adv.created_at).toLocaleString('ar-EG') : (adv.month || '—')}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 800, color: '#1E293B' }}>
                        {adv.notes || 'سلفة مالية'}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 900, color: '#EF4444' }}>
                        {parseFloat(adv.amount || 0).toLocaleString()} ج.م
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAdvancesHistoryDialog(false)} variant="contained">إلغاء وإغلاق</Button>
        </DialogActions>
      </Dialog>

      {/* Add Employee Dialog */}
      <Dialog open={addEmpDialog} onClose={() => setAddEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>👤 إضافة موظف جديد</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            label="اسم الموظف *"
            value={newEmpData.name}
            onChange={(e) => setNewEmpData({ ...newEmpData, name: e.target.value })}
          />
          <FormControl fullWidth size="small">
            <InputLabel>الفرع التابع له *</InputLabel>
            <Select
              value={newEmpData.branchId}
              label="الفرع التابع له *"
              onChange={(e) => setNewEmpData({ ...newEmpData, branchId: e.target.value })}
            >
              {(branches && branches.length > 0 ? branches : [
                { id: 'b1', name: 'فرع عزت' },
                { id: 'b2', name: 'فرع المسلة' }
              ]).map((b) => (
                <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth size="small">
            <InputLabel>الوظيفة</InputLabel>
            <Select
              value={newEmpData.role}
              label="الوظيفة"
              onChange={(e) => setNewEmpData({ ...newEmpData, role: e.target.value })}
            >
              <MenuItem value="طيار دليفري">طيار دليفري</MenuItem>
              <MenuItem value="كاشير">كاشير</MenuItem>
              <MenuItem value="شيف مطبخ">شيف مطبخ</MenuItem>
              <MenuItem value="عمال نظافة وترتيب">عمال نظافة وترتيب</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            size="small"
            label="رقم الهاتف"
            value={newEmpData.phone}
            onChange={(e) => setNewEmpData({ ...newEmpData, phone: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="المرتب الأساسي (ج.م)"
            value={newEmpData.baseSalary}
            onChange={(e) => setNewEmpData({ ...newEmpData, baseSalary: e.target.value })}
          />
          <TextField
            fullWidth
            type="number"
            size="small"
            label="أجر الساعة (اختياري - 0 للتحسب التلقائي)"
            value={newEmpData.hourlyRate}
            onChange={(e) => setNewEmpData({ ...newEmpData, hourlyRate: e.target.value })}
          />
          {newEmpData.role === 'كاشير' && (
            <TextField
              fullWidth
              size="small"
              label="🔑 رمز PIN للكاشير (4 أرقام على الأقل) *"
              placeholder="مثال: 1234"
              inputProps={{ maxLength: 8 }}
              value={newEmpData.cashierPin}
              onChange={(e) => setNewEmpData({ ...newEmpData, cashierPin: e.target.value.replace(/\D/g, '') })}
              helperText="سيتم إنشاء حساب دخول تلقائياً للكاشير بهذا الرمز"
              sx={{ '& .MuiFormHelperText-root': { color: '#2563EB', fontWeight: 600 } }}
            />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setAddEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleAddEmployeeSubmit} variant="contained" sx={{ bgcolor: '#4285F4' }}>إضافة الموظف</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Employee & Branch Transfer Dialog */}
      <Dialog open={editEmpDialog} onClose={() => setEditEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800 }}>✏️ تعديل بيانات ونقل فرع الموظف</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1.5 }}>
          {editEmpData && (
            <>
              <TextField
                fullWidth
                size="small"
                label="اسم الموظف *"
                value={editEmpData.name}
                onChange={(e) => setEditEmpData({ ...editEmpData, name: e.target.value })}
              />
              <FormControl fullWidth size="small">
                <InputLabel>الفرع (نقل الموظف لفرع آخر) *</InputLabel>
                <Select
                  value={editEmpData.branchId || 'b1'}
                  label="الفرع (نقل الموظف لفرع آخر) *"
                  onChange={(e) => setEditEmpData({ ...editEmpData, branchId: e.target.value })}
                >
                  {(branches && branches.length > 0 ? branches : [
                    { id: 'b1', name: 'فرع عزت' },
                    { id: 'b2', name: 'فرع المسلة' }
                  ]).map((b) => (
                    <MenuItem key={b.id} value={b.id}>🏢 {b.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl fullWidth size="small">
                <InputLabel>الوظيفة</InputLabel>
                <Select
                  value={editEmpData.role}
                  label="الوظيفة"
                  onChange={(e) => setEditEmpData({ ...editEmpData, role: e.target.value })}
                >
                  <MenuItem value="طيار دليفري">طيار دليفري</MenuItem>
                  <MenuItem value="كاشير">كاشير</MenuItem>
                  <MenuItem value="شيف مطبخ">شيف مطبخ</MenuItem>
                  <MenuItem value="عمال نظافة وترتيب">عمال نظافة وترتيب</MenuItem>
                </Select>
              </FormControl>
              <TextField
                fullWidth
                size="small"
                label="رقم الهاتف"
                value={editEmpData.phone}
                onChange={(e) => setEditEmpData({ ...editEmpData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                type="number"
                size="small"
                label="المرتب الأساسي (ج.م)"
                value={editEmpData.baseSalary}
                onChange={(e) => setEditEmpData({ ...editEmpData, baseSalary: e.target.value })}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setEditEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmEdit} variant="contained" sx={{ bgcolor: '#3B82F6' }}>حفظ التعديلات والنقل</Button>
        </DialogActions>
      </Dialog>

      {/* Delete Employee Confirmation Dialog */}
      <Dialog open={deleteEmpDialog} onClose={() => setDeleteEmpDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#EF4444' }}>⚠️ إغلاق وحذف الموظف</DialogTitle>
        <DialogContent sx={{ pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            هل أنت تأكد من إلغاء وحذف الموظف <strong>{empToDelete?.name}</strong> من النظام بالكامل؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDeleteEmpDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmDelete} variant="contained" sx={{ bgcolor: '#EF4444' }}>حذف الموظف</Button>
        </DialogActions>
      </Dialog>

      {/* Settle Employee Account Dialog */}
      <Dialog open={settleDialog} onClose={() => setSettleDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, color: '#8B5CF6' }}>💼 تصفية حساب الموظف النهائي</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pt: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            سيتم تصفية حساب الموظف <strong>{empToSettle?.name}</strong> نهائياً وتغيير حالته إلى "تمت التصفية".
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSettleDialog(false)} variant="outlined">إلغاء</Button>
          <Button onClick={handleConfirmSettle} variant="contained" sx={{ bgcolor: '#8B5CF6' }}>تأكيد تصفية الحساب</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
