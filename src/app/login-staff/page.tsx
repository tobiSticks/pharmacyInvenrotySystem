"use client";

import React, { useActionState } from "react";
import { loginAction } from "./actions";
import { MapPin, Mail, KeyRound, ShieldAlert, ArrowRight } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, undefined);

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-500/10 blur-[100px]" />
      </div>

      <div className="max-w-md w-full space-y-8 bg-slate-900/60 backdrop-blur-2xl border border-slate-800 p-10 rounded-3xl shadow-2xl relative z-10 transition-all duration-300 hover:border-indigo-500/50">
        
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-indigo-500/10 border border-indigo-500/30 rounded-2xl flex items-center justify-center mb-6">
            <ShieldAlert size={32} className="text-indigo-400" />
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            Staff Portal
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Secure login for pharmacy staff.
          </p>
        </div>

        {/* Error message block */}
        {state?.error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
            <ShieldAlert size={16} />
            <span className="font-medium">{state.error}</span>
          </div>
        )}

        <form action={formAction} className="space-y-6 mt-8">
          {/* Branch Field */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <MapPin size={16} className="text-indigo-400" /> Branch Name
            </label>
            <input
              type="text"
              name="branchName"
              required
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
              placeholder="e.g. Main Street Pharmacy"
            />
          </div>

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
              <KeyRound size={16} className="text-indigo-400" /> Password
            </label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-slate-950/50 border border-slate-700/50 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500 transition-all duration-200"
              placeholder="••••••••"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-[0_0_20px_rgba(79,70,229,0.2)] hover:shadow-[0_0_25px_rgba(79,70,229,0.4)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 focus:ring-offset-slate-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed group transform hover:-translate-y-0.5 active:translate-y-0"
            >
              {isPending ? (
                "Authenticating..."
              ) : (
                <span className="flex items-center gap-2">
                  Sign In to Portal <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </span>
              )}
            </button>
          </div>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-slate-800/50 text-center">
          <Link 
            href="/login" 
            className="text-slate-500 hover:text-slate-300 transition-colors text-sm flex items-center justify-center gap-2 group"
          >
             <ArrowRight size={14} className="rotate-180 group-hover:-translate-x-1 transition-transform" /> Back to Business Login
          </Link>
        </div>
      </div>
    </div>
  );
}
