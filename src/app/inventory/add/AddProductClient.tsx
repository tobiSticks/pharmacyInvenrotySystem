"use client";

import React, { useState, useActionState, useRef } from "react";
import { batchAddProductsAction } from "../../actions";
import { 
  PackagePlus, 
  Upload, 
  FileSpreadsheet, 
  FileJson, 
  ArrowLeft, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle,
  Table as TableIcon,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import Link from "next/link";
import Papa from "papaparse";
import * as XLSX from "xlsx";

type Mode = "manual" | "bulk";

export default function AddProductClient() {
  const [mode, setMode] = useState<Mode>("manual");
  const [bulkData, setBulkData] = useState<any[]>([]);
  const [state, formAction, isPending] = useActionState(batchAddProductsAction, undefined);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Manual Form State
  const [manualProduct, setManualProduct] = useState({
    name: "",
    sku: "",
    category_name: "",
    product_form: "",
    retail_price: "",
    wholesale_price: "",
    supermarket_price: "",
    cost_price: "",
    quantity: "",
    expiry_date: "",
    batch_number: "",
    min_stock_level: "10"
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    React.startTransition(() => {
      formAction([manualProduct] as any);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results: Papa.ParseResult<any>) => {
          processRawData(results.data);
        }
      });
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        processRawData(data);
      };
      reader.readAsBinaryString(file);
    }
  };

  const processRawData = (data: any[]) => {
    const mapped = data.map(row => {
      const cleaned: any = {};
      Object.entries(row).forEach(([key, value]) => {
        const normalizedKey = key.trim().toLowerCase().replace(/\s+/g, '_');
        
        let finalValue = value;
        // Convert Excel serial dates if the key is related to expiry
        if (normalizedKey.includes('expiry') && typeof value === 'number') {
          const date = XLSX.SSF.parse_date_code(value);
          finalValue = `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
        
        cleaned[normalizedKey] = finalValue;
      });
      return cleaned;
    });
    setBulkData(mapped);
  };

  const handleBulkSubmit = () => {
    if (bulkData.length === 0) return;
    React.startTransition(() => {
      formAction(bulkData);
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Link href="/inventory-distribution" className="text-slate-500 hover:text-indigo-400 flex items-center gap-1 text-sm transition-colors mb-2 group">
            <ChevronLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> Back to Distribution
          </Link>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">Accept New Stock</h1>
        </div>

        <div className="flex p-1 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setMode("manual")}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${mode === "manual" ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Manual Entry
          </button>
          <button 
            onClick={() => setMode("bulk")}
            className={`px-6 py-2 rounded-xl text-sm font-semibold transition-all ${mode === "bulk" ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
          >
            Bulk Upload
          </button>
        </div>
      </div>

      {state?.error && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 flex items-center gap-3">
          <AlertCircle size={20} />
          <span className="font-medium text-sm">{state.error}</span>
        </div>
      )}

      {state?.success && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-400 flex items-center gap-3">
          <CheckCircle2 size={20} />
          <span className="font-medium text-sm">{state.success}</span>
        </div>
      )}

      {mode === "manual" ? (
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleManualSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Product Info */}
              <div className="space-y-4">
                <h3 className="text-indigo-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <PackagePlus size={14} /> General Information
                </h3>
                <div className="space-y-4">
                  <InputField label="Product Name" value={manualProduct.name} onChange={v => setManualProduct({...manualProduct, name: v})} placeholder="Antibiotic Tablet..." required />
                  <InputField label="SKU / Barcode" value={manualProduct.sku} onChange={v => setManualProduct({...manualProduct, sku: v})} placeholder="ABC-123-XYZ" required />
                  <InputField label="Category" value={manualProduct.category_name} onChange={v => setManualProduct({...manualProduct, category_name: v})} placeholder="Medicine, Healthcare..." />
                  <InputField label="Form" value={manualProduct.product_form} onChange={v => setManualProduct({...manualProduct, product_form: v})} placeholder="Tablet, Syrup, Injection..." />
                </div>
              </div>

              {/* Pricing */}
              <div className="space-y-4">
                <h3 className="text-emerald-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  $ Pricing (USD)
                </h3>
                <div className="space-y-4">
                  <InputField label="Retail Price" type="number" step="0.01" value={manualProduct.retail_price} onChange={v => setManualProduct({...manualProduct, retail_price: v})} placeholder="0.00" />
                  <InputField label="Wholesale Price" type="number" step="0.01" value={manualProduct.wholesale_price} onChange={v => setManualProduct({...manualProduct, wholesale_price: v})} placeholder="0.00" />
                  <InputField label="Supermarket Price" type="number" step="0.01" value={manualProduct.supermarket_price} onChange={v => setManualProduct({...manualProduct, supermarket_price: v})} placeholder="0.00" />
                  <InputField label="Cost Price" type="number" step="0.01" value={manualProduct.cost_price} onChange={v => setManualProduct({...manualProduct, cost_price: v})} placeholder="0.00" />
                </div>
              </div>

              {/* Inventory & Dates */}
              <div className="space-y-4">
                <h3 className="text-amber-400 text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  📦 Stock & Traceability
                </h3>
                <div className="space-y-4">
                  <InputField label="Initial Quantity" type="number" value={manualProduct.quantity} onChange={v => setManualProduct({...manualProduct, quantity: v})} placeholder="100" required />
                  <InputField label="Min Stock Level" type="number" value={manualProduct.min_stock_level} onChange={v => setManualProduct({...manualProduct, min_stock_level: v})} placeholder="10" />
                  <InputField label="Expiry Date" type="date" value={manualProduct.expiry_date} onChange={v => setManualProduct({...manualProduct, expiry_date: v})} />
                  <InputField label="Batch Number" value={manualProduct.batch_number} onChange={v => setManualProduct({...manualProduct, batch_number: v})} placeholder="BTCH-2024-X" />
                </div>
              </div>
            </div>

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={isPending}
                className="w-full md:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-12 rounded-2xl shadow-xl transition-all hover:-translate-y-1 active:translate-y-0 disabled:opacity-50"
              >
                {isPending ? "Adding Product..." : "Add to Warehouse"}
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-slate-900/50 backdrop-blur-xl border-2 border-dashed border-slate-800 rounded-3xl p-12 text-center group hover:border-indigo-500/50 transition-colors cursor-pointer" onClick={() => fileInputRef.current?.click()}>
            <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".csv,.xlsx,.xls" className="hidden" />
            <div className="mx-auto w-20 h-20 bg-indigo-500/10 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <Upload className="text-indigo-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Drag & Drop or Click to Upload</h2>
            <p className="text-slate-500">Suppports CSV and Excel (.xlsx, .xls) files</p>
            <div className="mt-8 flex items-center justify-center gap-4">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <FileSpreadsheet size={16} className="text-emerald-400" /> Excel
              </div>
              <div className="flex items-center gap-2 text-xs font-bold text-slate-400 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <FileJson size={16} className="text-amber-400" /> CSV
              </div>
            </div>
          </div>

          {bulkData.length > 0 && (
            <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
              <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/10 rounded-xl">
                    <TableIcon size={20} className="text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white font-serif">Data Preview</h3>
                    <p className="text-xs text-slate-500 tracking-wide uppercase font-bold">{bulkData.length} records ready for import</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setBulkData([])} className="px-4 py-2 text-sm font-semibold text-slate-400 hover:text-white transition-colors">Clear</button>
                  <button 
                    onClick={handleBulkSubmit}
                    disabled={isPending}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-8 rounded-xl shadow-lg transition-all hover:-translate-y-1 disabled:opacity-50"
                  >
                    {isPending ? "Importing..." : "Confirm & Import All"}
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-slate-950/50 sticky top-0 backdrop-blur-md">
                    <tr>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[150px]">Name</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[120px]">SKU</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[120px]">Category</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[100px]">Form</th>
                      <th className="px-4 py-3 text-emerald-500 font-bold uppercase tracking-wider min-w-[100px]">Retail</th>
                      <th className="px-4 py-3 text-indigo-500 font-bold uppercase tracking-wider min-w-[100px]">Wholesale</th>
                      <th className="px-4 py-3 text-rose-500 font-bold uppercase tracking-wider min-w-[100px]">Supermkt</th>
                      <th className="px-4 py-3 text-purple-500 font-bold uppercase tracking-wider min-w-[100px]">Cost</th>
                      <th className="px-4 py-3 text-amber-500 font-bold uppercase tracking-wider min-w-[80px]">Qty</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[120px]">Exp Date</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[120px]">Batch #</th>
                      <th className="px-4 py-3 text-slate-500 font-bold uppercase tracking-wider min-w-[80px]">Min</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {bulkData.slice(0, 50).map((row, i) => (
                      <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-4 py-3 text-slate-300 font-medium">{row.name || row.product_name}</td>
                        <td className="px-4 py-3 text-slate-400 font-mono">{row.sku}</td>
                        <td className="px-4 py-3 text-slate-500">{row.category_name}</td>
                        <td className="px-4 py-3 text-slate-500">{row.product_form}</td>
                        <td className="px-4 py-3 text-emerald-400 font-bold">${row.retail_price}</td>
                        <td className="px-4 py-3 text-indigo-400 font-bold">${row.wholesale_price}</td>
                        <td className="px-4 py-3 text-rose-400 font-bold">${row.supermarket_price}</td>
                        <td className="px-4 py-3 text-purple-400 font-bold">${row.cost_price}</td>
                        <td className="px-4 py-3 text-amber-500 font-bold">{row.quantity}</td>
                        <td className="px-4 py-3 text-slate-500">{row.expiry_date}</td>
                        <td className="px-4 py-3 text-slate-500 font-mono">{row.batch_number}</td>
                        <td className="px-4 py-3 text-slate-500">{row.min_stock_level}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {bulkData.length > 50 && (
                  <div className="p-4 text-center text-slate-500 text-xs italic bg-slate-950/30 border-t border-slate-800/50">
                    Showing first 50 of {bulkData.length} records...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InputField({ label, type = "text", value, onChange, placeholder, required = false, step = "1" }: { label: string, type?: string, value: string, onChange: (v: string) => void, placeholder?: string, required?: boolean, step?: string }) {
  return (
    <div className="space-y-2">
      <label className="text-xs font-semibold text-slate-500 tracking-wide px-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        required={required}
        step={step}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full bg-slate-950/50 border border-slate-800/60 rounded-xl px-4 py-3 text-slate-200 placeholder-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500/50 transition-all font-medium"
        placeholder={placeholder}
      />
    </div>
  );
}
