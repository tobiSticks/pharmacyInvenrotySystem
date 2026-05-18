"use client";

import React, { useState, useMemo, useTransition, Fragment } from "react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart 
} from "recharts";
import { 
  Download, FileSpreadsheet, FileText, ChevronLeft, Building2, TrendingUp, Wallet, Calendar, Filter, Zap, LogOut, ChevronDown, ShoppingBag, ShoppingBasket
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { generateMockSalesDataAction } from "../actions";
import { useRouter } from "next/navigation";

interface TransactionItem {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
  pack_type?: string;
}

interface Transaction {
  id: string;
  branch_name: string;
  total_amount: number;
  payment_method: string;
  cashier_name: string;
  seller_name?: string;
  buyer_name?: string;
  created_at: string;
  status?: string;
  type?: 'wholesale' | 'retail' | 'supermarket';
  transaction_items?: TransactionItem[];
}

export default function SalesAuditClient({ initialTransactions, branches }: { initialTransactions: Transaction[], branches: string[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedBranch, setSelectedBranch] = useState<string>("All Branches");
  const [selectedSection, setSelectedSection] = useState<string>("All Sections");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();

  const filteredTransactions = useMemo(() => {
    return initialTransactions.filter(t => {
      const matchesBranch = selectedBranch === "All Branches" || t.branch_name === selectedBranch;
      const matchesSection = selectedSection === "All Sections" || t.type === selectedSection;
      return matchesBranch && matchesSection;
    });
  }, [initialTransactions, selectedBranch, selectedSection]);

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    const lastYear = new Date(today.getFullYear() - 1, 0, 1);

    let daily = 0, weekly = 0, monthly = 0, yearly = 0, lastYearly = 0;
    let wholesaleTotal = 0;
    let retailTotal = 0;
    let supermarketTotal = 0;

    filteredTransactions.forEach(t => {
      const date = new Date(t.created_at);
      const amount = Number(t.total_amount);

      if (date >= today) daily += amount;
      if (date >= startOfWeek) weekly += amount;
      if (date >= startOfMonth) monthly += amount;
      if (date >= startOfYear) yearly += amount;
      if (date >= lastYear && date < startOfYear) lastYearly += amount;

      if (t.type === 'wholesale') wholesaleTotal += amount;
      else if (t.type === 'retail') retailTotal += amount;
      else if (t.type === 'supermarket') supermarketTotal += amount;
    });

    const yearlyGrowth = lastYearly === 0 
      ? (yearly > 0 ? 100 : 0) 
      : ((yearly - lastYearly) / lastYearly) * 100;

    return { daily, weekly, monthly, yearly, yearlyGrowth, wholesaleTotal, retailTotal, supermarketTotal };
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
    const ws = XLSX.utils.json_to_sheet(filteredTransactions.map(t => {
      const itemsList = t.transaction_items?.map(item => 
        `${item.product_name} (${item.sku}) x${item.quantity}${item.pack_type ? ` [${item.pack_type}]` : ''}`
      ).join("; ") || "No items";

      return {
        Date: new Date(t.created_at).toLocaleString(),
        Branch: t.branch_name,
        Section: t.type ? t.type.toUpperCase() : "DEMO / MOCK",
        Seller: t.seller_name || t.cashier_name || "-",
        Buyer: t.buyer_name || "-",
        Status: t.status ? t.status.toUpperCase() : "COMPLETED",
        Method: t.payment_method || "N/A",
        "Total Amount": Number(t.total_amount),
        "Items Sold": itemsList
      };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Sales");
    XLSX.writeFile(wb, `Sales_Audit_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: "landscape" });
    doc.setFontSize(20);
    doc.text("Sales Audit Report", 14, 18);
    doc.setFontSize(10);
    doc.text(`Branch: ${selectedBranch} | Section: ${selectedSection}`, 14, 26);
    doc.text(`Date Generated: ${new Date().toLocaleString()}`, 14, 32);

    autoTable(doc, {
      startY: 38,
      head: [["Date", "Branch", "Section", "Seller", "Buyer", "Status", "Items", "Amount"]],
      body: filteredTransactions.map(t => {
        const itemsList = t.transaction_items?.map(item => 
          `${item.product_name} (x${item.quantity})`
        ).join(", ") || "-";

        return [
          new Date(t.created_at).toLocaleString(),
          t.branch_name,
          t.type ? t.type.toUpperCase() : "MOCK",
          t.seller_name || t.cashier_name || "-",
          t.buyer_name || "-",
          t.status ? t.status.toUpperCase() : "COMPLETED",
          itemsList.length > 60 ? itemsList.substring(0, 60) + "..." : itemsList,
          `₦${Number(t.total_amount).toFixed(2)}`
        ];
      }),
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229] },
      columnStyles: {
        6: { cellWidth: 70 } // Give the items column more space
      }
    });

    doc.save(`Sales_Audit_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleGenerateMock = () => {
    startTransition(async () => {
      await generateMockSalesDataAction();
      router.refresh();
    });
  };

  const toggleRow = (id: string) => {
    setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
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

        <div className="flex gap-3 flex-wrap">
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
          <button 
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <LogOut size={16} className="text-rose-500" /> SIGN OUT
          </button>
        </div>
      </div>

      {/* Interactive Filters Panel */}
      <div className="flex flex-wrap items-center gap-4 p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl w-fit">
        <div className="flex items-center gap-2">
          <Filter size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Branch:</span>
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
        
        <div className="hidden sm:block w-[1px] bg-slate-800 h-6 mx-2" />

        <div className="flex items-center gap-2">
          <ShoppingBasket size={18} className="text-slate-400" />
          <span className="text-sm font-medium text-slate-300">Section:</span>
          <select 
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value)}
            className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:ring-2 focus:ring-blue-500/50 outline-none"
          >
            <option value="All Sections">All Sections</option>
            <option value="wholesale">Wholesale</option>
            <option value="retail">Retail</option>
            <option value="supermarket">Supermarket</option>
          </select>
        </div>
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

      {/* Section Totals Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 bg-slate-900/30 border border-slate-800/80 p-6 rounded-3xl backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Wholesale Channel</div>
            <div className="text-xl font-extrabold text-white">₦{metrics.wholesaleTotal.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Retail Pharmacy</div>
            <div className="text-xl font-extrabold text-white">₦{metrics.retailTotal.toFixed(2)}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
          <div>
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Supermarket Section</div>
            <div className="text-xl font-extrabold text-white">₦{metrics.supermarketTotal.toFixed(2)}</div>
          </div>
        </div>
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
        <div className="p-6 border-b border-slate-800 flex justify-between items-center">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Building2 size={20} className="text-purple-400" /> Live Transaction Feed
          </h3>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{filteredTransactions.length} Transactions Found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/80 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Timestamp</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Branch</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Section</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Seller</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Buyer</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Status</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap text-right">Total Amount</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap text-center">Items</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-500 italic">
                    No transactions found for the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredTransactions.slice(0, 50).map((t) => {
                  const isExpanded = !!expandedRows[t.id];
                  return (
                    <Fragment key={t.id}>
                      <tr className="hover:bg-slate-800/30 transition-colors group">
                        <td className="px-6 py-4 text-slate-300 text-sm whitespace-nowrap">
                          {new Date(t.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-md text-xs font-semibold border border-slate-700">
                            {t.branch_name}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                            t.type === 'wholesale' 
                              ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' 
                              : t.type === 'retail' 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : t.type === 'supermarket' 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' 
                              : 'bg-slate-800 text-slate-400 border-slate-700'
                          }`}>
                            {t.type ? t.type.toUpperCase() : "MOCK"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-300 text-sm font-semibold whitespace-nowrap">
                          {t.seller_name || t.cashier_name || "Unknown"}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-sm whitespace-nowrap">
                          {t.buyer_name || "Walk-in Customer"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-black tracking-widest ${
                            t.status === 'completed' 
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                              : t.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}>
                            {t.status ? t.status.toUpperCase() : "COMPLETED"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span className="text-white font-bold bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/20">
                            ₦{Number(t.total_amount).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center whitespace-nowrap">
                          <button 
                            onClick={() => toggleRow(t.id)}
                            className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1 mx-auto bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20"
                          >
                            {isExpanded ? "Hide" : "View"} ({t.transaction_items?.length || 0} items)
                            <ChevronDown size={14} className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={8} className="px-8 py-6">
                            <div className="bg-slate-950/80 rounded-2xl border border-slate-800 p-6 max-w-4xl animate-in slide-in-from-top-2 duration-300">
                              <h4 className="text-sm font-bold text-white mb-4 uppercase tracking-widest flex items-center gap-2">
                                <ShoppingBag size={16} className="text-blue-400" /> Items Sold Breakdown
                              </h4>
                              {(!t.transaction_items || t.transaction_items.length === 0) ? (
                                <p className="text-xs text-slate-500 italic">No item details recorded for this transaction.</p>
                              ) : (
                                <table className="w-full text-left text-xs border-collapse">
                                  <thead>
                                    <tr className="bg-slate-900/60 text-slate-400 font-bold uppercase tracking-widest border-b border-slate-800">
                                      <th className="px-4 py-2">Product Name</th>
                                      <th className="px-4 py-2">SKU</th>
                                      <th className="px-4 py-2 text-center">Qty</th>
                                      <th className="px-4 py-2 text-right">Unit Price</th>
                                      {t.type === 'wholesale' && <th className="px-4 py-2">Pack Info</th>}
                                      <th className="px-4 py-2 text-right">Subtotal</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-800/40">
                                    {t.transaction_items.map((item, idx) => (
                                      <tr key={item.id || idx} className="hover:bg-slate-900/40 transition-colors">
                                        <td className="px-4 py-3 font-bold text-slate-200">{item.product_name}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono">{item.sku}</td>
                                        <td className="px-4 py-3 text-center text-white font-bold">{item.quantity}</td>
                                        <td className="px-4 py-3 text-right text-slate-300">₦{Number(item.unit_price).toFixed(2)}</td>
                                        {t.type === 'wholesale' && (
                                          <td className="px-4 py-3 text-slate-400">
                                            {item.pack_type ? <span className="px-2 py-0.5 bg-slate-800 text-[10px] uppercase font-bold rounded">{item.pack_type}</span> : "-"}
                                          </td>
                                        )}
                                        <td className="px-4 py-3 text-right font-bold text-emerald-400">₦{Number(item.subtotal).toFixed(2)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
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
