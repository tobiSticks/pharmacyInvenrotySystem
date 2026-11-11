"use client";

import React, { useState, useMemo, useTransition, useEffect, useRef } from "react";
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
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  HelpCircle,
  Sparkles
} from "lucide-react";
import Link from "next/link";
import { createWholesaleTransactionAction, submitDailyAuditAction, checkAuditStatusAction } from "../../actions";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

interface CartItem {
  id: string;
  name: string;
  sku: string;
  wholesale_price: number;
  quantity: number;
  packType: string;
  packMultiplier: number;
}

const PACK_OPTIONS = [
  { label: "Individual", multiplier: 1 },
  { label: "Pack of 10", multiplier: 10 },
  { label: "Pack of 30", multiplier: 30 },
  { label: "Pack of 50", multiplier: 50 },
  { label: "Pack of 100", multiplier: 100 },
];

const CATEGORIES = ["All", "Capsule", "Caplet", "Tablet", "Tubes", "Injections"];

export default function WholesalePOSClient({ initialProducts, branchName, branchId, userProfile }: any) {
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
    sellerName: userProfile?.full_name || userProfile?.email?.split('@')[0] || "Pharmacist",
    buyerName: "",
    date: new Date().toISOString().split('T')[0]
  });

  // ==========================================
  // VOICE RECOGNITION SYSTEM
  // ==========================================
  const [isSupported, setIsSupported] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interimTranscript, setInterimTranscript] = useState("");
  const [recognition, setRecognition] = useState<any>(null);
  const [hudMessage, setHudMessage] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [showVoiceHelp, setShowVoiceHelp] = useState(false);
  
  const activeListeningRef = useRef(false);

  // Store active states in a mutable Ref so callbacks have zero stale closures
  const stateRef = useRef({
    cart,
    initialProducts,
    checkoutData,
    isCheckingOut,
    isMuted,
    checkoutSuccess
  });

  useEffect(() => {
    stateRef.current = {
      cart,
      initialProducts,
      checkoutData,
      isCheckingOut,
      isMuted,
      checkoutSuccess
    };
  }, [cart, initialProducts, checkoutData, isCheckingOut, isMuted, checkoutSuccess]);

  // Levenshtein fuzzy match
  const findClosestProduct = (query: string, products: any[]) => {
    if (!query) return null;
    const cleanQuery = query.toLowerCase().trim();
    
    // 1. Try exact name match
    let matched = products.find(p => p.name.toLowerCase() === cleanQuery);
    if (matched) return matched;
    
    // 2. Try substring match (starts with is preferred, then contains)
    matched = products.find(p => p.name.toLowerCase().startsWith(cleanQuery));
    if (matched) return matched;
    
    matched = products.find(p => p.name.toLowerCase().includes(cleanQuery));
    if (matched) return matched;
    
    // 3. Try SKU match
    matched = products.find(p => p.sku.toLowerCase() === cleanQuery || p.sku.toLowerCase().includes(cleanQuery));
    if (matched) return matched;
    
    // 4. Fallback Levenshtein Distance for slight pronunciation/spelling difference
    let bestMatch = null;
    let bestScore = 999;
    
    const getLevenshteinDistance = (a: string, b: string): number => {
      const tmp = [];
      let i, j;
      for (i = 0; i <= a.length; i++) {
        tmp.push([i]);
      }
      for (j = 0; j <= b.length; j++) {
        tmp[0].push(j);
      }
      for (i = 1; i <= a.length; i++) {
        for (j = 1; j <= b.length; j++) {
          tmp[i][j] = Math.min(
            tmp[i - 1][j] + 1,
            tmp[i][j - 1] + 1,
            tmp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
          );
        }
      }
      return tmp[a.length][b.length];
    };

    for (const p of products) {
      const dist = getLevenshteinDistance(cleanQuery, p.name.toLowerCase());
      const maxAllowedDist = Math.max(3, Math.floor(cleanQuery.length * 0.35));
      if (dist < bestScore && dist <= maxAllowedDist) {
        bestScore = dist;
        bestMatch = p;
      }
    }
    
    return bestMatch;
  };

  // Voice Command Processor
  const processVoiceCommand = (text: string) => {
    const { cart: currentCart, initialProducts: currentProducts, checkoutData: currentCheckoutData, isCheckingOut: currentCheckingOut, isMuted: currentMuted, checkoutSuccess: currentCheckoutSuccess } = stateRef.current;
    const cleanText = text.trim().toLowerCase();
    setInterimTranscript("");
    setTranscript(cleanText);
    
    const speakFeedback = (message: string) => {
      setHudMessage(message);
      if (!currentMuted && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(message.replace(/[^a-zA-Z0-9 ]/g, ""));
        utterance.rate = 1.0;
        window.speechSynthesis.speak(utterance);
      }
    };

    // HELP / COMMANDS LIST
    if (cleanText.includes("help") || cleanText.includes("show command") || cleanText.includes("list command")) {
      setShowVoiceHelp(true);
      speakFeedback("Opening voice commands guide");
      return;
    }
    
    if (cleanText.includes("close help") || cleanText.includes("hide command") || cleanText.includes("close command")) {
      setShowVoiceHelp(false);
      speakFeedback("Closing help guide");
      return;
    }

    // CHECKOUT MODAL ACTIONS
    if (cleanText.includes("checkout") || cleanText.includes("proceed to checkout") || cleanText.includes("go to checkout")) {
      if (currentCart.length === 0) {
        speakFeedback("Your cart is empty. Add products first.");
        return;
      }
      setIsCheckingOut(true);
      speakFeedback("Proceeding to checkout. Please say set buyer name or complete sale.");
      return;
    }
    
    if (cleanText.includes("cancel checkout") || cleanText.includes("close checkout") || (currentCheckingOut && cleanText === "cancel")) {
      setIsCheckingOut(false);
      speakFeedback("Checkout cancelled.");
      return;
    }
    
    if (cleanText.includes("confirm checkout") || cleanText.includes("complete sale") || cleanText.includes("complete checkout") || cleanText.includes("confirm sale")) {
      if (currentCheckingOut) {
        if (!currentCheckoutData.buyerName) {
          speakFeedback("Please specify the buyer name first.");
          return;
        }
        speakFeedback("Confirming sale and generating receipt.");
        handleCheckout();
      } else {
        speakFeedback("You are not in checkout. Say checkout first.");
      }
      return;
    }
    
    if (cleanText.includes("print receipt") || cleanText.includes("print invoice")) {
      if (currentCheckoutSuccess) {
        speakFeedback("Printing receipt.");
        printReceipt();
      } else {
        speakFeedback("No transaction completed to print.");
      }
      return;
    }
    
    if (cleanText.includes("new sale") || cleanText.includes("start new sale")) {
      if (currentCheckoutSuccess) {
        setCheckoutSuccess(null);
        speakFeedback("Starting new sale.");
      }
      return;
    }

    // SET BUYER NAME
    if (cleanText.includes("set buyer") || cleanText.includes("buyer name") || cleanText.includes("set customer") || cleanText.includes("customer name")) {
      let name = "";
      if (cleanText.includes("set buyer")) name = cleanText.split("set buyer")[1];
      else if (cleanText.includes("buyer name")) name = cleanText.split("buyer name")[1];
      else if (cleanText.includes("set customer")) name = cleanText.split("set customer")[1];
      else if (cleanText.includes("customer name")) name = cleanText.split("customer name")[1];
      
      name = name.replace(/\bis\b/g, "").trim();
      if (name) {
        setCheckoutData(prev => ({ ...prev, buyerName: name }));
        speakFeedback(`Buyer set to ${name}`);
      } else {
        speakFeedback("Please specify a name.");
      }
      return;
    }

    // CLEAR / EMPTY CART
    if (cleanText === "clear cart" || cleanText === "empty cart" || cleanText === "clear all items") {
      setCart([]);
      speakFeedback("Cart cleared.");
      return;
    }

    // SELECT CATEGORIES
    if (cleanText.startsWith("category ") || cleanText.startsWith("show ") || cleanText.startsWith("filter ")) {
      let catQuery = cleanText.replace(/category|show|filter/g, "").trim();
      if (catQuery === "all" || catQuery === "all products" || catQuery === "all drugs") {
        setSelectedCategory("All");
        speakFeedback("Showing all categories");
        return;
      }
      
      const matchedCat = CATEGORIES.find(c => c.toLowerCase() === catQuery || c.toLowerCase().includes(catQuery));
      if (matchedCat) {
        setSelectedCategory(matchedCat);
        speakFeedback(`Showing category ${matchedCat}`);
        return;
      }
    }

    // SEARCH PRODUCTS
    if (cleanText.startsWith("search ") || cleanText.startsWith("find ")) {
      const query = cleanText.replace(/search|find/g, "").trim();
      if (query) {
        setSearchTerm(query);
        speakFeedback(`Searching for ${query}`);
      }
      return;
    }
    
    if (cleanText === "clear search" || cleanText === "reset search") {
      setSearchTerm("");
      speakFeedback("Search cleared.");
      return;
    }

    // REMOVE FROM CART
    if (cleanText.startsWith("remove ") || cleanText.startsWith("delete ") || cleanText.startsWith("discard ")) {
      const query = cleanText.replace(/remove|delete|discard/g, "").trim();
      if (query) {
        const matchedCartItem = findClosestProduct(query, currentCart);
        if (matchedCartItem) {
          updateCartQty(matchedCartItem.id, matchedCartItem.packType, 0);
          speakFeedback(`Removed ${matchedCartItem.name} from cart.`);
        } else {
          speakFeedback(`Could not find ${query} in cart.`);
        }
      }
      return;
    }

    // ADD TO CART / QUANTITY MANAGEMENT
    if (cleanText.startsWith("add ") || cleanText.includes("add to cart")) {
      let commandBody = cleanText.startsWith("add ") ? cleanText.slice(4) : cleanText.replace("add to cart", "");
      commandBody = commandBody.trim();
      
      let qty = 1;
      let packLabel = "Individual";
      
      const packRegex = /(\d+)\s*packs?\s*of\s*(.+)/i;
      const packMatch = commandBody.match(packRegex);
      
      const numberRegex = /^(\d+)\s+(.+)/;
      const numberMatch = commandBody.match(numberRegex);
      
      let drugQuery = commandBody;
      
      if (packMatch) {
        qty = parseInt(packMatch[1]) || 1;
        packLabel = "Pack of 10";
        drugQuery = packMatch[2];
      } else if (numberMatch) {
        qty = parseInt(numberMatch[1]) || 1;
        drugQuery = numberMatch[2];
      }
      
      drugQuery = drugQuery.trim();
      
      const specificPackRegex = /packs?\s*of\s*(\d+)\s*(.+)/i;
      const specPackMatch = drugQuery.match(specificPackRegex);
      if (specPackMatch) {
        const size = specPackMatch[1];
        packLabel = `Pack of ${size}`;
        drugQuery = specPackMatch[2].trim();
      }
      
      if (drugQuery) {
        const matchedProduct = findClosestProduct(drugQuery, currentProducts);
        if (matchedProduct) {
          const stock = matchedProduct.branch_stock?.wholesale_qty || 0;
          const multiplier = PACK_OPTIONS.find(o => o.label === packLabel)?.multiplier || 1;
          const requestedTotal = qty * multiplier;
          
          if (requestedTotal > stock) {
            speakFeedback(`Insufficient stock for ${matchedProduct.name}. Available is ${stock}.`);
            return;
          }
          
          setCart(prev => {
            const existingIndex = prev.findIndex(item => item.id === matchedProduct.id && item.packType === packLabel);
            if (existingIndex > -1) {
              const newCart = [...prev];
              newCart[existingIndex] = {
                ...newCart[existingIndex],
                quantity: newCart[existingIndex].quantity + qty
              };
              return newCart;
            } else {
              return [...prev, {
                id: matchedProduct.id,
                name: matchedProduct.name,
                sku: matchedProduct.sku,
                wholesale_price: Number(matchedProduct.wholesale_price),
                quantity: qty,
                packType: packLabel,
                packMultiplier: multiplier
              }];
            }
          });
          
          speakFeedback(`Added ${qty} ${packLabel === "Individual" ? "" : packLabel + " of"} ${matchedProduct.name} to cart.`);
        } else {
          speakFeedback(`Could not find ${drugQuery} in inventory.`);
        }
      }
      return;
    }

    speakFeedback(`Unrecognized command: "${cleanText}"`);
  };

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        setIsSupported(true);
        const rec = new SpeechRecognitionAPI();
        rec.continuous = true;
        rec.interimResults = true;
        rec.lang = "en-US";
        
        rec.onstart = () => {
          setIsListening(true);
          setHudMessage("Listening... Say 'Help' for voice commands");
        };
        
        rec.onresult = (event: any) => {
          let finalTrans = "";
          let interimTrans = "";
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTrans += event.results[i][0].transcript;
            } else {
              interimTrans += event.results[i][0].transcript;
            }
          }
          
          if (interimTrans) {
            setInterimTranscript(interimTrans);
          }
          
          if (finalTrans) {
            setTranscript(finalTrans);
            processVoiceCommand(finalTrans);
          }
        };
        
        rec.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setHudMessage("Mic access blocked. Enable permissions.");
          } else {
            setHudMessage(`Error: ${event.error}`);
          }
          setIsListening(false);
        };
        
        rec.onend = () => {
          if (activeListeningRef.current) {
            try {
              rec.start();
            } catch (err) {
              console.error("Auto-restart failed:", err);
            }
          } else {
            setIsListening(false);
          }
        };
        
        setRecognition(rec);
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognition) return;
    if (isListening) {
      activeListeningRef.current = false;
      recognition.stop();
      setIsListening(false);
      setHudMessage("Voice recognition stopped.");
    } else {
      activeListeningRef.current = true;
      try {
        recognition.start();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredProducts = useMemo(() => {
    return initialProducts.filter((p: any) => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.sku.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === "All" || p.category_name?.toLowerCase() === selectedCategory.toLowerCase() || p.product_form?.toLowerCase() === selectedCategory.toLowerCase();
      return matchesSearch && matchesCategory;
    });
  }, [initialProducts, searchTerm, selectedCategory]);

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id && item.packType === "Individual");
      if (existing) {
        return prev.map(item => item.id === product.id && item.packType === "Individual" 
          ? { ...item, quantity: item.quantity + 1 } 
          : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        wholesale_price: Number(product.wholesale_price),
        quantity: 1,
        packType: "Individual",
        packMultiplier: 1
      }];
    });
  };

  const updateCartQty = (id: string, packType: string, newQty: number) => {
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => !(item.id === id && item.packType === packType)));
      return;
    }
    setCart(prev => prev.map(item => item.id === id && item.packType === packType 
      ? { ...item, quantity: newQty } 
      : item
    ));
  };

  const updatePackType = (id: string, oldPackType: string, newPackLabel: string) => {
    const option = PACK_OPTIONS.find(o => o.label === newPackLabel);
    if (!option) return;

    setCart(prev => prev.map(item => item.id === id && item.packType === oldPackType 
      ? { ...item, packType: option.label, packMultiplier: option.multiplier } 
      : item
    ));
  };

  const cartTotal = cart.reduce((acc, item) => acc + (item.wholesale_price * item.quantity * item.packMultiplier), 0);

  const handleCheckout = () => {
    if (!checkoutData.buyerName) {
      alert("Please enter buyer name");
      return;
    }

    for (const item of cart) {
      const product = initialProducts.find((p: any) => p.id === item.id);
      const stock = product?.branch_stock?.wholesale_qty || 0;
      const requested = item.quantity * item.packMultiplier;
      
      if (requested > stock) {
        alert(`Cannot checkout: Insufficient wholesale stock for ${item.name}. (Available: ${stock}, Requested: ${requested})`);
        return;
      }
    }

    startTransition(async () => {
      const result = await createWholesaleTransactionAction({
        branchId,
        items: cart,
        sellerName: checkoutData.sellerName,
        buyerName: checkoutData.buyerName,
        totalAmount: cartTotal,
        date: checkoutData.date
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
            <h2 className="text-2xl font-black uppercase tracking-tighter mb-1 font-serif">PHARMA INVENTORY</h2>
            <p className="text-sm font-bold text-slate-500 uppercase">{branchName} - WHOLESALE</p>
            <p className="text-xs text-slate-400 mt-2">{new Date(checkoutSuccess.date).toLocaleString()}</p>
          </div>

          <div className="space-y-4 mb-8">
            <div className="flex justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-widest">Transaction ID:</span>
              <span className="font-mono font-bold text-indigo-600">{checkoutSuccess.transactionId.split('-')[0]}</span>
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
                    <div className="text-[10px] text-slate-400 font-mono">{item.packType}</div>
                  </td>
                  <td className="py-3 text-center font-bold text-slate-600">{item.quantity}</td>
                  <td className="py-3 text-right font-bold text-slate-800">
                    ₦{(item.wholesale_price * item.quantity * item.packMultiplier).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-4 border-double border-slate-900 pt-4 mb-10">
            <div className="flex justify-between items-center">
              <span className="text-xl font-black tracking-tight">TOTAL</span>
              <span className="text-3xl font-black tracking-tighter text-indigo-600">₦{checkoutSuccess.total.toFixed(2)}</span>
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
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 px-10 rounded-2xl shadow-xl transition-all hover:-translate-y-1"
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
    <div className="min-h-screen bg-slate-950 flex flex-col xl:flex-row font-sans selection:bg-indigo-500/30">
      {/* Left Panel: Catalog */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="p-4 bg-indigo-500/10 rounded-3xl border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
              <Building2 className="text-indigo-400" size={32} />
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
                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md border border-indigo-500/20">Wholesale</span>
                <ChevronRight size={14} />
                <span className="flex items-center gap-1"><User size={12} /> {userProfile?.full_name || "Pharmacist"}</span>
              </div>
            </div>
          </div>

          <div className="flex-grow max-w-2xl flex items-center gap-3">
            <div className="relative flex-grow group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within:text-indigo-400 transition-colors" size={20} />
              <input 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                placeholder="Search inventory (or click mic for hands-free)..."
                className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500/50 transition-all font-medium placeholder-slate-700"
              />
            </div>
            
            {isSupported ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleListening}
                  className={`p-4 rounded-2xl border transition-all duration-300 relative ${
                    isListening
                      ? "bg-rose-600/20 border-rose-500 text-rose-400 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse"
                      : "bg-slate-900/50 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30"
                  }`}
                  title={isListening ? "Stop listening" : "Start voice commands"}
                >
                  {isListening ? (
                    <>
                      <Mic size={20} />
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
                      </span>
                    </>
                  ) : (
                    <MicOff size={20} />
                  )}
                </button>
                
                <button
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-4 rounded-2xl border bg-slate-900/50 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                  title={isMuted ? "Unmute voice feedback" : "Mute voice feedback"}
                >
                  {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>

                <button
                  onClick={() => setShowVoiceHelp(true)}
                  className="p-4 rounded-2xl border bg-slate-900/50 border-slate-800 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                  title="Voice command list"
                >
                  <HelpCircle size={20} />
                </button>
              </div>
            ) : (
              <div className="text-[10px] text-slate-600 font-bold bg-slate-900/30 px-3 py-2 rounded-xl border border-slate-800 uppercase tracking-wider">
                Voice Off
              </div>
            )}
          </div>
        </header>

        {/* Categories */}
        <div className="px-6 md:px-8 pb-8 flex items-center gap-3 overflow-x-auto no-scrollbar">
          <Filter className="text-slate-600 mr-2 flex-shrink-0" size={20} />
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-6 py-2.5 rounded-xl text-sm font-black whitespace-nowrap transition-all ${selectedCategory === cat ? 'bg-indigo-600 text-white shadow-[0_0_15px_rgba(79,70,229,0.4)]' : 'bg-slate-900 text-slate-500 hover:text-white hover:bg-slate-800'}`}
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
              <h2 className="text-3xl font-black text-slate-600">Empty Inventory</h2>
              <p className="text-slate-700 mt-2 text-lg max-w-sm mx-auto">
                No drugs found in this branch. Ask your admin to distribute inventory from the central warehouse.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6">
              {filteredProducts.map((p: any) => (
                <div 
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className="group bg-slate-900/40 backdrop-blur-md border border-slate-800 hover:border-indigo-500/50 rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] cursor-pointer hover:shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative overflow-hidden active:scale-95"
                >
                  <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Package size={100} />
                  </div>
                  
                  <div className="flex items-start justify-between mb-6 relative z-10">
                    <div className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/20">
                      {p.category_name || "General"}
                    </div>
                    <div className="text-[10px] font-mono text-slate-600 font-bold tracking-tighter">
                      #{p.sku}
                    </div>
                  </div>

                  <div className="relative z-10">
                    <h3 className="text-xl font-bold text-white mb-1 group-hover:text-indigo-400 transition-colors line-clamp-1">{p.name}</h3>
                    <p className="text-sm font-medium text-slate-500 mb-6 uppercase tracking-widest">{p.product_form || 'Medicine'}</p>
                    
                    <div className="flex items-end justify-between">
                      <div>
                        <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">Wholesale Price</div>
                        <div className="text-2xl font-black text-white">₦{Number(p.wholesale_price).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] font-black text-slate-600 uppercase mb-0.5">In Stock</div>
                        <div className={`text-lg font-black ${p.branch_stock?.wholesale_qty > 20 ? 'text-emerald-500' : 'text-orange-500'}`}>
                          {p.branch_stock?.wholesale_qty || 0}
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
              <ShoppingCart className="text-indigo-400" size={24} /> Wholesale Cart
            </h2>
            <div className="px-3 py-1 bg-indigo-500 text-white rounded-full text-xs font-black">
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
              <p className="text-lg font-bold text-slate-500">Cart is empty</p>
              <p className="text-sm text-slate-600 mt-1">Select items from the catalog to start selling</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={`${item.id}-${item.packType}`} className="bg-slate-950/50 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-colors animate-in slide-in-from-right-4">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-white font-bold">{item.name}</h4>
                    <p className="text-[10px] text-slate-500 font-mono tracking-tighter uppercase">{item.sku}</p>
                  </div>
                  <button 
                    onClick={() => updateCartQty(item.id, item.packType, 0)}
                    className="p-1.5 text-slate-700 hover:text-rose-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <div className="relative flex-1">
                    <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-700" size={12} />
                    <select
                      value={item.packType}
                      onChange={(e) => updatePackType(item.id, item.packType, e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-xs font-black text-indigo-400 outline-none focus:ring-1 focus:ring-indigo-500/30 appearance-none"
                    >
                      {PACK_OPTIONS.map(opt => (
                        <option key={opt.label} value={opt.label}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 shrink-0">
                    <button 
                      onClick={() => updateCartQty(item.id, item.packType, item.quantity - 1)}
                      className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                    >
                      <Minus size={14} />
                    </button>
                    <input 
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateCartQty(item.id, item.packType, parseInt(e.target.value) || 1)}
                      className="w-12 bg-transparent text-center text-white font-bold text-sm focus:outline-none"
                    />
                    <button 
                      onClick={() => updateCartQty(item.id, item.packType, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center text-indigo-400 hover:text-white transition-colors"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-slate-900 pt-3">
                  <span className="text-[10px] font-black text-slate-700 uppercase">Weight: {item.quantity * item.packMultiplier} units</span>
                  <span className="text-lg font-black text-white">₦{(item.wholesale_price * item.quantity * item.packMultiplier).toLocaleString()}</span>
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
              <span className="text-3xl font-black text-indigo-400 tracking-tighter">₦{cartTotal.toLocaleString()}</span>
            </div>
          </div>

          <button 
            disabled={cart.length === 0 || isPending}
            onClick={() => setIsCheckingOut(true)}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-5 px-6 rounded-2xl shadow-[0_10px_40px_rgba(79,70,229,0.3)] transition-all hover:-translate-y-1 active:scale-[0.98] disabled:opacity-30 disabled:grayscale disabled:hover:translate-y-0 flex items-center justify-center gap-3 text-lg"
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
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Finalize wholesale transaction</p>
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
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Service Date</label>
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
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Buyer / Customer Name</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                  <input 
                    placeholder="Enter name of organization or buyer..."
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
                    <span className="block text-[10px] font-black text-slate-600 uppercase mb-1 tracking-widest">Items Count</span>
                    <span className="text-xl font-bold text-slate-400">{cart.length} Products</span>
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
                {isPending ? "GENERATING RECEIPT..." : "CONFIRM & GENERATE BARCODE"}
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

      {/* Floating Voice HUD */}
      {isListening && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-xl border border-indigo-500/30 px-6 py-4 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex items-center gap-4 animate-in slide-in-from-bottom-5 duration-300 max-w-lg w-full mx-auto print:hidden">
          <div className="relative shrink-0">
            <div className="absolute inset-0 bg-rose-500/20 rounded-full blur-md animate-ping" />
            <div className="w-10 h-10 bg-rose-600 rounded-full flex items-center justify-center text-white relative">
              <Mic size={18} className="animate-pulse" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Voice Control Active</span>
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
            <p className="text-sm font-bold text-white truncate mt-0.5">
              {hudMessage || "Say 'Help' for list of commands"}
            </p>
            {(interimTranscript || transcript) && (
              <p className="text-xs text-slate-400 font-mono italic mt-1 truncate border-t border-slate-800/50 pt-1">
                Heard: "{interimTranscript || transcript}"
              </p>
            )}
          </div>
          <button 
            onClick={() => {
              if (recognition) {
                recognition.stop();
              }
              setIsListening(false);
              activeListeningRef.current = false;
            }} 
            className="text-[10px] font-black bg-slate-800 hover:bg-slate-700 text-slate-300 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors uppercase"
          >
            MUTE
          </button>
        </div>
      )}

      {/* Voice Help Modal */}
      {showVoiceHelp && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 print:hidden">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setShowVoiceHelp(false)} />
          <div className="relative bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-8 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
              <Sparkles size={200} className="text-indigo-500" />
            </div>
            
            <div className="flex items-center gap-4 mb-6 relative z-10">
              <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
                <Sparkles className="text-indigo-400 animate-pulse" size={28} />
              </div>
              <div>
                <h2 className="text-3xl font-black text-white tracking-tight">Voice Command Guide</h2>
                <p className="text-slate-500 font-bold uppercase text-xs tracking-widest mt-1">Supercharge your checkout with hands-free controls</p>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> 1. Catalog & Search
                  </h4>
                  <ul className="space-y-2 text-xs font-medium text-slate-400">
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Search [drug]"</span>
                      <span className="text-indigo-400 font-bold font-mono">e.g. "Search Panadol"</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Clear search"</span>
                      <span className="text-indigo-400 font-bold font-mono">Resets filter</span>
                    </li>
                    <li className="flex justify-between">
                      <span>"Category [form]"</span>
                      <span className="text-indigo-400 font-bold font-mono">e.g. "Category Tablet"</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all">
                  <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-400"></span> 2. Cart Operations
                  </h4>
                  <ul className="space-y-2 text-xs font-medium text-slate-400">
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Add [drug]"</span>
                      <span className="text-rose-400 font-bold font-mono">Adds 1 individual</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Add [qty] [drug]"</span>
                      <span className="text-rose-400 font-bold font-mono">e.g. "Add 5 Ibuprofen"</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Add [qty] packs of [drug]"</span>
                      <span className="text-rose-400 font-bold font-mono">e.g. "Add 2 packs of Vitamin C"</span>
                    </li>
                    <li className="flex justify-between border-b border-slate-900 pb-1.5">
                      <span>"Remove [drug]"</span>
                      <span className="text-rose-400 font-bold font-mono">Deletes from cart</span>
                    </li>
                    <li className="flex justify-between">
                      <span>"Empty cart"</span>
                      <span className="text-rose-400 font-bold font-mono">Clears cart</span>
                    </li>
                  </ul>
                </div>

                <div className="bg-slate-950/50 border border-slate-800/80 rounded-2xl p-5 hover:border-indigo-500/30 transition-all md:col-span-2">
                  <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 3. Checkout Workflow
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-medium text-slate-400">
                    <ul className="space-y-2">
                      <li className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span>"Checkout" / "Proceed"</span>
                        <span className="text-emerald-400 font-bold font-mono">Opens checkout modal</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span>"Buyer [organization name]"</span>
                        <span className="text-emerald-400 font-bold font-mono">e.g. "Buyer General Clinic"</span>
                      </li>
                    </ul>
                    <ul className="space-y-2">
                      <li className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span>"Confirm checkout"</span>
                        <span className="text-emerald-400 font-bold font-mono">Submits the sale</span>
                      </li>
                      <li className="flex justify-between border-b border-slate-900 pb-1.5">
                        <span>"Cancel" / "Close modal"</span>
                        <span className="text-emerald-400 font-bold font-mono">Closes checkout modal</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-indigo-950/30 border border-indigo-900/50 rounded-2xl text-xs text-indigo-300 font-medium">
                💡 **Pro Tip**: Use short, clear phrases. Ensure your browser microphone permission is granted. To quickly complete a sale, say *"Add 10 Panadol"*, then *"Checkout"*, then *"Buyer General Clinic"*, and finally *"Confirm checkout"*.
              </div>
            </div>

            <div className="mt-8 flex gap-4 relative z-10 shrink-0">
              <button 
                onClick={() => setShowVoiceHelp(false)}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-black py-4 rounded-2xl transition-all shadow-[0_4px_20px_rgba(79,70,229,0.3)] hover:-translate-y-0.5 active:scale-[0.98]"
              >
                GOT IT
              </button>
            </div>
          </div>
        </div>
      )}

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
      `}</style>
    </div>
  );
}
