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
  Wallet
} from "lucide-react";
import Link from "next/link";
import { createRetailTransactionAction, submitDailyAuditAction, checkAuditStatusAction } from "../../actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  retail_price: number;
  quantity: number;
}

const CATEGORIES = ["All", "Capsule", "Caplet", "Tablet", "Tubes", "Injections"];

export default function RetailPOSClient({ initialProducts, branchName, branchId, userProfile }: any) {
  const router = useRouter();
  const supabase = createClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [checkoutSuccess, setCheckoutSuccess] = useState<any>(null);
  const [auditPending, setAuditPending] = useState(false);

  useEffect(() => {
    async function checkAudit() {
      const { hasSales, isAudited } = await checkAuditStatusAction();
      if (hasSales && !isAudited) {
        setAuditPending(true);
      } else {
        setAuditPending(false);
      }
    }
    checkAudit();
  }, [checkoutSuccess]);

  const [checkoutData, setCheckoutData] = useState({
    sellerName: userProfile?.full_name || userProfile?.email?.split('@')[0] || "Manager",
    buyerName: "",
    date: new Date().toISOString().split('T')[0]
  });

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category_name?.toLowerCase() === selectedCategory.toLowerCase() || p.product_form?.toLowerCase() === selectedCategory.toLowerCase();
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
        retail_price: Number(product.retail_price),
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

  const cartTotal = cart.reduce((acc, item) => acc + (item.retail_price * item.quantity), 0);

  const handleCheckout = () => {
    if (!checkoutData.buyerName) {
      alert("Please enter buyer name");
      return;
    }

    for (const item of cart) {
      const product = initialProducts.find((p: any) => p.id === item.id);
      const stock = product?.retail_qty || 0;
      const requested = item.quantity;
      
      if (requested > stock) {
        alert(`Cannot checkout: Insufficient retail stock for ${item.name}. (Available: ${stock}, Requested: ${requested})`);
        return;
      }
    }

    startTransition(async () => {
      const result = await createRetailTransactionAction(null, {
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

  const printReceipt = () => {
    window.print();
  };

  if (checkoutSuccess) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="bg-white text-slate-900 w-full max-w-md p-8 rounded-none shadow-2xl print:m-0 print:p-4 print:shadow-none" id="receipt">
          <div className="text-center border-b-2 border-dashed border-slate-300 pb-6 mb-6">
            <div className="inline-block bg-rose-600 text-white text-[10px] font-black px-4 py-1 rounded-full mb-3 tracking-widest animate-pulse">PENDING PAYMENT AT CASHIER</div>
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 font-serif text-emerald-700">PHARMA RETAIL</h2>
            <p className="text-sm font-bold text-slate-500 uppercase">{branchName} - RETAIL POS</p>
            <p className="text-xs text-slate-400 mt-2">{new Date(checkoutSuccess.date).toLocaleString()}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-widest">Transaction ID:</span>
              <span className="font-mono font-bold text-emerald-600">{checkoutSuccess.transactionId.split('-')[0]}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-500">SELLER:</span>
              <span className="font-bold text-slate-900">{checkoutSuccess.sellerName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-bold text-slate-500">BUYER:</span>
              <span className="font-bold text-slate-900">{checkoutSuccess.buyerName}</span>
            </div>
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
                    <div className="text-[10px] text-slate-400 font-mono tracking-tighter uppercase">{item.sku}</div>
                  </td>
                  <td className="py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    ₦{(item.retail_price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-4 border-double border-slate-900 pt-4 mb-10">
            <div className="flex justify-between items-center">
              <span className="text-xl font-black tracking-tight">TOTAL</span>
              <span className="text-3xl font-black tracking-tighter text-emerald-600">₦{checkoutSuccess.total.toFixed(2)}</span>
            </div>
          </div>

          {/* MOCK BARCODE */}
          <div className="flex flex-col items-center gap-2 border-t border-slate-100 pt-8">
            <div className="flex items-end gap-[1px] h-12 mb-2">
              {[...Array(30)].map((_, i) => (
                <div 
                  key={i} 
                  className="bg-black" 
                  style={{ width: `${Math.random() > 0.5 ? 2 : 1}px`, height: `${60 + Math.random() * 40}%` }}
                />
              ))}
            </div>
            <div className="text-[10px] font-mono font-bold tracking-[0.4em] uppercase text-slate-400">
              *{checkoutSuccess.transactionId.substring(0, 8)}*
            </div>
          </div>
          
          <p className="text-center text-[10px] text-slate-400 mt-8 italic">Please proceed to the cashier for payment</p>
        </div>

        <div className="mt-8 flex gap-4 print:hidden">
          <button 
            onClick={printReceipt}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
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
    <div className="min-h-screen bg-slate-950 flex flex-col xl:flex-row font-sans selection:bg-emerald-500/30">
      {/* Left Panel: Catalog */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-emerald-500/10 rounded-3xl border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]">
              <Building2 className="text-emerald-400" size={32} />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-black text-white tracking-tight">{branchName}</h1>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 px-3 py-1.5 rounded-xl font-bold text-[10px] tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 whitespace-nowrap"
                >
                  <LogOut size={12} className="text-rose-500" /> SIGN OUT
                </button>
              </div>
              <div className="flex items-center gap-2 text-slate-500 mt-1 uppercase text-xs font-black tracking-widest">
                <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md border border-emerald-500/20">Retail POS</span>
                <ChevronRight size={14} />
                <span className="flex items-center gap-1"><User size={12} /> {userProfile?.full_name || "Manager"}</span>
              </div>
            </div>
          </div>

          <div className="flex-1 max-w-xl">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-emerald-400 transition-colors" size={20} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search retail inventory..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all font-medium placeholder-slate-700"
              />
            </div>
          </div>
        </header>

        {/* Categories */}
        <div className="px-6 md:px-8 pb-8 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <Filter className="text-slate-600 mr-2 flex-shrink-0" size={20} />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 'bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
          {filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-20 text-center opacity-50 grayscale">
              <Package size={80} className="text-slate-700 mb-6" />
              <h2 className="text-3xl font-black text-slate-600">Fresh Stock Needed</h2>
              <p className="text-slate-700 mt-2 text-lg max-w-sm mx-auto">
                No retail items available. Ask your admin to distribute stock to the retail pharmacy.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredProducts.map((p: any) => (
                <div 
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-emerald-500/50 rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative overflow-hidden active:scale-95"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Package size={100} />
                  </div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                      {p.category_name || "General"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 font-bold tracking-tighter">
                      #{p.sku}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors line-clamp-1">{p.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-widest">{p.product_form || 'Medicine'}</p>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Retail Price</div>
                        <div className="text-2xl font-black text-white">₦{Number(p.retail_price).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">In Stock</div>
                        <div className={`text-lg font-black ${p.retail_qty > 20 ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {p.retail_qty || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel: Cart */}
      <div className="w-full xl:w-[450px] bg-slate-900/40 backdrop-blur-2xl border-l border-slate-800 flex flex-col shadow-[-20px_0_50px_rgba(0,0,0,0.5)]">
        <div className="p-8 pb-4">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-white flex items-center gap-3">
              <ShoppingCart className="text-emerald-400" size={24} /> Retail Cart
            </h2>
            <div className="px-3 py-1 bg-emerald-500 text-white rounded-full text-xs font-black">
              {cart.length} ITEMS
            </div>
          </div>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto px-8 space-y-6">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center opacity-30">
              <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
                <ShoppingCart size={32} />
              </div>
              <p className="text-lg font-bold text-slate-500">Retail cart is empty</p>
              <p className="text-sm text-slate-600 mt-1">Select medicines to start selling</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-bold">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{item.sku}</p>
                  </div>
                  <button 
                    onClick={() => updateCartQty(item.id, 0)}
                    className="p-1.5 text-slate-700 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                    <button 
                      onClick={() => updateCartQty(item.id, item.quantity - 1)}
                      className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus size={18} />
                    </button>
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartQty(item.id, parseInt(e.target.value) || 1)}
                      className="w-16 bg-transparent text-center text-white font-black text-lg focus:outline-none"
                    />
                    <button 
                      onClick={() => updateCartQty(item.id, item.quantity + 1)}
                      className="w-10 h-10 flex items-center justify-center text-emerald-400 hover:text-white transition-colors"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  
                  <div className="text-right">
                    <span className="text-lg font-black text-white">₦{(item.retail_price * item.quantity).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-950/80 border-t border-slate-800">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <span>Subtotal</span>
              <span className="text-white">₦{(cartTotal).toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-500 font-bold uppercase text-[10px] tracking-widest">
              <span>Tax (VA)</span>
              <span className="text-white">₦0.00</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-900">
              <span className="text-xl font-black text-white tracking-tight uppercase">Grand Total</span>
              <span className="text-3xl font-black text-emerald-400 tracking-tighter">₦{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || isPending}
            onClick={() => setIsCheckingOut(true)}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 px-6 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:hover:translate-y-0 flex items-center justify-center gap-3 text-lg"
          >
            {isPending ? "Processing..." : "PROCEED TO CHECKOUT"}
            {!isPending && <ChevronRight size={24} />}
          </button>
        </div>
      </div>

      {/* Checkout Modal Overlay */}
      {isCheckingOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsCheckingOut(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="flex items-center gap-4 mb-8">
              <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
                <Wallet className="text-emerald-400" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Checkout</h2>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Finalize retail sale</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Seller Name</label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      value={checkoutData.sellerName}
                      onChange={e => setCheckoutData({...checkoutData, sellerName: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all font-bold"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Sale Date</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                    <input 
                      type="date"
                      value={checkoutData.date}
                      onChange={e => setCheckoutData({...checkoutData, date: e.target.value})}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Customer / Buyer Name</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    placeholder="Enter customer name..."
                    value={checkoutData.buyerName}
                    onChange={e => setCheckoutData({...checkoutData, buyerName: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500/50 transition-all font-bold placeholder-slate-800"
                  />
                </div>
              </div>

              <div className="bg-slate-950/50 border border-slate-800 rounded-2xl p-6 mt-4">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Total Payable</span>
                    <span className="text-3xl font-black text-white tracking-tighter">₦{cartTotal.toLocaleString()}</span>
                  </div>
                  <div className="text-right">
                    <span className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Items</span>
                    <span className="text-xl font-bold text-slate-400">{cart.length} Unit(s)</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-4">
              <button 
                onClick={() => setIsCheckingOut(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-black py-5 rounded-2xl transition-all"
              >
                CANCEL
              </button>
              <button 
                onClick={handleCheckout}
                disabled={isPending}
                className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-2xl shadow-[0_10px_40px_rgba(16,185,129,0.3)] transition-all hover:-translate-y-1 flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isPending ? "GENERATING RECEIPT..." : "CONFIRM & GENERATE RECEIPT"}
                {!isPending && <CheckCircle2 size={24} />}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Audit Button (Floating bottom) */}
      <div className="fixed bottom-8 left-8 print:hidden group">
        {auditPending && (
          <div className="absolute -top-12 left-0 bg-rose-600 text-white text-[10px] font-black px-4 py-2 rounded-xl shadow-xl animate-bounce whitespace-nowrap">
            ⚠️ AUDIT SUBMISSION PENDING
          </div>
        )}
        <button 
          disabled={isPending}
          onClick={() => {
            if(confirm("Submit all current sales for today's audit?")) {
               startTransition(async () => {
                 const result = await submitDailyAuditAction();
                 if (result.success) {
                   alert(result.success);
                   setAuditPending(false);
                 } else {
                   alert(result.error);
                 }
               });
            }
          }}
          className={`px-6 py-3 rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2 disabled:opacity-50 ${auditPending ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800'}`}
        >
          <LogOut size={16} className={auditPending ? "text-white" : "text-orange-500"} /> {isPending ? "SUBMITTING..." : "SUBMIT DAILY SALES TO CASHIER"}
        </button>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt, #receipt * {
            visibility: visible;
          }
          #receipt {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        input::-webkit-outer-spin-button,
        input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>
    </div>
  );
}
