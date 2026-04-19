"use client";
 
import React, { useState, useActionState, useEffect, useTransition } from "react";
import { distributeInventoryAction, getInventoryAction } from "../actions";
import { Package, Truck, ArrowRight, AlertCircle, CheckCircle2, ShoppingCart, Store, FlaskConical, Search, MapPin } from "lucide-react";

interface Product {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  product_balances?: {
    wholesale_qty: number;
    retail_qty: number;
    supermarket_qty: number;
    branch_id: string;
  } | null;
}

interface Branch {
  id: string;
  name: string;
}

export default function DistributionClient({ initialProducts, branches }: { initialProducts: Product[], branches: Branch[] }) {
  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [products, setProducts] = useState(initialProducts);
  const [distributions, setDistributions] = useState<Record<string, { wholesale: number; retail: number; supermarket: number }>>({});
  const [isRefreshing, startRefreshing] = useTransition();

  const [state, formAction, isPending] = useActionState(distributeInventoryAction, undefined);

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // Refresh products when branch changes
  useEffect(() => {
    if (selectedBranchId) {
      startRefreshing(async () => {
        const updatedProducts = await getInventoryAction(selectedBranchId);
        setProducts(updatedProducts);
      });
    } else {
      setProducts(initialProducts);
    }
    setDistributions({}); // Clear inputs on branch change
  }, [selectedBranchId, initialProducts]);

  const filteredProducts = products.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

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
    if (!selectedBranchId) return;

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
      const product = products.find(p => p.id === update.product_id);
      const totalRequested = update.wholesale_diff + update.retail_diff + update.supermarket_diff;
      if (product && totalRequested > product.quantity) {
        alert(`Cannot distribute ${totalRequested} items of ${product.name}. Only ${product.quantity} available in warehouse.`);
        return;
      }
    }

    formAction({ updates, branchId: selectedBranchId } as any);
  };

  useEffect(() => {
    if (state?.success) {
      setDistributions({});
      // Refresh current stock levels
      if (selectedBranchId) {
        startRefreshing(async () => {
          const updatedProducts = await getInventoryAction(selectedBranchId);
          setProducts(updatedProducts);
        });
      }
    }
  }, [state, selectedBranchId]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Branch Selector */}
        <div className="flex flex-col gap-2">
           <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
            <MapPin size={16} className="text-indigo-400" /> Select Destination Branch
          </label>
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full h-12 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl px-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 appearance-none transition-all"
            >
              <option value="">Choose a branch...</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-xs">▼</div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-slate-400 flex items-center gap-2">
            <Search size={16} className="text-indigo-400" /> Filter Warehouse Items
          </label>
          <div className="flex items-center gap-3 h-12 px-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl w-full group focus-within:border-indigo-500/50 transition-all">
            <Search size={18} className="text-slate-500 group-focus-within:text-indigo-400" />
            <input 
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="bg-transparent border-none outline-none text-white text-sm w-full placeholder-slate-500"
            />
          </div>
        </div>
      </div>

      {!selectedBranchId && (
        <div className="p-12 border-2 border-dashed border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-slate-900/10">
          <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-500">
            <MapPin size={32} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">
              {branches.length === 0 ? "No Branches Found" : "Select a Target Branch"}
            </h3>
            <p className="text-slate-500 max-w-sm mx-auto mt-2">
              {branches.length === 0 
                ? "You haven't added any pharmacy locations yet. Head back to the Main Dashboard to create your first branch."
                : "Please choose a pharmacy branch from the dropdown above to start distributing stock from the central warehouse."
              }
            </p>
          </div>
        </div>
      )}

      {selectedBranchId && (
        <form onSubmit={handleSubmit} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-indigo-500/30">
            <div className={`overflow-x-auto ${isRefreshing ? 'opacity-50 pointer-events-none' : ''} transition-opacity duration-300`}>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950/50 border-b border-slate-800 text-xs font-bold text-slate-500">
                    <th className="px-6 py-4 uppercase tracking-wider">Product Detail</th>
                    <th className="px-6 py-4 uppercase tracking-wider">Warehouse Stock</th>
                    <th className="px-6 py-4 text-indigo-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <FlaskConical size={14} /> Wholesale
                      </div>
                    </th>
                    <th className="px-6 py-4 text-emerald-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <Store size={14} /> Retail
                      </div>
                    </th>
                    <th className="px-6 py-4 text-purple-400 uppercase tracking-wider">
                      <div className="flex items-center gap-2">
                        <ShoppingCart size={14} /> Supermarket
                      </div>
                    </th>
                    <th className="px-6 py-4 uppercase tracking-wider">Total Distribution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {displayedProducts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                        No products found. Adjust your search or add items to the warehouse.
                      </td>
                    </tr>
                  ) : (
                    displayedProducts.map((product) => {
                      const totalDist = calculateTotal(product.id);
                      const isOverLimit = totalDist > product.quantity;
                      const balances = product.product_balances || { wholesale_qty: 0, retail_qty: 0, supermarket_qty: 0 };

                      return (
                        <tr key={product.id} className="group hover:bg-slate-800/20 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 shadow-sm transition-colors group-hover:border-indigo-500/30">
                                <Package size={18} className="text-slate-400 group-hover:text-indigo-400" />
                              </div>
                              <div>
                                <div className="text-white font-semibold">{product.name}</div>
                                <div className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{product.sku}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-col">
                              <span className={`text-base font-bold ${product.quantity < 10 ? 'text-rose-500' : 'text-slate-200'}`}>
                                {product.quantity}
                              </span>
                              <span className="text-[10px] text-slate-500 uppercase font-medium">Available</span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={distributions[product.id]?.wholesale || ''}
                                onChange={(e) => handleInputChange(product.id, 'wholesale', e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-2 py-1.5 text-indigo-300 focus:ring-1 focus:ring-indigo-500/50 text-sm transition-all outline-none"
                              />
                              <div className="text-[9px] text-slate-600 font-bold uppercase pl-1">In Branch: {balances.wholesale_qty}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={distributions[product.id]?.retail || ''}
                                onChange={(e) => handleInputChange(product.id, 'retail', e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-2 py-1.5 text-emerald-300 focus:ring-1 focus:ring-emerald-500/50 text-sm transition-all outline-none"
                              />
                              <div className="text-[9px] text-slate-600 font-bold uppercase pl-1">In Branch: {balances.retail_qty}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <input
                                type="number"
                                min="0"
                                placeholder="0"
                                value={distributions[product.id]?.supermarket || ''}
                                onChange={(e) => handleInputChange(product.id, 'supermarket', e.target.value)}
                                className="w-24 bg-slate-950 border border-slate-700/50 rounded-lg px-2 py-1.5 text-purple-300 focus:ring-1 focus:ring-purple-500/50 text-sm transition-all outline-none"
                              />
                              <div className="text-[9px] text-slate-600 font-bold uppercase pl-1">In Branch: {balances.supermarket_qty}</div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {totalDist > 0 ? (
                              <div className={`flex items-center gap-2 text-[10px] font-bold px-3 py-1.5 rounded-full border shadow-sm animate-in zoom-in-95 ${isOverLimit ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'}`}>
                                {isOverLimit ? <AlertCircle size={12} /> : <Truck size={12} />}
                                {isOverLimit ? 'EXCEEDS WH' : `SENDING ${totalDist}`}
                              </div>
                            ) : (
                              <span className="text-slate-700 text-[10px] font-bold pl-3">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30 gap-4">
              <div className="text-xs text-slate-500 flex items-center gap-2">
                <span>
                  Showing <b>{Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length || 0)}</b> to <b>{Math.min(currentPage * itemsPerPage, filteredProducts.length)}</b> of <b>{filteredProducts.length}</b> products
                </span>
                {searchTerm && <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-500/20 font-bold">Filtered</span>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                >
                  Prev
                </button>
                <span className="text-xs text-slate-500 px-2 font-bold">
                  {currentPage} / {totalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.min(Math.max(1, totalPages), p + 1))}
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition-all text-xs font-bold"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-6">
            <div className="flex-1">
              {state?.error && (
                <div className="flex items-center gap-2 p-4 bg-rose-500/10 border border-rose-500/30 rounded-2xl text-rose-400 animate-in fade-in slide-in-from-left-4 duration-300 shadow-lg">
                  <AlertCircle size={20} />
                  <span className="font-bold text-sm">{state.error}</span>
                </div>
              )}
              {state?.success && (
                <div className="flex items-center gap-2 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 animate-in fade-in slide-in-from-left-4 duration-300 shadow-lg">
                  <CheckCircle2 size={20} />
                  <span className="font-bold text-sm">{state.success}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isPending || Object.keys(distributions).length === 0}
              className="group relative inline-flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-emerald-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-black py-4 px-12 rounded-2xl shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:-translate-y-1 active:translate-y-0"
            >
              {isPending ? (
                <span className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  PROCESSING...
                </span>
              ) : (
                <>
                  <Truck size={22} className="group-hover:translate-x-1 transition-transform" />
                  CONFIRM DISTRIBUTION
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform opacity-50" />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
