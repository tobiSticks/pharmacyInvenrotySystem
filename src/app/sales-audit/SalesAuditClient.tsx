"use client";

import React, { useState, useMemo, useTransition } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart 
} from "recharts";
import { 
  Download, FileSpreadsheet, FileText, ChevronLeft, Building2, TrendingUp, Wallet, Calendar, Filter, Zap, LogOut
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateMockSalesDataAction } from "../actions";
import { useRouter } from "next/navigation";

interface Transaction {
  id: string;
  branch_name: string;
  total_amount: number;
  payment_method: string;
  cashier_name: string;
  created_at: string;
}

export default function SalesAuditClient({ initialTransactions, branches }: { initialTransactions: Transaction[], branches: string[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [isPending, startTransition] = useTransition();

  const filteredTransactions = useMemo(() => {
    if (selectedBranch === "All Branches") return initialTransactions;
    return initialTransactions.filter(t => t.branch_name === selectedBranch);
  }, [initialTransactions, selectedBranch]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const lastYear = new Date(today.getFullYear() - 1, 0, 1);

    let daily = 0, weekly = 0, monthly = 0, yearly = 0, lastYearly = 0;

    filteredTransactions.forEach(t => {
      const date = new Date(t.created_at);
      const amount = Number(t.total_amount);

      if (date >= today) daily += amount;
      if (date >= startOfWeek) weekly += amount;
      if (date >= startOfMonth) monthly += amount;
      if (date >= startOfYear) yearly += amount;
      if (date >= lastYear && date < startOfYear) lastYearly += amount;
    });

    const yearlyGrowth = lastYearly === 0 
      ? (yearly > 0 ? 100 : 0) 
      : ((yearly - lastYearly) / lastYearly) * 100;

    return { daily, weekly, monthly, yearly, yearlyGrowth };
  }, [filteredTransactions]);

  // Aggregate for chart
  const chartData = useMemo(() => {
    const last30Days = Array.from({ length: 30 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return Math.floor(d.getTime() / 86400000); // Day integer
    }).reverse();

    const grouped: Record<number, number> = {};
    last30Days.forEach(day => grouped[day] = 0);

    filteredTransactions.forEach(t => {
      const day = Math.floor(new Date(t.created_at).getTime() / 86400000);
      if (grouped[day] !== undefined) {
        grouped[day] += Number(t.total_amount);
      }
    });

    return last30Days.map(day => {
      const d = new Date(day * 86400000);
      return {
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        sales: grouped[day]
      };
    });
  }, [filteredTransactions]);

  const exportExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map(t => ({
      Date: new Date(t.created_at).toLocaleString(),
      Branch: t.branch_name,
      Cashier: t.cashier_name,
      Method: t.payment_method,
      Amount: t.total_amount
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Sales_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Sales Audit Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Branch: ${selectedBranch}`, 14, 30);
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 36);

    autoTable(doc, {
      startY: 45,
      head: [["Date", "Branch", "Cashier", "Method", "Amount"]],
      body: filteredTransactions.map(t => [
        new Date(t.created_at).toLocaleString(),
        t.branch_name,
        t.cashier_name || "-",
        t.payment_method,
        `₦${Number(t.total_amount).toFixed(2)}`
      ]),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] }
    });

    doc.save(`Sales_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateMock = () => {
    startTransition(async () => {
      await generateMockSalesDataAction();
      router.refresh();
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-slate-500 hover:text-blue-400 flex items-center gap-1 text-sm transition-colors mb-2 group w-fit">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-500/20 rounded-xl border border-blue-500/30 text-blue-400">
              <TrendingUp size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">
                Sales Audit
              </h1>
              <p className="mt-1 text-slate-400 text-lg">
                Monitor live transactions, track branch performance, and export compliance reports.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          {initialTransactions.length === 0 && (
            <button 
              onClick={handleGenerateMock}
              disabled={isPending}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3 px-4 rounded-xl transition-all"
            >
              <Zap size={18} className="text-amber-400" />
              {isPending ? 'Generating...' : 'Generate Demo Data'}
            </button>
          )}
          <div className="flex bg-slate-900 border border-slate-700 rounded-xl overflow-hidden p-1">
            <button onClick={exportExcel} className="flex items-center gap-2 hover:bg-emerald-500/20 text-emerald-400 py-2 px-4 rounded-lg transition-colors font-medium text-sm">
              <FileSpreadsheet size={16} /> Excel
            </button>
            <div className="w-[1px] bg-slate-700 my-2 mx-1" />
            <button onClick={exportPDF} className="flex items-center gap-2 hover:bg-rose-500/20 text-rose-400 py-2 px-4 rounded-lg transition-colors font-medium text-sm">
              <FileText size={16} /> PDF
            </button>
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          <LogOut size={16} className="text-rose-500" /> SIGN OUT
        </button>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl w-fit">
        <Filter size={18} className="text-slate-400" />
        <span className="text-sm font-medium text-slate-300">Filter Branch:</span>
        <select 
          value={selectedBranch}
          onChange={(e) => setSelectedBranch(e.target.value)}
          className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
        >
          <option value="All Branches">All Branches</option>
          {branches.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard title="Today's Sales" amount={metrics.daily} icon={<Calendar size={20} />} color="blue" />
        <MetricCard title="This Week" amount={metrics.weekly} icon={<Calendar size={20} />} color="indigo" />
        <MetricCard title="This Month" amount={metrics.monthly} icon={<Wallet size={20} />} color="emerald" />
        <MetricCard 
          title="Yearly Growth" 
          amount={`${metrics.yearlyGrowth > 0 ? '+' : ''}${metrics.yearlyGrowth.toFixed(1)}%`} 
          subtext={`YTD: ₦${metrics.yearly.toFixed(2)}`}
          icon={<TrendingUp size={20} />} 
          color={metrics.yearlyGrowth >= 0 ? "emerald" : "rose"} 
          isCurrency={false} 
        />
      </div>

      {/* Chart */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp size={20} className="text-blue-400" /> 30-Day Sales Trend
        </h3>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `₦${value}`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#fff' }}
                itemStyle={{ color: '#818cf8', fontWeight: 'bold' }}
                formatter={(value: any) => [`₦${Number(value).toFixed(2)}`, 'Sales']}
              />
              <Area type="monotone" dataKey="sales" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Live Feed Table */}
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-slate-800">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-purple-400" /> Live Transaction Feed
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Branch</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Cashier</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Method</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 italic">
                    No transactions found for this branch.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 50).map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {new Date(t.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold border border-slate-700">
                        {t.branch_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-sm">
                      {t.cashier_name || "Unknown"}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                        {t.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-white font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                        ₦{Number(t.total_amount).toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {filteredTransactions.length > 50 && (
            <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-950/30 border-t border-slate-800/50">
              Showing 50 most recent transactions... Use exports for full audit history.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, amount, subtext, icon, color, isCurrency = true }: { title: string, amount: any, subtext?: string, icon: any, color: 'blue' | 'indigo' | 'emerald' | 'rose', isCurrency?: boolean }) {
  const styles: Record<string, string> = {
    blue: "from-blue-500/20 border-blue-500/30 text-blue-400",
    indigo: "from-indigo-500/20 border-indigo-500/30 text-indigo-400",
    emerald: "from-emerald-500/20 border-emerald-500/30 text-emerald-400",
    rose: "from-rose-500/20 border-rose-500/30 text-rose-400",
  };
  
  const colorStyles = styles[color];

  return (
    <div className={`bg-gradient-to-br to-slate-900/50 border rounded-3xl p-6 shadow-xl ${colorStyles} backdrop-blur-xl relative overflow-hidden group`}>
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-125 transition-transform duration-500">
        {icon}
      </div>
      <div className="flex items-center gap-3 mb-4 relative z-10">
        <div className={`p-2 rounded-xl bg-slate-950/50 border ${colorStyles}`}>
          {icon}
        </div>
        <h3 className="text-sm font-bold tracking-wide uppercase text-slate-400">{title}</h3>
      </div>
      <div className="relative z-10">
        <div className="text-3xl font-extrabold text-white">
          {isCurrency ? `₦${Number(amount).toFixed(2)}` : amount}
        </div>
        {subtext && <div className="text-xs text-slate-500 mt-1 font-medium">{subtext}</div>}
      </div>
    </div>
  );
}
