"use client";

import React, { useState, useMemo, useTransition, useEffect } from "react";
import { 
  Search, 
  ShoppingCart, 
  Package, 
  User, 
  Building2, 
  ChevronRight, 
  Plus, 
  Minus, 
  Trash2, 
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertCircle,
  Hash,
  Filter,
  LogOut,
  Calendar,
  Wallet,
  Clock,
  Banknote,
  ClipboardCheck,
  Zap,
  Ticket
} from "lucide-react";
import Link from "next/link";
import { 
  createSupermarketTransactionAction, 
  collectPaymentAction, 
  clearDailyAuditAction,
  submitDailyAuditAction
} from "../../actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  supermarket_price: number;
  quantity: number;
}

const CATEGORIES = ["All", "Snacks", "Drinks", "Groceries", "Personal Care", "Sweets"];

export default function CashierDashboardClient({ 
  initialProducts, 
  branchName, 
  branchId, 
  userProfile,
  pendingPayments,
  auditSubmissions 
}: any) {
  const router = useRouter();
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"pos" | "payments" | "audit">("pos");
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);

  const [checkoutData, setCheckoutData] = useState({
    sellerName: userProfile?.full_name || userProfile?.email?.split('@')[0] || "Cashier",
    buyerName: "Walk-in Customer",
    date: new Date().toISOString().split('T')[0]
  });

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category_name?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        supermarket_price: Number(product.supermarket_price),
        quantity: 1
      }];
    });
  };

  const updateCartQty = (id: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.id !== id));
      return;
    }
    setCart(prev => prev.map(item => item.id === id 
      ? { ...item, quantity: newQty } 
      : item
    ));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.supermarket_price * item.quantity), 0);

  const handleCheckout = () => {
    startTransition(async () => {
      const result = await createSupermarketTransactionAction(null, {
        branchId,
        items: cart,
        sellerName: checkoutData.sellerName,
        buyerName: checkoutData.buyerName,
        totalAmount: cartTotal
      });

      if (result.success) {
        setCheckoutSuccess({
          transactionId: result.transactionId,
          ...checkoutData,
          items: cart,
          total: cartTotal
        });
        setCart([]);
        setIsCheckingOut(false);
      } else {
        alert(result.error);
      }
    });
  };

  const handleCollectPayment = (transactionId: string) => {
    if (!confirm("Confirm payment received for this receipt?")) return;
    startTransition(async () => {
      const result = await collectPaymentAction(transactionId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  const handleClearAudit = (staffId: string) => {
    if (!confirm("Are you sure you want to CLEAR this staff member's audit? This marks the books as finalized.")) return;
    startTransition(async () => {
      const result = await clearDailyAuditAction(staffId);
      if (result.success) {
        router.refresh();
      } else {
        alert(result.error);
      }
    });
  };

  if (checkoutSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white text-slate-900 w-full max-w-md p-8 rounded-none shadow-2xl print:m-0 print:p-4 print:shadow-none" id="receipt">
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-6 mb-6">
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 font-serif text-amber-700">SUPERMARKET</h2>
            <p className="text-sm font-bold text-slate-500 uppercase">{branchName}</p>
            <p className="text-xs text-slate-400 mt-2">{new Date().toLocaleString()}</p>
          </div>

          <table className="w-full text-sm mb-8 border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-100">
                <th className="text-left py-2 font-black text-xs text-slate-400">ITEM</th>
                <th className="text-center py-2 font-black text-xs text-slate-400">QTY</th>
                <th className="text-right py-2 font-black text-xs text-slate-400">PRICE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {checkoutSuccess.items.map((item: any, i: number) => (
                <tr key={i}>
                  <td className="py-3">
                    <div className="font-bold text-slate-800">{item.name}</div>
                  </td>
                  <td className="py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    ₦{(item.supermarket_price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-4 border-double border-slate-900 pt-4 mb-10">
            <div className="flex justify-between items-center">
              <span className="text-xl font-black tracking-tight">PAID IN FULL</span>
              <span className="text-3xl font-black tracking-tighter text-amber-600">₦{checkoutSuccess.total.toFixed(2)}</span>
            </div>
          </div>
          
          <p className="text-center text-[10px] text-slate-400 mt-8 italic">Thank you for your patronage!</p>
        </div>

        <div className="mt-8 flex gap-4 print:hidden">
          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-amber-600 hover:bg-amber-500 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
          >
            <Printer size={20} /> PRINT RECEIPT
          </button>
          <button 
            onClick={() => setCheckoutSuccess(null)}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-all hover:scale-95"
          >
            NEW SALE
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans selection:bg-amber-500/30">
      {/* Upper Navigation Bar */}
      <nav className="p-4 bg-slate-900/50 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-8">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
              <Building2 className="text-amber-400" size={20} />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">{branchName} <span className="text-slate-500 text-xs font-bold uppercase ml-2 px-2 py-0.5 border border-slate-800 rounded bg-slate-950">Cashier Hub</span></h1>
          </div>
          
          <div className="h-6 w-[1px] bg-slate-800 ml-2" />

          <div className="flex items-center bg-slate-950/50 border border-slate-800 rounded-xl p-1 shrink-0">
            <button 
              onClick={() => setActiveTab("pos")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${activeTab === 'pos' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <Zap size={14} /> SUPERMARKET
            </button>
            <button 
              onClick={() => setActiveTab("payments")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${activeTab === 'payments' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <Banknote size={14} /> PAYMENTS {pendingPayments.length > 0 && <span className="w-2 h-2 bg-rose-500 rounded-full animate-pulse ml-1" />}
            </button>
            <button 
              onClick={() => setActiveTab("audit")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black tracking-widest transition-all ${activeTab === 'audit' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-500 hover:text-white'}`}
            >
              <ClipboardCheck size={14} /> CLEARANCE {auditSubmissions.length > 0 && <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse ml-1" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right hidden md:block">
            <div className="text-xs font-black text-white tracking-tighter uppercase">{userProfile?.full_name}</div>
            <div className="text-[10px] text-slate-500 font-bold uppercase">Authorized Cashier</div>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="p-3 bg-slate-900 border border-slate-800 rounded-xl text-rose-500 hover:bg-slate-800 transition-all hover:scale-110 active:scale-95"
          >
            <LogOut size={18} />
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* VIEW 1: SUPERMARKET POS */}
        {activeTab === "pos" && (
          <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="relative group w-full max-w-xl">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-amber-400 transition-colors" size={20} />
                  <input 
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Search groceries, sweets, snacks..."
                    className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500/50 transition-all font-medium placeholder-slate-700"
                  />
                </div>
                <div className="flex gap-2 ml-4">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-900 text-slate-600 hover:text-white'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto pr-4 space-y-8">
                 {filteredProducts.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center grayscale opacity-50">
                     <Package size={100} className="text-slate-800 mb-6" />
                     <h2 className="text-2xl font-black text-slate-700">No Grocery Items</h2>
                     <p className="text-slate-800 mt-2">Inventory is empty. Admin must add supermarket stock.</p>
                   </div>
                 ) : (
                   <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                     {filteredProducts.map((p: any) => (
                       <div 
                         key={p.id}
                         onClick={() => addToCart(p)}
                         className="bg-slate-900/40 border border-slate-800 hover:border-amber-500/40 rounded-3xl p-5 group cursor-pointer transition-all hover:scale-[1.02] active:scale-95"
                       >
                         <div className="flex justify-between items-start mb-4">
                            <span className="text-[9px] font-black uppercase tracking-widest text-amber-500/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">{p.category_name || "Groceries"}</span>
                            <span className="text-[9px] font-mono text-slate-700">#{p.sku.substring(0, 8)}</span>
                         </div>
                         <h3 className="font-bold text-white group-hover:text-amber-400 transition-colors mb-4 line-clamp-1">{p.name}</h3>
                         <div className="flex items-end justify-between">
                            <div>
                               <div className="text-[9px] font-black text-slate-700 uppercase">Price</div>
                               <div className="text-xl font-black text-white">₦{Number(p.supermarket_price).toLocaleString()}</div>
                            </div>
                            <div className="text-right">
                               <div className="text-[9px] font-black text-slate-700 uppercase">Stock</div>
                               <div className={`text-sm font-black ${p.supermarket_qty > 10 ? 'text-slate-400' : 'text-orange-500'}`}>{p.supermarket_qty}</div>
                            </div>
                         </div>
                       </div>
                     ))}
                   </div>
                 )}
              </div>
            </div>

            {/* Cart Sidepanel */}
            <div className="w-full xl:w-[400px] bg-slate-900/10 backdrop-blur-3xl border-l border-slate-800 flex flex-col">
               <div className="p-8 pb-4 flex justify-between items-center">
                  <h2 className="text-xl font-black text-white flex items-center gap-2"><ShoppingCart size={20} className="text-amber-500" /> Cart</h2>
                  <span className="bg-amber-500 text-white px-2 py-0.5 rounded-full text-[10px] font-black">{cart.length} ITEMS</span>
               </div>
               <div className="flex-1 overflow-y-auto px-8 space-y-4">
                 {cart.length === 0 ? (
                   <div className="h-full flex flex-col items-center justify-center opacity-20 filter grayscale">
                      <ShoppingCart size={48} />
                      <p className="mt-4 font-bold">Cart Empty</p>
                   </div>
                 ) : (
                   cart.map(item => (
                     <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-4">
                        <div className="flex justify-between mb-3">
                           <span className="font-bold text-white text-sm">{item.name}</span>
                           <button onClick={() => updateCartQty(item.id, 0)} className="text-slate-700 hover:text-rose-500"><Trash2 size={14} /></button>
                        </div>
                        <div className="flex items-center justify-between">
                           <div className="flex items-center gap-3">
                             <button onClick={() => updateCartQty(item.id, item.quantity - 1)} className="p-1.5 bg-slate-900 rounded-lg text-slate-500 hover:text-white"><Minus size={12} /></button>
                             <span className="text-sm font-black text-white w-8 text-center">{item.quantity}</span>
                             <button onClick={() => updateCartQty(item.id, item.quantity + 1)} className="p-1.5 bg-slate-900 rounded-lg text-amber-500 hover:text-white"><Plus size={12} /></button>
                           </div>
                           <span className="font-bold text-white">₦{(item.supermarket_price * item.quantity).toFixed(2)}</span>
                        </div>
                     </div>
                   ))
                 )}
               </div>
               <div className="p-8 border-t border-slate-800 bg-slate-950/50">
                  <div className="flex justify-between items-center mb-6">
                     <span className="text-xs font-black text-slate-500 uppercase">Daily Grand Total</span>
                     <span className="text-3xl font-black text-white">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <button 
                    disabled={cart.length === 0 || isPending}
                    onClick={() => setIsCheckingOut(true)}
                    className="w-full bg-amber-600 hover:bg-amber-500 text-white font-black py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-30 disabled:hover:translate-y-0"
                  >
                    {isPending ? "PROCESSING..." : "CONFIRM SALE"}
                  </button>
               </div>
            </div>
          </div>
        )}

        {/* VIEW 2: PENDING PAYMENTS */}
        {activeTab === "payments" && (
          <div className="flex-1 p-10 overflow-y-auto">
             <div className="max-w-4xl mx-auto space-y-10">
               <div className="flex justify-between items-end">
                 <div>
                    <h2 className="text-4xl font-black text-white tracking-tight mb-2">Pending Payments</h2>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Mark receipts as paid from pharmacist/manager</p>
                 </div>
                 <div className="px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl text-indigo-400 font-bold text-sm">
                   {pendingPayments.length} Waiting
                 </div>
               </div>

               <div className="grid gap-4">
                 {pendingPayments.length === 0 ? (
                   <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl grayscale opacity-30">
                      <Banknote size={60} className="mx-auto mb-4" />
                      <p className="text-xl font-bold">No Pending Receipts</p>
                      <p className="text-sm">New receipts will pop up here in real-time.</p>
                   </div>
                 ) : (
                   pendingPayments.map((t: any) => (
                     <div key={t.id} className="bg-slate-900/40 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-indigo-500/30 transition-colors animate-in fade-in slide-in-from-top-4">
                        <div className="flex items-center gap-5">
                           <div className="w-14 h-14 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                             <Ticket size={24} />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-lg font-black text-white">₦{Number(t.total_amount).toLocaleString()}</span>
                                <span className="px-2 py-0.5 bg-slate-950 text-slate-500 text-[9px] font-black rounded uppercase border border-slate-800">UNPAID</span>
                              </div>
                              <div className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                                 <User size={12} /> {t.buyer_name} <span className="text-slate-700">•</span> <Clock size={12} /> {new Date(t.created_at).toLocaleTimeString()}
                              </div>
                           </div>
                        </div>

                        <div className="flex items-center gap-3">
                           <div className="text-right hidden sm:block mr-2">
                              <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Seller</div>
                              <div className="text-sm font-bold text-slate-300">{t.seller_name}</div>
                           </div>
                           <button 
                             onClick={() => handleCollectPayment(t.id)}
                             disabled={isPending}
                             className="bg-indigo-600 hover:bg-emerald-500 text-white font-black px-8 py-4 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 flex items-center gap-2 disabled:opacity-50"
                           >
                             <CheckCircle2 size={18} /> {isPending ? "CONFIRMING..." : "COLLECT PAYMENT"}
                           </button>
                        </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
          </div>
        )}

        {/* VIEW 3: AUDIT CLEARANCE */}
        {activeTab === "audit" && (
          <div className="flex-1 p-10 overflow-y-auto">
             <div className="max-w-4xl mx-auto space-y-10">
                <div>
                    <h2 className="text-4xl font-black text-white tracking-tight mb-2">Audit Hub</h2>
                    <p className="text-slate-500 font-bold uppercase text-xs tracking-widest">Final clearance for submitted daily sales</p>
                </div>

                <div className="grid gap-6">
                  {auditSubmissions.length === 0 ? (
                     <div className="py-20 text-center border-2 border-dashed border-slate-800 rounded-3xl grayscale opacity-30">
                        <ClipboardCheck size={60} className="mx-auto mb-4" />
                        <p className="text-xl font-bold">All Staff Cleared</p>
                        <p className="text-sm">When staff submit sales, they will appear here for review.</p>
                     </div>
                  ) : (
                    auditSubmissions.map((staff: any) => (
                      <div key={staff.staffId} className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden animate-in zoom-in-95 duration-300 shadow-2xl">
                         <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-950/20">
                            <div className="flex items-center gap-5">
                               <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-3xl flex items-center justify-center text-emerald-400">
                                 <User size={32} />
                               </div>
                               <div>
                                  <h3 className="text-2xl font-black text-white">{staff.staffName}</h3>
                                  <p className="text-emerald-500/60 font-black text-xs uppercase tracking-tighter">Daily Sales Submitted</p>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className="text-3xl font-black text-white tracking-tighter">₦{staff.totalSales.toLocaleString()}</div>
                               <div className="text-[10px] text-slate-500 font-bold uppercase">{staff.transactionCount} Orders • {staff.items?.length || 0} Products</div>
                            </div>
                         </div>

                         {/* Itemized Breakdown */}
                         <div className="px-8 py-2 bg-slate-950/30">
                            <button 
                              onClick={() => setExpandedAudit(expandedAudit === staff.staffId ? null : staff.staffId)}
                              className="text-[10px] font-black text-emerald-500/80 hover:text-emerald-400 py-3 uppercase tracking-[0.2em] flex items-center gap-2 transition-colors"
                            >
                              <ChevronRight size={14} className={`transition-transform ${expandedAudit === staff.staffId ? 'rotate-90' : ''}`} /> 
                              {expandedAudit === staff.staffId ? 'Hide Product Breakdown' : 'View Product Breakdown'}
                            </button>

                            {expandedAudit === staff.staffId && (
                              <div className="pb-6 animate-in slide-in-from-top-2 duration-300">
                                <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden">
                                  <table className="w-full text-left text-xs">
                                    <thead>
                                      <tr className="bg-slate-900/50 text-slate-500 font-black uppercase tracking-widest border-b border-slate-800">
                                        <th className="px-5 py-3">Product</th>
                                        <th className="px-5 py-3 text-center">Qty</th>
                                        <th className="px-5 py-3 text-right">Total</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800/50">
                                      {staff.items.map((item: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-emerald-500/5 transition-colors">
                                          <td className="px-5 py-4 font-bold text-slate-300">{item.name}</td>
                                          <td className="px-5 py-4 text-center font-black text-white">{item.qty}</td>
                                          <td className="px-5 py-4 text-right font-black text-emerald-400">₦{item.total.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            )}
                         </div>

                         <div className="p-6 bg-slate-900/50 flex justify-between items-center border-t border-slate-800">
                            <div className="flex gap-4">
                               <div className="px-4 py-2 border border-slate-800 rounded-xl bg-slate-950/50">
                                  <div className="text-[9px] font-black text-slate-600 uppercase">Last Activity</div>
                                  <div className="text-xs font-bold text-slate-400">{new Date(staff.lastActivity).toLocaleTimeString()}</div>
                               </div>
                            </div>
                            <button 
                              onClick={() => handleClearAudit(staff.staffId)}
                              disabled={isPending}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white font-black px-10 py-4 rounded-2xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 disabled:opacity-50"
                            >
                              <ClipboardCheck size={20} /> {isPending ? "CLEARING..." : "CLEAR AUDIT (CLOSE DAY)"}
                            </button>
                         </div>
                      </div>
                    ))
                  )}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* Checkout Modal Overlay (For Supermarket POS) */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsCheckingOut(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-8 shadow-2xl">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 text-amber-500">
                <Ticket size={28} />
              </div>
              <h2 className="text-3xl font-black text-white">Finalize Sale</h2>
            </div>
            
            <div className="space-y-6 bg-slate-950/50 border border-slate-800 p-6 rounded-2xl mb-10">
               <div className="flex justify-between items-center pb-4 border-b border-slate-900">
                  <span className="text-slate-500 font-bold uppercase text-xs tracking-widest">Grand Total</span>
                  <span className="text-3xl font-black text-amber-500">₦{cartTotal.toLocaleString()}</span>
               </div>
               <div className="pt-2">
                 <div className="text-xs text-center text-slate-500 font-medium">Verify cash received from customer. This sale is immediately recorded as COMPLETED.</div>
               </div>
            </div>

            <div className="flex gap-4">
              <button onClick={() => setIsCheckingOut(false)} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-2xl transition-all">CANCEL</button>
              <button 
                onClick={handleCheckout} 
                disabled={isPending}
                className="flex-[2] bg-amber-600 hover:bg-amber-500 text-white font-black py-5 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:scale-95 disabled:opacity-50"
              >
                {isPending ? "PROCESSING..." : "CONFIRM SALE & PRINT"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Global CSS for Animations and Print */}
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #receipt, #receipt * { visibility: visible; }
          #receipt { position: absolute; left: 0; top: 0; width: 100%; }
        }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
