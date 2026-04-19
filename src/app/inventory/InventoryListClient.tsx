"use client";

import React, { useState } from "react";
import { Package, Search, LogOut } from "lucide-react";
import { createClient } from "@/utils/supabase/client";

export default function InventoryListClient({ products }: { products: any[] }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  const supabase = createClient();
  
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

  return (
    <div className="space-y-4">
      <div className="flex justify-end mb-2">
        <button 
          onClick={() => supabase.auth.signOut()}
          className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
        >
          <LogOut size={16} className="text-rose-500" /> SIGN OUT
        </button>
      </div>

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

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-sm">
          <thead className="bg-slate-950/50 sticky top-0 backdrop-blur-md">
            <tr>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[200px]">Product / SKU</th>
              <th className="px-6 py-4 text-slate-400 font-bold uppercase tracking-wider min-w-[120px]">Category</th>
              <th className="px-6 py-4 text-emerald-400 font-bold uppercase tracking-wider min-w-[100px]">Retail</th>
              <th className="px-6 py-4 text-indigo-400 font-bold uppercase tracking-wider min-w-[100px]">Wholesale</th>
              <th className="px-6 py-4 text-amber-400 font-bold uppercase tracking-wider min-w-[100px]">Stock Qty</th>
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
                    ${Number(product.retail_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 text-indigo-400 font-bold">
                    ${Number(product.wholesale_price).toFixed(2)}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border ${product.quantity <= product.min_stock_level ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-amber-500/10 text-amber-500 border-amber-500/30'}`}>
                      {product.quantity}
                    </span>
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
