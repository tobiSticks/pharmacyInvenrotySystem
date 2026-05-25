"use client";

import React, { useState, useEffect, useTransition } from "react";
import { 
  AlertCircle, 
  Search, 
  Filter, 
  ArrowRight, 
  Plus, 
  CheckCircle2, 
  Building2, 
  RefreshCw, 
  Store, 
  ShoppingCart, 
  FlaskConical, 
  Package, 
  AlertTriangle 
} from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import Link from "next/link";
import { restockProductAction } from "@/app/actions";

interface ProductBalance {
  wholesale_qty: number;
  retail_qty: number;
  supermarket_qty: number;
  branch_id: string;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  category_name?: string;
  product_form?: string;
  quantity: number; // Warehouse quantity
  min_stock_level: number;
  product_balances?: ProductBalance[];
}

interface Branch {
  id: string;
  branch_name: string;
}

interface AlertItem {
  id: string; // product ID
  name: string;
  sku: string;
  category: string;
  channel: "Warehouse" | "Wholesale" | "Retail" | "Supermarket";
  location: string;
  branchId?: string;
  qty: number;
  min: number;
  severity: "critical" | "warning";
}

export default function LowStockClient({ 
  initialProducts = [], 
  branches = [] 
}: { 
  initialProducts: Product[];
  branches: Branch[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState("all");
  const [selectedChannel, setSelectedChannel] = useState("all"); // 'all', 'Warehouse', 'Wholesale', 'Retail', 'Supermarket'
  const [selectedSeverity, setSelectedSeverity] = useState("all"); // 'all', 'critical', 'warning'
  
  const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Layout Sync State for Sidebar
  const [sidebarLayout, setSidebarLayout] = useState({ width: 288 });

  useEffect(() => {
    const handleSidebarChange = (e: any) => {
      setSidebarLayout({
        width: e.detail.width,
      });
    };
    window.addEventListener("sidebar-state-change", handleSidebarChange);
    return () => window.removeEventListener("sidebar-state-change", handleSidebarChange);
  }, []);

  // Compute Alert Items dynamically based on local products state
  const computeAlerts = (): AlertItem[] => {
    const alerts: AlertItem[] = [];

    products.forEach((product) => {
      const minStock = product.min_stock_level || 10;

      // 1. Central Warehouse Check
      if (product.quantity <= minStock) {
        alerts.push({
          id: product.id,
          name: product.name,
          sku: product.sku,
          category: product.category_name || "General",
          channel: "Warehouse",
          location: "Central Warehouse",
          qty: product.quantity,
          min: minStock,
          severity: product.quantity === 0 ? "critical" : "warning",
        });
      }

      // 2. Branch Balances Check
      const balances = product.product_balances || [];
      balances.forEach((balance) => {
        const branch = branches.find((b) => b.id === balance.branch_id);
        const bName = branch?.branch_name || "Branch Location";

        if (balance.wholesale_qty <= minStock) {
          alerts.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category_name || "General",
            channel: "Wholesale",
            location: `${bName} (Wholesale)`,
            branchId: balance.branch_id,
            qty: balance.wholesale_qty,
            min: minStock,
            severity: balance.wholesale_qty === 0 ? "critical" : "warning",
          });
        }

        if (balance.retail_qty <= minStock) {
          alerts.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category_name || "General",
            channel: "Retail",
            location: `${bName} (Retail)`,
            branchId: balance.branch_id,
            qty: balance.retail_qty,
            min: minStock,
            severity: balance.retail_qty === 0 ? "critical" : "warning",
          });
        }

        if (balance.supermarket_qty <= minStock) {
          alerts.push({
            id: product.id,
            name: product.name,
            sku: product.sku,
            category: product.category_name || "General",
            channel: "Supermarket",
            location: `${bName} (Supermarket)`,
            branchId: balance.branch_id,
            qty: balance.supermarket_qty,
            min: minStock,
            severity: balance.supermarket_qty === 0 ? "critical" : "warning",
          });
        }
      });
    });

    return alerts;
  };

  const allAlerts = computeAlerts();

  // Summary Metrics
  const warehouseCount = allAlerts.filter(a => a.channel === "Warehouse").length;
  const wholesaleCount = allAlerts.filter(a => a.channel === "Wholesale").length;
  const retailCount = allAlerts.filter(a => a.channel === "Retail").length;
  const supermarketCount = allAlerts.filter(a => a.channel === "Supermarket").length;
  const criticalTotal = allAlerts.filter(a => a.severity === "critical").length;
  const warningTotal = allAlerts.filter(a => a.severity === "warning").length;

  // Filtered Alert List
  const filteredAlerts = allAlerts.filter((alert) => {
    // 1. Search term match
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      alert.name.toLowerCase().includes(searchLower) ||
      alert.sku.toLowerCase().includes(searchLower) ||
      alert.category.toLowerCase().includes(searchLower);

    // 2. Branch match
    let matchesBranch = true;
    if (selectedBranchId !== "all") {
      if (selectedBranchId === "warehouse") {
        matchesBranch = alert.channel === "Warehouse";
      } else {
        matchesBranch = alert.branchId === selectedBranchId;
      }
    }

    // 3. Channel match
    const matchesChannel = selectedChannel === "all" || alert.channel === selectedChannel;

    // 4. Severity match
    const matchesSeverity = selectedSeverity === "all" || alert.severity === selectedSeverity;

    return matchesSearch && matchesBranch && matchesChannel && matchesSeverity;
  });

  // Central Warehouse Quick Restock Handler
  const handleWarehouseRestock = (productId: string) => {
    const amount = parseInt(restockAmounts[productId] || "0");
    if (isNaN(amount) || amount <= 0) return;

    startTransition(async () => {
      const result = await restockProductAction(null, { productId, quantityToAdd: amount });

      if (result.error) {
        setActionMessage({ type: "error", text: result.error });
      } else {
        setActionMessage({ type: "success", text: result.success as string });
        
        // Update local React state to instantly reflect new warehouse level
        setProducts((prevProducts) =>
          prevProducts.map((p) =>
            p.id === productId ? { ...p, quantity: p.quantity + amount } : p
          )
        );

        setRestockAmounts((prev) => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });

        setTimeout(() => setActionMessage(null), 4000);
      }
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden">
      {/* Sidebar Navigation */}
      <AdminSidebar />

      {/* Main Panel Content Area */}
      <main 
        className="flex-1 h-screen overflow-y-auto pt-12 pb-24 px-4 sm:px-12 relative z-10 custom-scrollbar transition-all duration-300 ease-in-out"
        style={{ paddingLeft: 16 }}
      >
        <div className="max-w-7xl mx-auto w-full space-y-8">
          
          {/* Main Title Section */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-amber-400 via-orange-400 to-indigo-400 drop-shadow-sm">
                Real-Time Stock Alerts
              </h1>
              <p className="mt-2 text-slate-400 text-base">
                Easily monitor and distribute stock for goods about to finish across channels.
              </p>
            </div>

            <button 
              onClick={() => {
                // Instantly re-fetch data or force page reload
                window.location.reload();
              }}
              className="flex items-center gap-2 bg-slate-900/80 hover:bg-slate-800 border border-slate-800 px-5 py-3 rounded-2xl text-slate-300 font-semibold text-xs tracking-wider transition-all hover:scale-105 active:scale-95"
            >
              <RefreshCw size={14} className={isPending ? "animate-spin text-amber-400" : "text-amber-400"} />
              FORCE REFRESH
            </button>
          </div>

          {/* Quick Metrics Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Warehouse stock card */}
            <div 
              onClick={() => { setSelectedChannel("Warehouse"); setSelectedBranchId("all"); }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group select-none
                ${selectedChannel === "Warehouse" 
                  ? "bg-amber-500/10 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]" 
                  : "bg-slate-900/50 border-slate-800 hover:border-amber-500/30"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Package size={80} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Central Warehouse</span>
              <span className={`text-4xl font-black mt-2 block tracking-tight ${warehouseCount > 0 ? "text-amber-400" : "text-slate-300"}`}>
                {warehouseCount}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">Items below min level</span>
            </div>

            {/* Wholesale POS card */}
            <div 
              onClick={() => { setSelectedChannel("Wholesale"); setSelectedBranchId("all"); }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group select-none
                ${selectedChannel === "Wholesale" 
                  ? "bg-indigo-500/10 border-indigo-500/50 shadow-[0_0_20px_rgba(99,102,241,0.15)]" 
                  : "bg-slate-900/50 border-slate-800 hover:border-indigo-500/30"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <FlaskConical size={80} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Wholesale Channel</span>
              <span className={`text-4xl font-black mt-2 block tracking-tight ${wholesaleCount > 0 ? "text-indigo-400" : "text-slate-300"}`}>
                {wholesaleCount}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">Items below min level</span>
            </div>

            {/* Retail POS card */}
            <div 
              onClick={() => { setSelectedChannel("Retail"); setSelectedBranchId("all"); }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group select-none
                ${selectedChannel === "Retail" 
                  ? "bg-emerald-500/10 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
                  : "bg-slate-900/50 border-slate-800 hover:border-emerald-500/30"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <Store size={80} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Retail Channel</span>
              <span className={`text-4xl font-black mt-2 block tracking-tight ${retailCount > 0 ? "text-emerald-400" : "text-slate-300"}`}>
                {retailCount}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">Items below min level</span>
            </div>

            {/* Supermarket POS card */}
            <div 
              onClick={() => { setSelectedChannel("Supermarket"); setSelectedBranchId("all"); }}
              className={`p-6 rounded-3xl border transition-all cursor-pointer relative overflow-hidden group select-none
                ${selectedChannel === "Supermarket" 
                  ? "bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)]" 
                  : "bg-slate-900/50 border-slate-800 hover:border-purple-500/30"
                }`}
            >
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <ShoppingCart size={80} />
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest block">Supermarket Channel</span>
              <span className={`text-4xl font-black mt-2 block tracking-tight ${supermarketCount > 0 ? "text-purple-400" : "text-slate-300"}`}>
                {supermarketCount}
              </span>
              <span className="text-xs text-slate-500 mt-1 block">Items below min level</span>
            </div>
          </div>

          {/* Action Notification Alert Box */}
          {actionMessage && (
            <div className={`p-4 border rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 
              ${actionMessage.type === "error" 
                ? "bg-red-500/10 border-red-500/30 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}
            >
              {actionMessage.type === "error" ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
              <span className="font-bold">{actionMessage.text}</span>
            </div>
          )}

          {/* Combined Search & Filters Controller */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 space-y-6">
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Search Field */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Search size={12} className="text-amber-400" /> Search Filter
                </label>
                <div className="flex items-center gap-3 h-12 px-4 bg-slate-950 border border-slate-800 rounded-2xl group focus-within:border-amber-500/30 transition-all shadow-inner">
                  <Search size={18} className="text-slate-500 group-focus-within:text-amber-400 transition-colors" />
                  <input 
                    type="text"
                    placeholder="Search by name, sku, or category..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-600 focus:ring-0"
                  />
                </div>
              </div>

              {/* Branch / Location Dropdown Filter */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Building2 size={12} className="text-amber-400" /> Filter Location
                </label>
                <div className="relative">
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="w-full h-12 bg-slate-950 border border-slate-800 rounded-2xl px-4 text-slate-300 focus:outline-none focus:ring-1 focus:ring-amber-500/30 appearance-none transition-all shadow-inner text-sm font-semibold"
                  >
                    <option value="all">All Locations (Warehouse & Branches)</option>
                    <option value="warehouse">Central Warehouse Only</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>{b.branch_name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
                </div>
              </div>

              {/* Severity Quick Filters */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-400" /> Severity Filter
                </label>
                <div className="flex gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 h-12">
                  <button
                    onClick={() => setSelectedSeverity("all")}
                    className={`flex-1 rounded-xl text-xs font-bold transition-all uppercase tracking-wider
                      ${selectedSeverity === "all" 
                        ? "bg-slate-800 text-white border border-slate-700/50 shadow-md" 
                        : "text-slate-500 hover:text-slate-300"
                      }`}
                  >
                    All ({allAlerts.length})
                  </button>
                  <button
                    onClick={() => setSelectedSeverity("critical")}
                    className={`flex-1 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5
                      ${selectedSeverity === "critical" 
                        ? "bg-rose-950/40 text-rose-400 border border-rose-500/20 shadow-md" 
                        : "text-slate-500 hover:text-rose-400/80"
                      }`}
                  >
                    Empty ({criticalTotal})
                  </button>
                  <button
                    onClick={() => setSelectedSeverity("warning")}
                    className={`flex-1 rounded-xl text-xs font-bold transition-all uppercase tracking-wider flex items-center justify-center gap-1.5
                      ${selectedSeverity === "warning" 
                        ? "bg-amber-950/40 text-amber-400 border border-amber-500/20 shadow-md" 
                        : "text-slate-500 hover:text-amber-400/80"
                      }`}
                  >
                    Low ({warningTotal})
                  </button>
                </div>
              </div>

            </div>

            {/* Department Navigation Tab selector */}
            <div className="border-t border-slate-800 pt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedChannel("all")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase border
                  ${selectedChannel === "all"
                    ? "bg-slate-100 text-slate-950 border-white shadow-lg"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
                  }`}
              >
                All Departments
              </button>
              <button
                onClick={() => setSelectedChannel("Warehouse")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase border flex items-center gap-2
                  ${selectedChannel === "Warehouse"
                    ? "bg-amber-600 text-white border-amber-500 shadow-lg shadow-amber-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/30"
                  }`}
              >
                <Package size={14} /> Warehouse
              </button>
              <button
                onClick={() => setSelectedChannel("Wholesale")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase border flex items-center gap-2
                  ${selectedChannel === "Wholesale"
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30"
                  }`}
              >
                <FlaskConical size={14} /> Wholesale
              </button>
              <button
                onClick={() => setSelectedChannel("Retail")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase border flex items-center gap-2
                  ${selectedChannel === "Retail"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-lg shadow-emerald-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-emerald-400 hover:border-emerald-500/30"
                  }`}
              >
                <Store size={14} /> Retail
              </button>
              <button
                onClick={() => setSelectedChannel("Supermarket")}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all tracking-wider uppercase border flex items-center gap-2
                  ${selectedChannel === "Supermarket"
                    ? "bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/10"
                    : "bg-slate-950/50 border-slate-800 text-slate-400 hover:text-purple-400 hover:border-purple-500/30"
                  }`}
              >
                <ShoppingCart size={14} /> Supermarket
              </button>
            </div>
          </div>

          {/* Active Alerts Table */}
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-amber-500/10">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-slate-950/60 border-b border-slate-800 text-xs font-bold text-slate-500 sticky top-0 backdrop-blur-md">
                    <th className="px-6 py-4 uppercase tracking-wider">Product / SKU</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Location / Dept</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Current Stock</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Alert Threshold</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Severity</th>
                    <th className="px-6 py-4 uppercase tracking-wider text-right">Action Needed</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {filteredAlerts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-500 italic">
                        No active stock alerts match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    filteredAlerts.map((alert, idx) => (
                      <tr key={idx} className="group hover:bg-slate-800/20 transition-colors">
                        
                        {/* Product Detail */}
                        <td className="px-6 py-4.5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-amber-500/20 transition-all">
                              <Package size={16} className="text-slate-500 group-hover:text-amber-400" />
                            </div>
                            <div>
                              <div className="text-white font-bold">{alert.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{alert.sku}</div>
                            </div>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="px-6 py-4.5 text-slate-400 font-semibold text-xs">
                          {alert.category}
                        </td>

                        {/* Location */}
                        <td className="px-6 py-4.5">
                          <span className="text-slate-300 font-bold text-xs">{alert.location}</span>
                        </td>

                        {/* Current Stock */}
                        <td className="px-6 py-4.5">
                          <span className={`text-base font-black ${alert.qty === 0 ? "text-rose-500" : "text-amber-500"}`}>
                            {alert.qty} <span className="text-[10px] font-bold text-slate-500 uppercase">units</span>
                          </span>
                        </td>

                        {/* Min Level */}
                        <td className="px-6 py-4.5 text-slate-400 font-mono text-xs">
                          {alert.min} units
                        </td>

                        {/* Severity Badge */}
                        <td className="px-6 py-4.5">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border
                            ${alert.severity === "critical"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.05)]"
                              : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                            }`}
                          >
                            {alert.severity === "critical" ? "CRITICAL (0)" : "LOW STOCK"}
                          </span>
                        </td>

                        {/* Action Operations */}
                        <td className="px-6 py-4.5 text-right">
                          {alert.channel === "Warehouse" ? (
                            
                            /* Warehouse restock input form */
                            <div className="inline-flex items-center bg-slate-950 border border-slate-800 rounded-xl overflow-hidden focus-within:border-amber-500/40 transition-all max-w-[130px] shadow-sm ml-auto">
                              <input
                                type="number"
                                min="1"
                                placeholder="Add Qty"
                                value={restockAmounts[alert.id] || ""}
                                onChange={(e) => setRestockAmounts(prev => ({ ...prev, [alert.id]: e.target.value }))}
                                className="w-16 px-3 py-2 bg-transparent text-white text-xs font-bold focus:outline-none placeholder:text-slate-700 text-center"
                              />
                              <button
                                onClick={() => handleWarehouseRestock(alert.id)}
                                disabled={isPending || !restockAmounts[alert.id]}
                                className="p-2 bg-amber-600 hover:bg-amber-500 text-slate-950 disabled:opacity-20 disabled:cursor-not-allowed transition-all font-black"
                                title="Restock Central Warehouse"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          ) : (
                            
                            /* POS Branches distribution route links */
                            <Link
                              href="/inventory-distribution"
                              className="inline-flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 px-4 py-2 rounded-xl text-xs font-extrabold transition-all group/btn shadow-md"
                              title="Distribute Stock from Warehouse"
                            >
                              Replenish Stock
                              <ArrowRight size={12} className="group-hover/btn:translate-x-0.5 transition-transform" />
                            </Link>
                          )}
                        </td>

                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30 gap-4">
              <div className="text-xs text-slate-500">
                Showing <span className="text-slate-300 font-bold">{filteredAlerts.length}</span> alert items matching your selected criteria.
              </div>
              <div className="text-xs text-slate-500 italic">
                Real-time stock alerts are updated instantly on every inventory update.
              </div>
            </div>

          </div>

        </div>
      </main>
    </div>
  );
}
