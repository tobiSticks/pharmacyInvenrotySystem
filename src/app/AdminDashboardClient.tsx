"use client";

import React, { useActionState, useEffect, useRef } from "react";
import { Plus, Building2, UserPlus, KeyRound, Mail, Shield, CheckCircle2, MapPin, AlertCircle, PackagePlus, Truck, BarChart3, Tag } from "lucide-react";
import { addBranchAction, createStaffAction } from "./actions";
import Link from "next/link";

export default function AdminDashboardClient({ branches }: { branches: string[] }) {
  const [branchState, addBranch, isAddingBranch] = useActionState(addBranchAction, undefined);
  const [staffState, createStaff, isCreatingStaff] = useActionState(createStaffAction, undefined);

  const branchFormRef = useRef<HTMLFormElement>(null);
  const staffFormRef = useRef<HTMLFormElement>(null);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
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
          </div>
        </div>

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
                      defaultValue={branches[0] || ""}
                      className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 appearance-none transition-all duration-200"
                    >
                      {branches.length === 0 && <option value="">No branches available</option>}
                      {branches.map((branch) => (
                        <option key={branch} value={branch}>
                          {branch}
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
                branches.map((branch, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-4 rounded-xl border border-slate-800 bg-slate-950/40 hover:bg-slate-800 transition-colors group cursor-default"
                  >
                    <div className="text-emerald-500 bg-emerald-500/10 p-2 rounded-lg group-hover:scale-110 transition-transform">
                      <MapPin size={16} />
                    </div>
                    <span className="font-medium text-slate-300 group-hover:text-white transition-colors">
                      {branch}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
