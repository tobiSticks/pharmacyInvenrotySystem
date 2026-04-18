"use client";

import React, { useState, useActionState, useEffect } from "react";
import { distributeInventoryAction } from "../actions";
import { Package, Truck, ArrowRight, AlertCircle, CheckCircle2, ShoppingCart, Store, FlaskConical } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  product_balances: {
    wholesale_qty: number;
    retail_qty: number;
    supermarket_qty: number;
  } | null;
}

export default function DistributionClient({ initialProducts }: { initialProducts: any[] }) {
  const [distributions, setDistributions] = useState<Record<string, { wholesale: number; retail: number; supermarket: number }>>({});
  const [state, formAction, isPending] = useActionState(distributeInventoryAction, undefined);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  const totalPages = Math.ceil(initialProducts.length / itemsPerPage);
  const displayedProducts = initialProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleInputChange = (productId: string, channel: 'wholesale' | 'retail' | 'supermarket', value: string) => {
    const numValue = Math.max(0, parseInt(value) || 0);
    setDistributions(prev => ({
      ...prev,
      [productId]: {
        ... (prev[productId] || { wholesale: 0, retail: 0, supermarket: 0 }),
        [channel]: numValue
      }
    }));
  };

  const getProductDistribution = (productId: string) => distributions[productId] || { wholesale: 0, retail: 0, supermarket: 0 };

  const calculateTotal = (productId: string) => {
    const d = getProductDistribution(productId);
    return d.wholesale + d.retail + d.supermarket;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updates = Object.entries(distributions)
      .filter(([_, values]) => values.wholesale > 0 || values.retail > 0 || values.supermarket > 0)
      .map(([id, values]) => ({
        product_id: id,
        wholesale_diff: values.wholesale,
        retail_diff: values.retail,
        supermarket_diff: values.supermarket
      }));

    if (updates.length === 0) return;

    // Validation Check before send
    for (const update of updates) {
      const product = initialProducts.find(p => p.id === update.product_id);
      const totalRequested = update.wholesale_diff + update.retail_diff + update.supermarket_diff;
      if (product && totalRequested > product.quantity) {
        alert(`Cannot distribute ${totalRequested} items of ${product.name}. Only ${product.quantity} available in warehouse.`);
        return;
      }
    }

    formAction(updates as any);
  };

  useEffect(() => {
    if (state?.success) {
      setDistributions({});
    }
  }, [state]);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit}>
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-indigo-500/30">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/50 border-b border-slate-800">
                  <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Product Detail</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Warehouse Stock</th>
                  <th className="px-6 py-4 text-sm font-semibold text-indigo-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <FlaskConical size={16} /> Wholesale
                    </div>
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-emerald-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Store size={16} /> Retail
                    </div>
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-purple-400 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <ShoppingCart size={16} /> Supermarket
                    </div>
                  </th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {displayedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                      No products found in the warehouse. Add stock first.
                    </td>
                  </tr>
                ) : (
                  displayedProducts.map((product) => {
                    const totalDist = calculateTotal(product.id);
                    const isOverLimit = totalDist > product.quantity;

                    return (
                      <tr key={product.id} className="group hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-indigo-500/50 transition-colors">
                              <Package size={20} className="text-slate-400 group-hover:text-indigo-400" />
                            </div>
                            <div>
                              <div className="text-white font-medium">{product.name}</div>
                              <div className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{product.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`text-lg font-bold ${product.quantity < 20 ? 'text-amber-500' : 'text-slate-200'}`}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={distributions[product.id]?.wholesale || ''}
                            onChange={(e) => handleInputChange(product.id, 'wholesale', e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all placeholder-slate-800"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={distributions[product.id]?.retail || ''}
                            onChange={(e) => handleInputChange(product.id, 'retail', e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all placeholder-slate-800"
                          />
                        </td>
                        <td className="px-6 py-5">
                          <input
                            type="number"
                            min="0"
                            placeholder="0"
                            value={distributions[product.id]?.supermarket || ''}
                            onChange={(e) => handleInputChange(product.id, 'supermarket', e.target.value)}
                            className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-3 py-2 text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all placeholder-slate-800"
                          />
                        </td>
                        <td className="px-6 py-5">
                          {totalDist > 0 && (
                            <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-full border ${isOverLimit ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                              {isOverLimit ? <AlertCircle size={14} /> : <Truck size={14} />}
                              {isOverLimit ? 'Exceeds Stock' : `Shipping ${totalDist}`}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30 gap-4">
            <div className="text-sm text-slate-500">
              Showing <span className="text-slate-300 font-medium">
                {Math.min((currentPage - 1) * itemsPerPage + 1, initialProducts.length || 0)}
              </span> to <span className="text-slate-300 font-medium">
                {Math.min(currentPage * itemsPerPage, initialProducts.length)}
              </span> of <span className="text-slate-300 font-medium">
                {initialProducts.length}
              </span> products
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Previous
              </button>
              <span className="text-sm text-slate-400 px-2 font-medium">
                Page {currentPage} of {totalPages || 1}
              </span>
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(Math.max(1, totalPages), p + 1))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
              >
                Next
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 pt-4">
          <div className="flex-1">
            {state?.error && (
              <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 animate-in fade-in slide-in-from-left-4 duration-300">
                <AlertCircle size={20} />
                <span className="font-medium text-sm">{state.error}</span>
              </div>
            )}
            {state?.success && (
              <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 animate-in fade-in slide-in-from-left-4 duration-300">
                <CheckCircle2 size={20} />
                <span className="font-medium text-sm">{state.success}</span>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending || Object.keys(distributions).length === 0}
            className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold py-4 px-10 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                Processing Distribution...
              </span>
            ) : (
              <>
                <Truck size={22} className="group-hover:translate-x-1 transition-transform" />
                Distribute All Inventory
                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform opacity-50" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
