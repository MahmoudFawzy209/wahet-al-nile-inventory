'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Package,
  TrendingDown,
  AlertTriangle,
  ShoppingCart,
  Plus,
  Minus,
  FileSpreadsheet,
  Printer,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  X,
  Download,
  Laptop,
  Smartphone,
  Info,
  ChevronLeft
} from 'lucide-react';

interface Category {
  id: string;
  name: string;
  displayOrder: number;
}

interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  category: Category;
  unit: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  avgUnitPrice: number;
  lastPurchaseDate?: string | null;
  lastSupplier?: string | null;
  notes?: string | null;
}

interface PurchaseRecord {
  id: string;
  itemId: string;
  item: InventoryItem;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  supplier?: string | null;
  purchaseDate: string;
  notes?: string | null;
}

interface StockTransaction {
  id: string;
  itemId: string;
  item: InventoryItem;
  quantity: number;
  type: string;
  reason: string;
  date: string;
  notes?: string | null;
  recordedBy?: string | null;
}

export default function InventoryDashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'items' | 'purchases' | 'usage' | 'shortages'>('dashboard');

  // Data State
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [purchases, setPurchases] = useState<PurchaseRecord[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
    totalStockValue: 0
  });

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'AVAILABLE' | 'LOW' | 'OUT'>('ALL');

  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [showUsageModal, setShowUsageModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<{ text: string; type: 'success' | 'error' | 'warning' } | null>(null);

  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showInstallGuideModal, setShowInstallGuideModal] = useState(false);

  // Forms
  const [itemForm, setItemForm] = useState({
    name: '',
    categoryId: '',
    unit: 'كجم',
    currentStock: '0',
    minStock: '10',
    targetStock: '30',
    avgUnitPrice: '0',
    lastSupplier: '',
    notes: ''
  });

  const [purchaseForm, setPurchaseForm] = useState({
    itemId: '',
    quantity: '',
    unitPrice: '',
    totalPrice: '',
    supplier: '',
    purchaseDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  const [usageForm, setUsageForm] = useState({
    itemId: '',
    quantity: '',
    type: 'USAGE',
    reason: 'استخدام مطبخ',
    date: new Date().toISOString().split('T')[0],
    notes: '',
    recordedBy: 'مدير المخزن'
  });

  // Fetch all initial data
  const loadData = async () => {
    try {
      setLoading(true);
      const [invRes, purRes, txRes] = await Promise.all([
        fetch('/api/inventory'),
        fetch('/api/purchases'),
        fetch('/api/transactions')
      ]);

      if (invRes.ok) {
        const invData = await invRes.json();
        setItems(invData.items || []);
        setCategories(invData.categories || []);
        setStats(invData.stats || { totalItems: 0, lowStockCount: 0, outOfStockCount: 0, totalStockValue: 0 });
      }

      if (purRes.ok) {
        const purData = await purRes.json();
        setPurchases(purData || []);
      }

      if (txRes.ok) {
        const txData = await txRes.json();
        setTransactions(txData || []);
      }
    } catch (err) {
      console.error(err);
      showAlert('فشل في جلب البيانات من الخادم', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // PWA beforeinstallprompt handler
    const handleBeforeInstall = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      showAlert('تم تثبيت برنامج المخزون بنجاح كأيقونة على جهازك!', 'success');
    });

    if (typeof window !== 'undefined' && window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        showAlert('جارٍ تثبيت برنامج المخزون على جهازك...', 'success');
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuideModal(true);
    }
  };

  const showAlert = (text: string, type: 'success' | 'error' | 'warning') => {
    setAlertMessage({ text, type });
    setTimeout(() => setAlertMessage(null), 5000);
  };

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.lastSupplier && item.lastSupplier.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCat = selectedCategory === 'ALL' || item.categoryId === selectedCategory;

      let matchesStatus = true;
      if (selectedStatus === 'OUT') matchesStatus = item.currentStock <= 0;
      else if (selectedStatus === 'LOW') matchesStatus = item.currentStock > 0 && item.currentStock <= item.minStock;
      else if (selectedStatus === 'AVAILABLE') matchesStatus = item.currentStock > item.minStock;

      return matchesSearch && matchesCat && matchesStatus;
    });
  }, [items, searchQuery, selectedCategory, selectedStatus]);

  // Shortage items (Items below min stock or out of stock)
  const shortageItems = useMemo(() => {
    return items.filter((i) => i.currentStock <= i.minStock);
  }, [items]);

  // Handle Item Save (Create or Update)
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = '/api/inventory';
      const method = editingItem ? 'PUT' : 'POST';
      const payload = {
        ...itemForm,
        id: editingItem?.id,
        currentStock: Number(itemForm.currentStock) || 0,
        minStock: Number(itemForm.minStock) || 0,
        targetStock: Number(itemForm.targetStock) || (Number(itemForm.minStock) || 0) * 2,
        avgUnitPrice: Number(itemForm.avgUnitPrice) || 0
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'فشلت العملية');
      }

      showAlert(editingItem ? 'تم تحديث بيانات الصنف بنجاح' : 'تم إضافة الصنف الجديد للمخزن بنجاح', 'success');
      setShowItemModal(false);
      setEditingItem(null);
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Handle Delete Item
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`هل أنت متأكد من حذف الصنف "${name}" نهائياً من المخزن؟`)) return;
    try {
      const res = await fetch(`/api/inventory?id=${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل الحذف');
      }
      showAlert(`تم حذف "${name}" بنجاح`, 'success');
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Open Edit Item Modal
  const openEditModal = (item: InventoryItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      categoryId: item.categoryId,
      unit: item.unit,
      currentStock: item.currentStock.toString(),
      minStock: item.minStock.toString(),
      targetStock: (item.targetStock || item.minStock * 2).toString(),
      avgUnitPrice: item.avgUnitPrice.toString(),
      lastSupplier: item.lastSupplier || '',
      notes: item.notes || ''
    });
    setShowItemModal(true);
  };

  // Open Add Item Modal
  const openAddModal = () => {
    setEditingItem(null);
    setItemForm({
      name: '',
      categoryId: categories[0]?.id || '',
      unit: 'كجم',
      currentStock: '0',
      minStock: '10',
      targetStock: '30',
      avgUnitPrice: '0',
      lastSupplier: '',
      notes: ''
    });
    setShowItemModal(true);
  };

  // Handle Purchase Submit
  const handlePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = Number(purchaseForm.quantity);
      const unitP = Number(purchaseForm.unitPrice);
      const totalP = Number(purchaseForm.totalPrice) || qty * unitP;

      if (!purchaseForm.itemId || qty <= 0 || unitP < 0) {
        showAlert('يرجى تحديد الصنف وإدخال كمية وسعر صحيحين', 'warning');
        return;
      }

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...purchaseForm,
          quantity: qty,
          unitPrice: unitP,
          totalPrice: totalP
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الشراء');

      showAlert('تم تسجيل الشراء وإضافة الكمية للمخزن بنجاح', 'success');
      setShowPurchaseModal(false);
      setPurchaseForm({
        itemId: '',
        quantity: '',
        unitPrice: '',
        totalPrice: '',
        supplier: '',
        purchaseDate: new Date().toISOString().split('T')[0],
        notes: ''
      });
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Handle Usage Submit
  const handleUsageSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const qty = Number(usageForm.quantity);
      if (!usageForm.itemId || qty <= 0) {
        showAlert('يرجى اختيار الصنف وتحديد كمية خصم صحيحة', 'warning');
        return;
      }

      const targetItem = items.find((i) => i.id === usageForm.itemId);
      if (targetItem && qty > targetItem.currentStock) {
        if (!confirm(`تنبيه: الكمية المخصومة (${qty} ${targetItem.unit}) أكبر من الرصيد المتوفر (${targetItem.currentStock} ${targetItem.unit})! هل تريد الاستمرار وتصفير الرصيد؟`)) {
          return;
        }
      }

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...usageForm,
          quantity: qty,
          allowNegative: true
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل تسجيل الخصم');

      showAlert('تم خصم الكمية من رصيد المخزن بنجاح', 'success');
      setShowUsageModal(false);
      setUsageForm({
        itemId: '',
        quantity: '',
        type: 'USAGE',
        reason: 'استخدام مطبخ',
        date: new Date().toISOString().split('T')[0],
        notes: '',
        recordedBy: 'مدير المخزن'
      });
      loadData();
    } catch (err: any) {
      showAlert(err.message, 'error');
    }
  };

  // Trigger Excel Download
  const handleDownloadExcel = async (type: 'all' | 'inventory' | 'purchases' | 'usage') => {
    try {
      setIsExporting(true);
      window.location.href = `/api/reports/export?type=${type}`;
      setTimeout(() => {
        setIsExporting(false);
        setShowExportModal(false);
        showAlert('تم بدء تنزيل ملف Excel بنجاح', 'success');
      }, 1500);
    } catch (err) {
      showAlert('حدث خطأ أثناء تنزيل الملف', 'error');
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Banner / Alert */}
      {alertMessage && (
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 text-sm font-bold border transition-all animate-bounce ${
            alertMessage.type === 'success'
              ? 'bg-emerald-950/95 text-emerald-200 border-emerald-600'
              : alertMessage.type === 'error'
              ? 'bg-rose-950/95 text-rose-200 border-rose-600'
              : 'bg-amber-950/95 text-amber-200 border-amber-600'
          }`}
        >
          {alertMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-amber-400" />
          )}
          <span>{alertMessage.text}</span>
          <button onClick={() => setAlertMessage(null)} className="opacity-70 hover:opacity-100 mr-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Header (Cleaned up as requested in Note 1, 5, 6) */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 shadow-xl no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-950/40">
              <Package className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black text-white tracking-tight">
                  برنامج إدارة مخزون مطعم واحة النيل
                </h1>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  فرع سوهاج
                </span>
              </div>
              <p className="text-xs text-amber-500/90 font-bold">
                للمأكولات اليمنية
              </p>
            </div>
          </div>

          {/* Action Toolbar in Header (Cleaned: Only Install PWA + Refresh) */}
          <div className="flex items-center flex-wrap gap-2.5">
            {!isInstalled && (
              <button
                onClick={handleInstallApp}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-black bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 shadow-lg shadow-amber-500/25 transition-all active:scale-95 animate-pulse"
                title="تثبيت البرنامج كأيقونة مستقلة على سطح المكتب أو شاشة الموبايل"
              >
                <Download className="w-4 h-4 stroke-[3]" />
                <span>تثبيت البرنامج على الجهاز</span>
              </button>
            )}

            <button
              onClick={loadData}
              className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
              title="تحديث البيانات"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </header>

      {/* Print View Header */}
      <div className="hidden print-only p-6 border-b-2 border-black text-black">
        <h1 className="text-2xl font-black text-center mb-1">
          برنامج إدارة مخزون مطعم واحة النيل - للمأكولات اليمنية
        </h1>
        <p className="text-xs text-center text-gray-700">
          تاريخ الطباعة: {new Date().toLocaleString('ar-EG')} | فرع الكورنيش الغربي - نادي النيل - سوهاج
        </p>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* 4 Clean Navigation Cards - Always Visible at the Top */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: جدول المخزون */}
          <button
            onClick={() => setActiveTab(activeTab === 'items' ? 'dashboard' : 'items')}
            className={`p-5 rounded-2xl shadow-lg transition-all text-right group flex items-center justify-between border cursor-pointer ${
              activeTab === 'items'
                ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/50'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div>
              <span className="text-xs text-slate-400 block font-medium">عرض وإدارة المواد</span>
              <h3 className="text-lg font-black text-white mt-1 group-hover:text-amber-400 transition-colors">
                جدول المخزون ({items.length})
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'items'
                  ? 'bg-amber-500 text-slate-950 scale-105'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110'
              }`}
            >
              <Package className="w-5 h-5" />
            </div>
          </button>

          {/* Card 2: سجل المشتريات */}
          <button
            onClick={() => setActiveTab(activeTab === 'purchases' ? 'dashboard' : 'purchases')}
            className={`p-5 rounded-2xl shadow-lg transition-all text-right group flex items-center justify-between border cursor-pointer ${
              activeTab === 'purchases'
                ? 'bg-emerald-950/50 border-emerald-500 ring-2 ring-emerald-500/50'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-emerald-500/50'
            }`}
          >
            <div>
              <span className="text-xs text-slate-400 block font-medium">فواتير وتوريدات الشراء</span>
              <h3 className="text-lg font-black text-white mt-1 group-hover:text-emerald-400 transition-colors">
                سجل المشتريات ({purchases.length})
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'purchases'
                  ? 'bg-emerald-500 text-slate-950 scale-105'
                  : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 group-hover:scale-110'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
            </div>
          </button>

          {/* Card 3: سجل الاستهلاك والهدر */}
          <button
            onClick={() => setActiveTab(activeTab === 'usage' ? 'dashboard' : 'usage')}
            className={`p-5 rounded-2xl shadow-lg transition-all text-right group flex items-center justify-between border cursor-pointer ${
              activeTab === 'usage'
                ? 'bg-rose-950/50 border-rose-500 ring-2 ring-rose-500/50'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-rose-500/50'
            }`}
          >
            <div>
              <span className="text-xs text-slate-400 block font-medium">المنصرف للطهي والتالف</span>
              <h3 className="text-lg font-black text-white mt-1 group-hover:text-rose-400 transition-colors">
                سجل الاستهلاك والهدر ({transactions.length})
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'usage'
                  ? 'bg-rose-500 text-slate-950 scale-105'
                  : 'bg-rose-500/10 border border-rose-500/20 text-rose-400 group-hover:scale-110'
              }`}
            >
              <TrendingDown className="w-5 h-5" />
            </div>
          </button>

          {/* Card 4: النواقص والمطلوب شراؤه */}
          <button
            onClick={() => setActiveTab(activeTab === 'shortages' ? 'dashboard' : 'shortages')}
            className={`p-5 rounded-2xl shadow-lg transition-all text-right group flex items-center justify-between border cursor-pointer ${
              activeTab === 'shortages'
                ? 'bg-amber-950/50 border-amber-500 ring-2 ring-amber-500/50'
                : 'bg-slate-900 hover:bg-slate-800/80 border-slate-800 hover:border-amber-500/50'
            }`}
          >
            <div>
              <span className="text-xs text-slate-400 block font-medium">المواد المنخفضة والنافدة</span>
              <h3 className="text-lg font-black text-white mt-1 group-hover:text-amber-400 transition-colors">
                النواقص والمطلوب شراؤه ({shortageItems.length})
              </h3>
            </div>
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center transition-transform ${
                activeTab === 'shortages'
                  ? 'bg-amber-500 text-slate-950 scale-105'
                  : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 group-hover:scale-110'
              }`}
            >
              <AlertTriangle className="w-5 h-5" />
            </div>
          </button>
        </div>

        {/* Return to Dashboard bar when viewing any sub-section */}
        {activeTab !== 'dashboard' && (
          <div className="flex items-center justify-between bg-slate-900/60 border border-slate-800/80 px-4 py-2.5 rounded-xl no-print">
            <span className="text-xs text-slate-400">
              القسم:{' '}
              <strong className="text-white">
                {activeTab === 'items' && 'جدول المخزون'}
                {activeTab === 'purchases' && 'سجل المشتريات'}
                {activeTab === 'usage' && 'سجل الاستهلاك والهدر'}
                {activeTab === 'shortages' && 'النواقص والمطلوب شراؤه'}
              </strong>
            </span>
            <button
              onClick={() => setActiveTab('dashboard')}
              className="flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 transition-colors cursor-pointer"
            >
              <span>← العودة لعرض آخر الحركات المسجلة</span>
            </button>
          </div>
        )}

        {/* ========================================================= */}
        {/* DEFAULT VIEW: RECENT PURCHASES & RECENT USAGE */}
        {/* ========================================================= */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">

            {/* Two Columns: Recent Purchases vs Recent Usage (Note 2) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Purchases (No sub-lines under item names) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">آخر المشتريات المسجلة</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('purchases')}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    عرض الكل ({purchases.length})
                  </button>
                </div>

                {purchases.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">لم يتم تسجيل أي مشتريات بعد.</p>
                ) : (
                  <div className="space-y-2.5">
                    {purchases.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-200">{p.item?.name}</span>
                        <div className="text-left flex items-center gap-3">
                          <span className="font-black text-emerald-400">
                            +{p.quantity} {p.item?.unit}
                          </span>
                          <span className="font-bold text-slate-300">
                            {p.totalPrice.toLocaleString('ar-EG')} ج
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Usage & Waste (No sub-lines under item names) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-4 h-4 text-rose-400" />
                    <h3 className="font-bold text-sm text-white">آخر حركات الاستهلاك والتالف</h3>
                  </div>
                  <button
                    onClick={() => setActiveTab('usage')}
                    className="text-xs text-amber-400 hover:underline font-bold"
                  >
                    عرض الكل ({transactions.length})
                  </button>
                </div>

                {transactions.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">لم يتم تسجيل حركات خصم بعد.</p>
                ) : (
                  <div className="space-y-2.5">
                    {transactions.slice(0, 5).map((t) => (
                      <div
                        key={t.id}
                        className="bg-slate-950/60 border border-slate-800/80 p-3.5 rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">{t.item?.name}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                              t.type === 'WASTE'
                                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                : 'bg-blue-950 text-blue-400 border border-blue-800'
                            }`}
                          >
                            {t.type === 'WASTE' ? 'تالف' : 'مطبخ'}
                          </span>
                        </div>
                        <span className="font-black text-rose-400">
                          -{t.quantity} {t.item?.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 2: INVENTORY TABLE */}
        {/* ========================================================= */}
        {activeTab === 'items' && (
          <div className="space-y-4">
            {/* Search and Filters Bar with Section Toolbars (Note 6) */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-lg flex flex-wrap items-center justify-between gap-3">
              <div className="flex-1 min-w-[220px] relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="ابحث باسم الصنف أو المورد..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white text-xs sm:text-sm pr-10 pl-4 py-2.5 rounded-xl focus:outline-none focus:border-amber-500 transition-colors"
                />
              </div>

              <div className="flex items-center flex-wrap gap-2">
                {/* Category Dropdown */}
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">كافة التصنيفات ({items.length})</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                {/* Status Filter */}
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value as any)}
                  className="bg-slate-950 border border-slate-800 text-xs sm:text-sm text-slate-300 px-3 py-2.5 rounded-xl focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="AVAILABLE">متوفر بأمان</option>
                  <option value="LOW">أوشك على النفاد</option>
                  <option value="OUT">نافد تماماً</option>
                </select>

                {/* Action Buttons in Inventory Section (Note 6) */}
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-md transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة صنف</span>
                </button>

                <button
                  onClick={() => handleDownloadExcel('inventory')}
                  className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 transition-all active:scale-95"
                  title="تصدير جدول المخزون إلى Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title="طباعة جدول المخزون"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Inventory Table Card (Cleaned item names, no sub-notes, currency is 'ج') */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] sm:text-xs font-bold uppercase">
                    <tr>
                      <th className="py-3.5 px-4 text-center">م</th>
                      <th className="py-3.5 px-4">اسم الصنف</th>
                      <th className="py-3.5 px-4">التصنيف</th>
                      <th className="py-3.5 px-4 text-center">الوحدة</th>
                      <th className="py-3.5 px-4 text-center">الرصيد الحالي</th>
                      <th className="py-3.5 px-4 text-center">الحد الأدنى</th>
                      <th className="py-3.5 px-4 text-center">المطلوب شراؤه</th>
                      <th className="py-3.5 px-4 text-center">متوسط السعر</th>
                      <th className="py-3.5 px-4 text-center">القيمة التقديرية</th>
                      <th className="py-3.5 px-4 text-center">الحالة</th>
                      <th className="py-3.5 px-4 text-center no-print">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="text-center py-12 text-slate-500">
                          لا توجد أصناف مطابقة للبحث أو التصفية الحالية.
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((item, idx) => {
                        const isOut = item.currentStock <= 0;
                        const isLow = !isOut && item.currentStock <= item.minStock;
                        const needed = isOut || isLow ? Math.max(0, (item.targetStock || item.minStock * 2) - item.currentStock) : 0;
                        const estValue = item.currentStock * (item.avgUnitPrice || 0);

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-800/40 transition-colors ${
                              isOut ? 'bg-rose-950/20' : isLow ? 'bg-amber-950/20' : ''
                            }`}
                          >
                            <td className="py-3 px-4 text-center text-slate-500">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-white">{item.name}</td>
                            <td className="py-3 px-4 text-slate-300">{item.category?.name}</td>
                            <td className="py-3 px-4 text-center">
                              <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-slate-800 text-slate-300">
                                {item.unit}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`font-black text-sm ${
                                  isOut ? 'text-rose-400' : isLow ? 'text-amber-400' : 'text-emerald-400'
                                }`}
                              >
                                {item.currentStock.toLocaleString('ar-EG')}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center text-slate-400">
                              {item.minStock.toLocaleString('ar-EG')}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {needed > 0 ? (
                                <span className="font-bold text-amber-400 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-lg">
                                  {needed.toLocaleString('ar-EG')} {item.unit}
                                </span>
                              ) : (
                                <span className="text-slate-600">—</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center text-slate-300 font-medium">
                              {item.avgUnitPrice > 0 ? `${item.avgUnitPrice.toLocaleString('ar-EG')} ج` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-emerald-400">
                              {estValue > 0 ? `${estValue.toLocaleString('ar-EG')} ج` : '—'}
                            </td>
                            <td className="py-3 px-4 text-center">
                              {isOut ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-rose-950 text-rose-400 border border-rose-800">
                                  نافد
                                </span>
                              ) : isLow ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-950 text-amber-400 border border-amber-800">
                                  منخفض
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-950 text-emerald-400 border border-emerald-800">
                                  متوفر
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-center no-print">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  onClick={() => openEditModal(item)}
                                  title="تعديل الصنف"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDeleteItem(item.id, item.name)}
                                  title="حذف الصنف"
                                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 text-rose-400 border border-slate-700"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 3: PURCHASES LOG */}
        {/* ========================================================= */}
        {activeTab === 'purchases' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {/* Title with estimated inventory value in parentheses (Note 5) */}
                <h2 className="text-base sm:text-lg font-black text-emerald-400 flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5" />
                  <span>
                    سجل فواتير وتوريدات المشتريات (
                    {stats.totalStockValue.toLocaleString('ar-EG', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1
                    })}{' '}
                    ج )
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  كافة عمليات الشراء الواردة للمخزن مضافة للرصيد وتاريخها والموردون.
                </p>
              </div>

              {/* Action Toolbar in Purchases Section (Note 6) */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setPurchaseForm((prev) => ({
                      ...prev,
                      itemId: items[0]?.id || '',
                      supplier: '',
                      notes: ''
                    }));
                    setShowPurchaseModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>تسجيل فاتورة شراء جديدة</span>
                </button>

                <button
                  onClick={() => handleDownloadExcel('purchases')}
                  className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-95"
                  title="تصدير سجل المشتريات إلى Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title="طباعة سجل المشتريات"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] sm:text-xs font-bold uppercase">
                    <tr>
                      <th className="py-3.5 px-4 text-center">م</th>
                      <th className="py-3.5 px-4">اسم الصنف</th>
                      <th className="py-3.5 px-4 text-center">الكمية المشتراة</th>
                      <th className="py-3.5 px-4 text-center">سعر الوحدة</th>
                      <th className="py-3.5 px-4 text-center">الإجمالي</th>
                      <th className="py-3.5 px-4 text-center">تاريخ الشراء</th>
                      <th className="py-3.5 px-4">اسم المورد</th>
                      <th className="py-3.5 px-4">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {purchases.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500">
                          لا توجد مشتريات مسجلة بعد.
                        </td>
                      </tr>
                    ) : (
                      purchases.map((p, idx) => (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-white">{p.item?.name}</td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-400">
                            +{p.quantity} {p.item?.unit}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">
                            {p.unitPrice.toLocaleString('ar-EG')} ج
                          </td>
                          <td className="py-3 px-4 text-center font-black text-white">
                            {p.totalPrice.toLocaleString('ar-EG')} ج
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400">
                            {new Date(p.purchaseDate).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-3 px-4 text-slate-300">{p.supplier || '—'}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{p.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 4: USAGE & WASTE LOG */}
        {/* ========================================================= */}
        {activeTab === 'usage' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                {/* Title updated as requested in Note 4 */}
                <h2 className="text-base sm:text-lg font-black text-rose-400 flex items-center gap-2">
                  <TrendingDown className="w-5 h-5" />
                  <span>سجل الاستهلاك في المطبخ والهدر</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  كافة المواد المخصومة من رصيد المخزن للطهي اليومي أو بسبب التلف والهدر.
                </p>
              </div>

              {/* Action Toolbar in Usage Section (Note 6) */}
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => {
                    setUsageForm((prev) => ({
                      ...prev,
                      itemId: items[0]?.id || '',
                      reason: 'استخدام مطبخ',
                      notes: ''
                    }));
                    setShowUsageModal(true);
                  }}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                >
                  <Minus className="w-4 h-4" />
                  <span>تسجيل خصم جديد</span>
                </button>

                <button
                  onClick={() => handleDownloadExcel('usage')}
                  className="px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 transition-all active:scale-95"
                  title="تصدير سجل الاستهلاك إلى Excel"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير Excel</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title="طباعة سجل الاستهلاك"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs sm:text-sm">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800 text-[11px] sm:text-xs font-bold uppercase">
                    <tr>
                      <th className="py-3.5 px-4 text-center">م</th>
                      <th className="py-3.5 px-4">اسم الصنف</th>
                      <th className="py-3.5 px-4 text-center">الكمية المخصومة</th>
                      <th className="py-3.5 px-4 text-center">نوع الخصم</th>
                      <th className="py-3.5 px-4">السبب والبيان</th>
                      <th className="py-3.5 px-4 text-center">التاريخ</th>
                      <th className="py-3.5 px-4 text-center">المسؤول</th>
                      <th className="py-3.5 px-4">ملاحظات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {transactions.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center py-12 text-slate-500">
                          لا توجد حركات استهلاك مسجلة بعد.
                        </td>
                      </tr>
                    ) : (
                      transactions.map((t, idx) => (
                        <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 text-center text-slate-500">{idx + 1}</td>
                          <td className="py-3 px-4 font-bold text-white">{t.item?.name}</td>
                          <td className="py-3 px-4 text-center font-bold text-rose-400">
                            -{t.quantity} {t.item?.unit}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                t.type === 'WASTE'
                                  ? 'bg-rose-950 text-rose-400 border border-rose-800'
                                  : 'bg-blue-950 text-blue-400 border border-blue-800'
                              }`}
                            >
                              {t.type === 'WASTE' ? 'تالف / هدر' : 'استهلاك مطبخ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-slate-300 font-medium">
                            {t.type === 'USAGE' && t.reason === 'استخدام مطبخ' ? 'استخدام مطبخ' : t.reason}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400">
                            {new Date(t.date).toLocaleDateString('ar-EG')}
                          </td>
                          <td className="py-3 px-4 text-center text-slate-300">{t.recordedBy || 'المدير'}</td>
                          <td className="py-3 px-4 text-slate-400 text-xs">{t.notes || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* TAB 5: SHORTAGES & REQUISITION */}
        {/* ========================================================= */}
        {activeTab === 'shortages' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-black text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  <span>قائمة المواد المطلوبة والمشتريات العاجلة</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  المواد التي وصلت للحد الأدنى أو نفدت تماماً، مع حساب الكمية المطلوبة للوصول إلى الحد المستهدف.
                </p>
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => handleDownloadExcel('inventory')}
                  className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md flex items-center gap-2 transition-all active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>تصدير قائمة النواقص إلى Excel</span>
                </button>

                <button
                  onClick={() => window.print()}
                  className="p-2.5 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                  title="طباعة قائمة النواقص"
                >
                  <Printer className="w-4 h-4" />
                </button>
              </div>
            </div>

            {shortageItems.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 p-12 text-center rounded-2xl">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white">المخزن في حالة ممتازة!</h3>
                <p className="text-xs text-slate-400 mt-1">
                  لا توجد أي أصناف وصلت لحد الخطر أو أوشكت على النفاد حالياً.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shortageItems.map((item) => {
                  const isOut = item.currentStock <= 0;
                  const needed = Math.max(0, (item.targetStock || item.minStock * 2) - item.currentStock);
                  const estimatedCost = needed * (item.avgUnitPrice || 0);

                  return (
                    <div
                      key={item.id}
                      className={`border p-5 rounded-2xl shadow-lg space-y-3 relative overflow-hidden ${
                        isOut
                          ? 'bg-rose-950/20 border-rose-800/80'
                          : 'bg-amber-950/20 border-amber-800/80'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <span
                            className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                              isOut ? 'bg-rose-900 text-rose-200' : 'bg-amber-900 text-amber-200'
                            }`}
                          >
                            {isOut ? 'نافد تماماً' : 'منخفض عن الحد الأدنى'}
                          </span>
                          <h4 className="font-black text-base text-white mt-1.5">{item.name}</h4>
                          <span className="text-xs text-slate-400">{item.category?.name}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-xl text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 block">الرصيد الحالي</span>
                          <span className={`font-black text-sm ${isOut ? 'text-rose-400' : 'text-amber-400'}`}>
                            {item.currentStock} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 block">الحد الأدنى</span>
                          <span className="font-bold text-slate-300">
                            {item.minStock} {item.unit}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-emerald-400 block font-bold">المطلوب شراؤه</span>
                          <span className="font-black text-sm text-emerald-400">
                            {needed} {item.unit}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                        <span>التكلفة التقديرية:</span>
                        <span className="font-bold text-white">
                          {estimatedCost > 0 ? `${estimatedCost.toLocaleString('ar-EG')} ج` : 'غير محدد'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800/60 pt-2">
                        <span>آخر مورد مسجل:</span>
                        <span className="text-slate-300 font-medium line-clamp-1">{item.lastSupplier || '—'}</span>
                      </div>

                      <button
                        onClick={() => {
                          setPurchaseForm({
                            itemId: item.id,
                            quantity: needed.toString(),
                            unitPrice: item.avgUnitPrice.toString(),
                            totalPrice: (needed * item.avgUnitPrice).toString(),
                            supplier: item.lastSupplier || '',
                            purchaseDate: new Date().toISOString().split('T')[0],
                            notes: ''
                          });
                          setShowPurchaseModal(true);
                        }}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>تسجيل شراء هذا الصنف الآن</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </main>

      {/* ========================================================= */}
      {/* MODAL 1: ADD / EDIT INVENTORY ITEM (إضافة صنف) */}
      {/* ========================================================= */}
      {showItemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="font-black text-lg text-white">
                {editingItem ? 'تعديل بيانات الصنف' : 'إضافة صنف جديد للمخزن'}
              </h3>
              <button
                onClick={() => setShowItemModal(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveItem} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  اسم الصنف <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: اللحم الجملي، الأرز البسمتي، بطاطس طهي"
                  value={itemForm.name}
                  onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">التصنيف</label>
                  <select
                    value={itemForm.categoryId}
                    onChange={(e) => setItemForm({ ...itemForm, categoryId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">وحدة القياس</label>
                  <select
                    value={itemForm.unit}
                    onChange={(e) => setItemForm({ ...itemForm, unit: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  >
                    <option value="كجم">كيلوجرام (كجم)</option>
                    <option value="جرام">جرام</option>
                    <option value="لتر">لتر</option>
                    <option value="قطعة">قطعة</option>
                    <option value="عبوة">عبوة</option>
                    <option value="كرتونة">كرتونة</option>
                    <option value="شوال / كيس">شوال / كيس</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الرصيد الأولي</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.currentStock}
                    onChange={(e) => setItemForm({ ...itemForm, currentStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الحد الأدنى</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.minStock}
                    onChange={(e) => setItemForm({ ...itemForm, minStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">الحد المستهدف</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.targetStock}
                    onChange={(e) => setItemForm({ ...itemForm, targetStock: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">سعر الوحدة (ج)</label>
                  <input
                    type="number"
                    step="any"
                    value={itemForm.avgUnitPrice}
                    onChange={(e) => setItemForm({ ...itemForm, avgUnitPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">اسم المورد (اختياري)</label>
                  <input
                    type="text"
                    placeholder="يمكنك كتابة أي مورد أو تركه فارغاً"
                    value={itemForm.lastSupplier}
                    onChange={(e) => setItemForm({ ...itemForm, lastSupplier: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات (اختيارية)</label>
                <textarea
                  rows={2}
                  value={itemForm.notes}
                  onChange={(e) => setItemForm({ ...itemForm, notes: e.target.value })}
                  placeholder="ملاحظات اختيارية..."
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowItemModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-black bg-amber-600 hover:bg-amber-500 text-slate-950 shadow-lg shadow-amber-950/40"
                >
                  {editingItem ? 'حفظ التعديلات' : 'إضافة الصنف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 2: RECORD NEW PURCHASE (With Add Item option) */}
      {/* ========================================================= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <h3 className="font-black text-lg text-white">تسجيل مشتريات وتوريد جديد للمخزن</h3>
              </div>
              <button
                onClick={() => setShowPurchaseModal(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handlePurchaseSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-300 font-bold">
                    اختر الصنف <span className="text-rose-500">*</span>
                  </label>
                  {/* Button to directly add a new item on the fly (Note 6) */}
                  <button
                    type="button"
                    onClick={() => {
                      setShowPurchaseModal(false);
                      openAddModal();
                    }}
                    className="text-amber-400 hover:text-amber-300 font-bold text-xs flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ إضافة صنف جديد</span>
                  </button>
                </div>

                <select
                  required
                  value={purchaseForm.itemId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    const item = items.find((i) => i.id === selId);
                    setPurchaseForm({
                      ...purchaseForm,
                      itemId: selId,
                      unitPrice: item?.avgUnitPrice ? item.avgUnitPrice.toString() : '',
                      supplier: item?.lastSupplier || ''
                    });
                  }}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- اضغط لاختيار الصنف --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (الرصيد: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    الكمية المشتراة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 50"
                    value={purchaseForm.quantity}
                    onChange={(e) => {
                      const qty = e.target.value;
                      const up = purchaseForm.unitPrice;
                      const tot = Number(qty) && Number(up) ? (Number(qty) * Number(up)).toString() : '';
                      setPurchaseForm({ ...purchaseForm, quantity: qty, totalPrice: tot });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center font-bold"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">سعر الوحدة (ج)</label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 340"
                    value={purchaseForm.unitPrice}
                    onChange={(e) => {
                      const up = e.target.value;
                      const qty = purchaseForm.quantity;
                      const tot = Number(qty) && Number(up) ? (Number(qty) * Number(up)).toString() : '';
                      setPurchaseForm({ ...purchaseForm, unitPrice: up, totalPrice: tot });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">إجمالي الفاتورة (ج)</label>
                  <input
                    type="number"
                    step="any"
                    value={purchaseForm.totalPrice}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, totalPrice: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-emerald-400 font-black px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">تاريخ الشراء</label>
                  <input
                    type="date"
                    required
                    value={purchaseForm.purchaseDate}
                    onChange={(e) => setPurchaseForm({ ...purchaseForm, purchaseDate: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">اسم المورد (قابل للتعديل أو المسح)</label>
                <input
                  type="text"
                  placeholder="اكتب اسم المورد أو اتركه فارغاً"
                  value={purchaseForm.supplier}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, supplier: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات (اختيارية)</label>
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية..."
                  value={purchaseForm.notes}
                  onChange={(e) => setPurchaseForm({ ...purchaseForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPurchaseModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40"
                >
                  تأكيد وإضافة للمخزن
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 3: RECORD USAGE / WASTE */}
      {/* ========================================================= */}
      {showUsageModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4" />
                </div>
                <h3 className="font-black text-lg text-white">تسجيل صرف للمطبخ أو تالف وهدر</h3>
              </div>
              <button
                onClick={() => setShowUsageModal(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUsageSubmit} className="space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  اختر الصنف المراد خصمه <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={usageForm.itemId}
                  onChange={(e) => setUsageForm({ ...usageForm, itemId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                >
                  <option value="">-- اضغط لاختيار الصنف --</option>
                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (المتوفر حالياً: {i.currentStock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">
                    الكمية المخصومة <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="مثال: 12.5"
                    value={usageForm.quantity}
                    onChange={(e) => setUsageForm({ ...usageForm, quantity: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center font-bold text-rose-400"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">نوع العملية</label>
                  <select
                    value={usageForm.type}
                    onChange={(e) => {
                      const t = e.target.value;
                      setUsageForm({
                        ...usageForm,
                        type: t,
                        reason: t === 'WASTE' ? 'تالف / هدر تنظيف' : 'استخدام مطبخ'
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                  >
                    <option value="USAGE">استخدام مطبخ</option>
                    <option value="WASTE">تالف / هدر / كسر</option>
                    <option value="ADJUSTMENT">تسوية جرد دوري</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">
                  السبب والبيان <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: استخدام مطبخ، عروق وتالف تنظيف..."
                  value={usageForm.reason}
                  onChange={(e) => setUsageForm({ ...usageForm, reason: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">تاريخ الخصم</label>
                  <input
                    type="date"
                    required
                    value={usageForm.date}
                    onChange={(e) => setUsageForm({ ...usageForm, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 font-bold mb-1.5">المسؤول</label>
                  <input
                    type="text"
                    value={usageForm.recordedBy}
                    onChange={(e) => setUsageForm({ ...usageForm, recordedBy: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none text-center"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1.5">ملاحظات (اختيارية)</label>
                <input
                  type="text"
                  placeholder="ملاحظات اختيارية..."
                  value={usageForm.notes}
                  onChange={(e) => setUsageForm({ ...usageForm, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 text-white px-3.5 py-2.5 rounded-xl focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowUsageModal(false)}
                  className="px-5 py-2.5 rounded-xl font-bold bg-slate-800 hover:bg-slate-700 text-slate-300"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl font-black bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-950/40"
                >
                  تأكيد الخصم من المخزون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL 4: PWA INSTALL GUIDE */}
      {/* ========================================================= */}
      {showInstallGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Download className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">طريقة تثبيت البرنامج على جهازك</h3>
                  <p className="text-[11px] text-slate-400">ليعمل كأي برنامج مثبت بأيقونة مستقلة</p>
                </div>
              </div>
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="p-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-amber-400">
                  <Laptop className="w-4 h-4 text-amber-500" />
                  <span>على أجهزة الكمبيوتر (ويندوز أو ماك):</span>
                </div>
                <p className="text-slate-300 leading-relaxed pr-6">
                  ستجد أيقونة تثبيت صغيرة (شاشة بها سهم أو علامة <strong>⊕</strong>) في أعلى شريط العنوان بمتصفحك (كروم أو إيدج)، اضغط عليها ثم اختر <strong>«تثبيت / Install»</strong> ليظهر البرنامج فوراً على سطح المكتب وقائمة ابدأ.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <Smartphone className="w-4 h-4 text-emerald-500" />
                  <span>على هواتف الأندرويد (Android / Chrome):</span>
                </div>
                <p className="text-slate-300 leading-relaxed pr-6">
                  اضغط على زر القائمة (الثلاث نقاط في أعلى المتصفح) واختر <strong>«تثبيت التطبيق»</strong> أو <strong>«إضافة إلى الشاشة الرئيسية»</strong>.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800/80 space-y-1.5">
                <div className="flex items-center gap-2 font-bold text-blue-400">
                  <Smartphone className="w-4 h-4 text-blue-500" />
                  <span>على هواتف الآيفون (iOS Safari):</span>
                </div>
                <p className="text-slate-300 leading-relaxed pr-6">
                  اضغط على زر <strong>المشاركة (Share)</strong> في أسفل متصفح Safari، ثم اختر <strong>«إضافة إلى الصفحة الرئيسية / Add to Home Screen»</strong>.
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setShowInstallGuideModal(false)}
                className="px-6 py-2.5 rounded-xl font-black bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs shadow-md"
              >
                فهمت ذلك
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 py-4 px-4 text-center text-xs text-slate-500 no-print">
        <p>
          برنامج إدارة مخزون مطعم واحة النيل • للمأكولات اليمنية • فرع سوهاج (الكورنيش الغربي - نادي النيل) • متوافق مع الكمبيوتر والموبايل
        </p>
      </footer>
    </div>
  );
}
