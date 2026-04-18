"use client";

import React, { useActionState } from "react";
import { businessSignupAction } from "../actions";
import { Building2, Mail, KeyRound, User, ArrowRight, ShieldCheck, LayoutDashboard } from "lucide-react";
import Link from "next/link";

export default function RegisterPage() {
  const [state, formAction, isPending] = useActionState(businessSignupAction, undefined);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="max-w-xl w-full space-y-8 bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-10 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 hover:border-indigo-500/50">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center mb-6">
            <Building2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Register Your Pharmacy
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Empower your business with our premium inventory system.
          </p>
        </div>

        {/* Error message block */}
        {state?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldCheck size={16} className="rotate-180" />
            <span className="font-medium">{state.error}</span>
          </div>
        )}

        <form action={formAction} className="mt-8 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Full Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                <User size={14} className="text-emerald-400" /> Full Name
              </label>
              <input
                type="text"
                name="fullName"
                required
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                placeholder="John Doe"
              />
            </div>

            {/* Business Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
                <LayoutDashboard size={14} className="text-emerald-400" /> Business Name
              </label>
              <input
                type="text"
                name="businessName"
                required
                className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
                placeholder="HealthPlus Pharma"
              />
            </div>
          </div>

          {/* Email Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <Mail size={14} className="text-emerald-400" /> Email Address
            </label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
              placeholder="owner@pharmacy.com"
            />
          </div>

          {/* Password Field */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2 px-1">
              <KeyRound size={14} className="text-emerald-400" /> Create Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex justify-center items-center py-4 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_rgba(16,185,129,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-500 focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-1 active:translate-y-0"
            >
              {isPending ? (
                "Setting Up Your Pharmacy..."
              ) : (
                <span className="flex items-center gap-2 text-lg">
                  Start Your Pharmacy <ArrowRight size={22} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Links */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
          <Link 
            href="/login" 
            className="text-slate-400 hover:text-white transition-colors flex items-center gap-1 group"
          >
            Already have a business? <span className="text-emerald-400 font-semibold group-hover:underline underline-offset-4">Login here</span>
          </Link>
          
          <Link 
            href="/login-staff" 
            className="text-slate-500 hover:text-slate-300 transition-colors italic flex items-center gap-1"
          >
             Looking for Staff Portal?
          </Link>
        </div>
      </div>
    </div>
  );
}
