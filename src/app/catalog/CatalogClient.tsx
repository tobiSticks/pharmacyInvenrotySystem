"use client";

import React, { useState, useTransition } from "react";
import { updateProductAction, deleteProductAction } from "../actions";
import { createClient } from "@/utils/supabase/client";
import { 
  Package, 
  Trash2, 
  ChevronLeft, 
  Plus, 
  Save,
  Tag,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  X,
  Search,
  LogOut
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface CatalogProduct {
  id: string;
  name: string;
  sku: string;
  wholesale_price: number;
  retail_price: number;
  supermarket_price: number;
  quantity: number;
}

export default function CatalogClient({ initialProducts }: { initialProducts: CatalogProduct[] }) {
  const router = useRouter();
  const [products, setProducts] = useState(initialProducts);
  const [editedFields, setEditedFields] = useState<Record<string, { wholesale_price: number, retail_price: number, supermarket_price: number, quantity: number }>>({});
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [restockAmounts, setRestockAmounts] = useState<Record<string, string>>({});

  // Delete Modal State
  const [productToDelete, setProductToDelete] = useState<CatalogProduct | null>(null);

  // Search & Pagination
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const supabase = createClient();

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

  const handleFieldChange = (id: string, field: 'wholesale_price' | 'retail_price' | 'supermarket_price' | 'quantity', value: string) => {
    const numValue = field === 'quantity' ? parseInt(value) || 0 : parseFloat(value) || 0;
    const product = products.find(p => p.id === id);
    if (!product) return;

    setEditedFields(prev => {
      const currentEdits = prev[id] || { 
        wholesale_price: product.wholesale_price, 
        retail_price: product.retail_price, 
        supermarket_price: product.supermarket_price,
        quantity: product.quantity || 0
      };
      const newEdits = { ...currentEdits, [field]: numValue };
      
      // If values match exactly, we can remove the edit state for this product
      if (newEdits.wholesale_price === product.wholesale_price &&
          newEdits.retail_price === product.retail_price &&
          newEdits.supermarket_price === product.supermarket_price &&
          newEdits.quantity === product.quantity) {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      }
      
      return { ...prev, [id]: newEdits };
    });
  };

  const handleSave = (id: string) => {
    const edits = editedFields[id];
    if (!edits) return;

    startTransition(async () => {
      const result = await updateProductAction(null, {
        id,
        ...edits
      });

      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success as string });
        // Update local state to reflect saved changes
        setProducts(prev => prev.map(p => p.id === id ? { ...p, ...edits } : p));
        setEditedFields(prev => {
          const copy = { ...prev };
          delete copy[id];
          return copy;
        });
        setTimeout(() => setMessage(null), 3000);
      }
    });
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
        setProducts(prev => prev.map(p => p.id === productId ? { ...p, quantity: (p.quantity || 0) + amount } : p));
        setRestockAmounts(prev => {
          const copy = { ...prev };
          delete copy[productId];
          return copy;
        });
        setTimeout(() => setMessage(null), 3000);
      }
    });
  };

  const confirmDelete = () => {
    if (!productToDelete) return;

    startTransition(async () => {
      const result = await deleteProductAction(null, productToDelete.id);
      
      if (result.error) {
        setMessage({ type: 'error', text: result.error });
      } else {
        setMessage({ type: 'success', text: result.success as string });
        setProducts(prev => prev.filter(p => p.id !== productToDelete.id));
        setEditedFields(prev => {
          const copy = { ...prev };
          delete copy[productToDelete.id];
          return copy;
        });
        
        // Adjust pagination if needed
        if (displayedProducts.length === 1 && currentPage > 1) {
          setCurrentPage(prev => prev - 1);
        }
        
        setTimeout(() => setMessage(null), 3000);
      }
      setProductToDelete(null);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <Link href="/" className="text-slate-500 hover:text-rose-400 flex items-center gap-1 text-sm transition-colors mb-2 group w-fit">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Dashboard
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400">
              <Tag size={28} />
            </div>
            <div>
              <h1 className="text-4xl font-extrabold text-white tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-rose-400 to-orange-400">
                Price & Catalog Manager
              </h1>
              <p className="mt-1 text-slate-400 text-lg">
                Update selling prices across all channels or remove discontinued products.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 px-6 py-3 rounded-2xl font-black text-xs tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
          >
            <LogOut size={16} className="text-rose-500" /> SIGN OUT
          </button>
          
          <Link 
            href="/inventory/add"
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white font-bold py-3 px-6 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 shrink-0"
          >
            <Plus size={20} />
            Add New Product
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-3 p-4 bg-slate-900/50 backdrop-blur-md border border-slate-800 rounded-2xl w-full max-w-md group focus-within:border-indigo-500/50 transition-all shadow-lg">
        <Search size={18} className="text-slate-500 group-focus-within:text-indigo-400" />
        <input 
          type="text"
          placeholder="Search items by name or SKU..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="bg-transparent border-none outline-none text-slate-200 text-sm w-full placeholder-slate-500"
        />
      </div>

      {message && (
        <div className={`p-4 border rounded-2xl flex items-center gap-3 ${message.type === 'error' ? 'bg-red-500/10 border-red-500/30 text-red-400' : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'}`}>
          {message.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
          <span className="font-medium">{message.text}</span>
        </div>
      )}

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-950/50 border-b border-slate-800">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Product Detail</th>
                <th className="px-6 py-4 text-sm font-semibold text-indigo-400 whitespace-nowrap">Wholesale Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-emerald-400 whitespace-nowrap">Retail Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-purple-400 whitespace-nowrap">Supermarket Price</th>
                <th className="px-6 py-4 text-sm font-semibold text-amber-400 whitespace-nowrap">Warehouse Stock</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500 italic">
                    Catalog is empty. Add a product to get started.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((product) => {
                  const isEdited = !!editedFields[product.id];
                  return (
                    <tr key={product.id} className="group hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3 w-max">
                          <div className="p-2 bg-slate-950 rounded-lg border border-slate-800">
                            <Package size={20} className="text-slate-400" />
                          </div>
                          <div>
                            <div className="text-white font-medium">{product.name}</div>
                            <div className="text-xs text-slate-500 font-mono tracking-tighter uppercase">{product.sku}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₦</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedFields[product.id]?.wholesale_price ?? product.wholesale_price}
                            onChange={(e) => handleFieldChange(product.id, 'wholesale_price', e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg pl-7 pr-3 py-2 text-indigo-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-medium ${isEdited ? 'border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'border-slate-700/50'}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₦</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedFields[product.id]?.retail_price ?? product.retail_price}
                            onChange={(e) => handleFieldChange(product.id, 'retail_price', e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg pl-7 pr-3 py-2 text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all font-medium ${isEdited ? 'border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'border-slate-700/50'}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="relative w-32">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">₦</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={editedFields[product.id]?.supermarket_price ?? product.supermarket_price}
                            onChange={(e) => handleFieldChange(product.id, 'supermarket_price', e.target.value)}
                            className={`w-full bg-slate-950 border rounded-lg pl-7 pr-3 py-2 text-purple-300 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all font-medium ${isEdited ? 'border-orange-500/50 shadow-[0_0_10px_rgba(249,115,22,0.1)]' : 'border-slate-700/50'}`}
                          />
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-16 text-center font-bold text-amber-500 bg-amber-500/10 rounded-lg py-2 border border-amber-500/20">
                            {product.quantity || 0}
                          </div>
                          <div className="flex items-center bg-slate-950 border border-slate-700/50 rounded-lg overflow-hidden group-focus-within:border-amber-500/50 transition-all">
                            <input
                              type="number"
                              min="1"
                              placeholder="Add"
                              value={restockAmounts[product.id] || ""}
                              onChange={(e) => setRestockAmounts(prev => ({ ...prev, [product.id]: e.target.value }))}
                              className="w-16 px-2 py-2 bg-transparent text-white text-xs focus:outline-none placeholder:text-slate-700"
                            />
                            <button
                              onClick={() => handleRestock(product.id)}
                              disabled={isPending || !restockAmounts[product.id]}
                              className="p-2 bg-amber-600 hover:bg-amber-500 text-white disabled:opacity-30 transition-colors"
                              title="Restock"
                            >
                              <Plus size={14} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {isEdited && (
                            <button
                              onClick={() => handleSave(product.id)}
                              disabled={isPending}
                              className="p-2 border border-orange-500/50 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white rounded-lg transition-all shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-in zoom-in-90 disabled:opacity-50 flex items-center gap-2 px-4"
                            >
                              <Save size={16} /> <span className="text-sm font-bold">Save</span>
                            </button>
                          )}
                          <button
                            onClick={() => setProductToDelete(product)}
                            className="p-2 border border-slate-700 bg-slate-900 text-red-400 hover:bg-red-500 hover:border-red-500 hover:text-white rounded-lg transition-all"
                            title="Delete Product"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Details */}
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
              onClick={() => setCurrentPage(p => Math.min(Math.max(1, totalPages), p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6">
              <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
                <AlertTriangle size={32} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-bold text-center text-white mb-2">Delete Product</h3>
              <p className="text-center text-slate-400 mb-6">
                Are you sure you want to permanently delete <span className="text-white font-semibold">{productToDelete.name}</span>? This action will remove it from the warehouse and all channels. Cannot be undone.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setProductToDelete(null)}
                  disabled={isPending}
                  className="py-3 px-4 rounded-xl border border-slate-700 hover:bg-slate-800 text-slate-300 font-semibold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={isPending}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50"
                >
                  {isPending ? 'Deleting...' : 'Yes, Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
