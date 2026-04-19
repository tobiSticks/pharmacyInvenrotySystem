"use client";

import React, { useState, useTransition } from "react";
import { Package, Search, Plus, AlertCircle, CheckCircle2 } from "lucide-react";
import { restockProductAction } from "../actions";

export default function InventoryListClient({ products }: { products: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const itemsPerPage = 15;
  
  const safeProducts = products || [];

  const filteredProducts = safeProducts.filter(product => {
    const searchLower = searchTerm.toLowerCase();
    return (
      product.name?.toLowerCase().includes(searchLower) ||
      product.sku?.toLowerCase().includes(searchLower) ||
      product.category_name?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const displayedProducts = filteredProducts.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page on search
  };

  const handleRestock = (productId: string) => {
    const amount = parseInt(restockAmounts[productId] || "0");
    if (!amount || amount <= 0) return;

    startTransition(async () => {
      const result = await restockProductAction(null, { productId, quantityToAdd: amount });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success as string });
        // Local update
        const product = safeProducts.find(p => p.id === productId);
        if (product) {
          product.quantity = (product.quantity || 0) + amount;
        }
        setRestockAmounts(prev => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl w-full max-w-md group focus-within:border-indigo-500/50 transition-all shadow-lg">
        <Search size={18} className="text-slate-500 group-focus-within:text-indigo-400" />
        <input 
          type="text"
          placeholder="Search items by name, SKU or category..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-500"
        />
      </div>

      {message && (
        <div className={`p-4 border rounded-2xl flex items-center gap-3 animate-in slide-in-from-top-2 duration-300 ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-950/50 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[200px]">Product / SKU</th>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[120px]">Category</th>
              <th className="px-6 py-4 text-emerald-400 font-bold uppercase tracking-wider min-w-[100px]">Retail</th>
              <th className="px-6 py-4 text-indigo-400 font-bold uppercase tracking-wider min-w-[100px]">Wholesale</th>
              <th className="px-6 py-4 text-amber-400 font-bold uppercase tracking-wider min-w-[120px]">Stock Qty</th>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[150px]">Restock</th>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[120px]">Exp Date</th>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[120px]">Batch #</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {displayedProducts.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-slate-500 italic">
                  No products found. Import products to see them here.
                </td>
              </tr>
            ) : (
              displayedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-slate-800/30 transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-950 rounded-lg border border-slate-800 group-hover:border-indigo-500/50 transition-colors">
                        <Package size={16} className="text-slate-400 group-hover:text-indigo-400" />
                      </div>
                      <div>
                        <div className="text-white font-medium">{product.name}</div>
                        <div className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{product.sku}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-400">
                    <div>{product.category_name || '-'}</div>
                    <div className="text-xs text-slate-600">{product.product_form}</div>
                  </td>
                  <td className="px-6 py-4 text-emerald-400 font-bold">
                    ₦{Number(product.retail_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-indigo-400 font-bold">
                    ₦{Number(product.wholesale_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${product.quantity <= (product.min_stock_level || 10) ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center bg-slate-950 border border-slate-700/50 rounded-lg overflow-hidden focus-within:border-emerald-500/50 transition-all max-w-[120px]">
                      <input
                        type="number"
                        min="1"
                        placeholder="Add"
                        value={restockAmounts[product.id] || ""}
                        onChange={(e) => setRestockAmounts(prev => ({ ...prev, [product.id]: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-700"
                      />
                      <button
                        onClick={() => handleRestock(product.id)}
                        disabled={isPending || !restockAmounts[product.id]}
                        className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-30 transition-colors"
                        title="Add to Stock"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-slate-300">
                    {product.expiry_date ? new Date(product.expiry_date).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-slate-400 font-mono text-xs">
                    {product.batch_number || '-'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-950/30 gap-4">
        <div className="text-sm text-slate-500">
          Showing <span className="text-slate-300 font-medium">
            {Math.min((currentPage - 1) * itemsPerPage + 1, filteredProducts.length || 0)}
          </span> to <span className="text-slate-300 font-medium">
            {Math.min(currentPage * itemsPerPage, filteredProducts.length)}
          </span> of <span className="text-slate-300 font-medium">
            {filteredProducts.length}
          </span> products {searchTerm && <span className="text-indigo-400 font-medium">(filtered)</span>}
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
    </div>
  );
}
