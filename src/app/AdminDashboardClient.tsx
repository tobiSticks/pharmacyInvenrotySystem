"use client";

import React, { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Building2, UserPlus, KeyRound, Mail, Shield, CheckCircle2, MapPin, AlertCircle, PackagePlus, Truck, BarChart3, Tag, TrendingUp } from "lucide-react";
import { addBranchAction, createStaffAction } from "./actions";
import Link from "next/link";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminDashboardClient({ branches = [], products = [] }: { branches: any[], products?: any[] }) {
  const [branchState, addBranch, isAddingBranch] = useActionState(addBranchAction, undefined);
  const [staffState, createStaff, isCreatingStaff] = useActionState(createStaffAction, undefined);

  // Layout Sync State
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

  const branchFormRef = useRef<HTMLFormElement>(null);
  const staffFormRef = useRef<HTMLFormElement>(null);

  const safeProducts = products || [];
  
  // Calculate real-time alerts across channels
  let warehouseLowCount = 0;
  let wholesaleLowCount = 0;
  let retailLowCount = 0;
  let supermarketLowCount = 0;
  let criticalCount = 0;

  safeProducts.forEach(product => {
    const minStock = product.min_stock_level || 10;

    // 1. Warehouse Stock
    if (product.quantity <= minStock) {
      warehouseLowCount++;
      if (product.quantity === 0) criticalCount++;
    }

    // 2. Branch Balances
    const balances = product.product_balances || [];
    balances.forEach((balance: any) => {
      if (balance.wholesale_qty <= minStock) {
        wholesaleLowCount++;
        if (balance.wholesale_qty === 0) criticalCount++;
      }
      if (balance.retail_qty <= minStock) {
        retailLowCount++;
        if (balance.retail_qty === 0) criticalCount++;
      }
      if (balance.supermarket_qty <= minStock) {
        supermarketLowCount++;
        if (balance.supermarket_qty === 0) criticalCount++;
      }
    });
  });

  const totalLowAlerts = warehouseLowCount + wholesaleLowCount + retailLowCount + supermarketLowCount;

  useEffect(() => {
    if (branchState?.success) {
      branchFormRef.current?.reset();
    }
  }, [branchState]);

  useEffect(() => {
    if (staffState?.success) {
      staffFormRef.current?.reset();
    }
  }, [staffState]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex relative overflow-hidden">
      <AdminSidebar />
      
      {/* Background Effects */}
      <div 
        className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none transition-all duration-300 ease-in-out"
        style={{ paddingLeft: sidebarLayout.width }}
      >
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <main className="flex-1 h-screen overflow-y-auto pt-12 pb-24 px-4 sm:px-12 relative z-10 custom-scrollbar transition-all duration-300 ease-in-out">
        <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Header Section */}
        <div className="lg:col-span-12 mb-4">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400 drop-shadow-sm">
            Pharmacy Admin Portal
          </h1>
          <p className="mt-2 text-slate-400 text-lg">
            Manage your network branches and staff accounts with ease.
          </p>

          {/* Quick Stats / Inventory Quick Links */}
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link 
              href="/catalog" 
              className="flex items-center gap-3 bg-slate-900/80 hover:bg-rose-600/20 border border-slate-800 hover:border-rose-500/50 px-6 py-4 rounded-2xl transition-all group"
            >
              <div className="p-2 bg-rose-500/10 rounded-lg group-hover:bg-rose-500/20 text-rose-400">
                <Tag size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Price & Catalog</div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">Edit prices & manage items</div>
              </div>
            </Link>

            <Link 
              href="/sales-audit" 
              className="flex items-center gap-3 bg-slate-900/80 hover:bg-blue-600/20 border border-slate-800 hover:border-blue-500/50 px-6 py-4 rounded-2xl transition-all group"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg group-hover:bg-blue-500/20 text-blue-400">
                <TrendingUp size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Sales Audit</div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">Live feed & reporting</div>
              </div>
            </Link>

            <Link 
              href="/inventory/add" 

              className="flex items-center gap-3 bg-slate-900/80 hover:bg-indigo-600/20 border border-slate-800 hover:border-indigo-500/50 px-6 py-4 rounded-2xl transition-all group"
            >
              <div className="p-2 bg-indigo-500/10 rounded-lg group-hover:bg-indigo-500/20 text-indigo-400">
                <PackagePlus size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Accept New Stock</div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">Add products to warehouse</div>
              </div>
            </Link>

            <Link 
              href="/inventory-distribution" 
              className="flex items-center gap-3 bg-slate-900/80 hover:bg-emerald-600/20 border border-slate-800 hover:border-emerald-500/50 px-6 py-4 rounded-2xl transition-all group"
            >
              <div className="p-2 bg-emerald-500/10 rounded-lg group-hover:bg-emerald-500/20 text-emerald-400">
                <Truck size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Distribute Inventory</div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">Allocate stock to channels</div>
              </div>
            </Link>

            <Link 
              href="/inventory" 
              className="flex items-center gap-3 bg-slate-900/80 hover:bg-purple-600/20 border border-slate-800 hover:border-purple-500/50 px-6 py-4 rounded-2xl transition-all group"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg group-hover:bg-purple-500/20 text-purple-400">
                <BarChart3 size={20} />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Warehouse Stock</div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">View all imported products</div>
              </div>
            </Link>

            <Link 
              href="/inventory/low-stock" 
              className={`flex items-center gap-3 bg-slate-900/80 hover:bg-amber-600/20 border ${totalLowAlerts > 0 ? 'border-amber-500/30 hover:border-amber-500/60' : 'border-slate-800 hover:border-amber-500/50'} px-6 py-4 rounded-2xl transition-all group relative`}
            >
              <div className={`p-2 ${totalLowAlerts > 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-400'} rounded-lg group-hover:bg-amber-500/30 transition-colors`}>
                <AlertCircle size={20} className={totalLowAlerts > 0 ? 'animate-pulse' : ''} />
              </div>
              <div>
                <div className="text-white font-bold text-sm flex items-center gap-1.5">
                  Low Stock Alerts
                  {totalLowAlerts > 0 && (
                    <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full animate-bounce">
                      {totalLowAlerts}
                    </span>
                  )}
                </div>
                <div className="text-slate-500 text-xs translate-y-[-1px]">
                  {totalLowAlerts > 0 ? `${criticalCount} critical items at zero` : 'All channels fully stocked'}
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Real-time Low Stock Feed Widget */}
        {totalLowAlerts > 0 && (
          <div className="lg:col-span-12 bg-slate-900/40 backdrop-blur-xl border border-amber-500/20 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-2xl hover:border-amber-500/40 transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none">
              <AlertCircle size={120} className="text-amber-500" />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/20 text-amber-400 animate-pulse">
                  <AlertCircle size={24} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Real-time Stock Alerts
                    <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs px-2.5 py-0.5 rounded-full font-semibold">
                      {totalLowAlerts} alert{totalLowAlerts > 1 ? 's' : ''} active
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400">
                    The following items are below minimum levels across your channels.
                  </p>
                </div>
              </div>

              <Link 
                href="/inventory/low-stock" 
                className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold text-xs tracking-widest px-5 py-2.5 rounded-xl shadow-lg shadow-amber-600/10 hover:shadow-amber-500/20 hover:scale-105 transition-all text-center"
              >
                OPEN ALERT CENTER
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Warehouse</span>
                <span className={`text-2xl font-extrabold mt-1 ${warehouseLowCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>
                  {warehouseLowCount} <span className="text-xs font-normal text-slate-500">low</span>
                </span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wholesale POS</span>
                <span className={`text-2xl font-extrabold mt-1 ${wholesaleLowCount > 0 ? 'text-indigo-400' : 'text-slate-300'}`}>
                  {wholesaleLowCount} <span className="text-xs font-normal text-slate-500">low</span>
                </span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Retail POS</span>
                <span className={`text-2xl font-extrabold mt-1 ${retailLowCount > 0 ? 'text-emerald-400' : 'text-slate-300'}`}>
                  {retailLowCount} <span className="text-xs font-normal text-slate-500">low</span>
                </span>
              </div>
              <div className="bg-slate-950/40 border border-slate-800/80 p-4 rounded-2xl flex flex-col justify-between">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Supermarket POS</span>
                <span className={`text-2xl font-extrabold mt-1 ${supermarketLowCount > 0 ? 'text-purple-400' : 'text-slate-300'}`}>
                  {supermarketLowCount} <span className="text-xs font-normal text-slate-500">low</span>
                </span>
              </div>
            </div>

            <div className="border border-slate-800 bg-slate-950/20 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs animate-in fade-in duration-300">
                  <thead className="bg-slate-950/40 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3">Location / Department</th>
                      <th className="px-4 py-3">Current Qty</th>
                      <th className="px-4 py-3">Min Level</th>
                      <th className="px-4 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {(() => {
                      const list: any[] = [];
                      safeProducts.forEach(product => {
                        const minStock = product.min_stock_level || 10;
                        if (product.quantity <= minStock) {
                          list.push({
                            id: product.id,
                            name: product.name,
                            sku: product.sku,
                            channel: 'Warehouse',
                            location: 'Central Warehouse',
                            qty: product.quantity,
                            min: minStock,
                          });
                        }
                        const balances = product.product_balances || [];
                        balances.forEach((bal: any) => {
                          const br = branches.find(b => b.id === bal.branch_id);
                          const bName = br?.branch_name || 'Branch';
                          if (bal.wholesale_qty <= minStock) {
                            list.push({
                              id: product.id,
                              name: product.name,
                              sku: product.sku,
                              channel: 'Wholesale',
                              location: `${bName} (Wholesale)`,
                              qty: bal.wholesale_qty,
                              min: minStock,
                            });
                          }
                          if (bal.retail_qty <= minStock) {
                            list.push({
                              id: product.id,
                              name: product.name,
                              sku: product.sku,
                              channel: 'Retail',
                              location: `${bName} (Retail)`,
                              qty: bal.retail_qty,
                              min: minStock,
                            });
                          }
                          if (bal.supermarket_qty <= minStock) {
                            list.push({
                              id: product.id,
                              name: product.name,
                              sku: product.sku,
                              channel: 'Supermarket',
                              location: `${bName} (Supermarket)`,
                              qty: bal.supermarket_qty,
                              min: minStock,
                            });
                          }
                        });
                      });

                      const sortedList = list.sort((a, b) => a.qty - b.qty).slice(0, 5);

                      if (sortedList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={5} className="px-4 py-6 text-center text-slate-500 italic">
                              No low stock alerts currently active.
                            </td>
                          </tr>
                        );
                      }

                      return sortedList.map((item, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                          <td className="px-4 py-3">
                            <span className="font-semibold text-white">{item.name}</span>
                            <span className="text-[10px] text-slate-500 font-mono block uppercase">{item.sku}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-slate-300 font-medium">{item.location}</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`font-bold ${item.qty === 0 ? 'text-rose-500' : 'text-amber-500'}`}>
                              {item.qty} units
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-400">
                            {item.min}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${item.qty === 0 ? 'bg-red-500/10 text-red-400 border-red-500/20 animate-pulse' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}`}>
                              {item.qty === 0 ? 'EMPTY' : 'LOW STOCK'}
                            </span>
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Create Staff Account Form */}
        <div className="lg:col-span-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden group transition-all duration-300 hover:border-indigo-500/50">
            
            <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
              <UserPlus size={100} />
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-3 bg-indigo-500/20 rounded-xl border border-indigo-500/30 text-indigo-400">
                <UserPlus size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">Create Staff Account</h2>
            </div>
            
            <form action={createStaff} ref={staffFormRef} className="space-y-6 relative z-10">
              
              {staffState?.error && (
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={16} /> <span className="font-medium">{staffState.error}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Email Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Mail size={16} className="text-indigo-400" /> Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    required
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                    placeholder="staff@pharmacy.com"
                  />
                </div>

                {/* Password Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <KeyRound size={16} className="text-indigo-400" /> Temporary Password
                  </label>
                  <input
                    type="password"
                    name="password"
                    required
                    className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
                    placeholder="••••••••"
                  />
                </div>

                {/* Role Field */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <Shield size={16} className="text-indigo-400" /> Account Role
                  </label>
                  <div className="relative">
                    <select
                      name="role"
                      defaultValue="Pharmacist"
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all duration-200"
                    >
                      <option value="Pharmacist">Pharmacist</option>
                      <option value="Cashier">Cashier</option>
                      <option value="Manager">Manager</option>
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                  </div>
                </div>

                {/* Branch Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                    <MapPin size={16} className="text-indigo-400" /> Primary Branch
                  </label>
                  <div className="relative">
                    <select
                      name="branchName"
                      required
                      defaultValue={branches[0]?.branch_name || ""}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all duration-200"
                    >
                      {branches.length === 0 && <option value="">No branches available</option>}
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.branch_name}>
                          {branch.branch_name}
                        </option>
                      ))}
                    </select>
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">▼</div>
                  </div>
                </div>
              </div>

              <div className="pt-4 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={isCreatingStaff}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold py-3 px-8 rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
                >
                  <UserPlus size={18} />
                  {isCreatingStaff ? "Creating..." : "Create Account"}
                </button>
                
                {staffState?.success && (
                  <div className="flex items-center gap-2 text-emerald-400 animate-in fade-in slide-in-from-left-4 duration-300">
                    <CheckCircle2 size={20} />
                    <span>{staffState.success}</span>
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>

        {/* Manage Branches Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-8 rounded-3xl shadow-2xl relative overflow-hidden transition-all duration-300 hover:border-emerald-500/50 h-full flex flex-col">
            
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/30 text-emerald-400">
                <Building2 size={24} />
              </div>
              <h2 className="text-2xl font-bold text-white">Manage Branches</h2>
            </div>
            
            <form action={addBranch} ref={branchFormRef} className="mb-6">
              
              {branchState?.error && (
                <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
                  <AlertCircle size={14} /> <span className="font-medium">{branchState.error}</span>
                </div>
              )}
              {branchState?.success && (
                <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-sm flex items-center gap-2">
                  <CheckCircle2 size={14} /> <span className="font-medium">{branchState.success}</span>
                </div>
              )}

              <div className="space-y-2 relative">
                <input
                  type="text"
                  name="branchName"
                  required
                  className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 pr-12 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                  placeholder="New Branch Name..."
                />
                <button
                  type="submit"
                  disabled={isAddingBranch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Plus size={18} />
                </button>
              </div>
            </form>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-3">
              {branches.length === 0 ? (
                <div className="text-center text-slate-500 py-8 italic">
                  No branches currently added.
                </div>
              ) : (
                branches.map((branch) => (
                  <div
                    key={branch.id}
                    className="flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-colors group cursor-default"
                  >
                    <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <MapPin size={16} />
                    </div>
                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                      {branch.branch_name}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
);
}
