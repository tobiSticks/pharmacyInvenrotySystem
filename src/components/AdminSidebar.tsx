"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Users, ShieldCheck, ShoppingCart, UserCog, LogOut, LayoutDashboard, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface PresenceUser {
  user_id: string;
  name: string;
  role: string;
  online_at: string;
}

export default function AdminSidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const [onlineStaff, setOnlineStaff] = useState<Record<string, PresenceUser>>({});
  
  // Collapse State
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Load persistence
  useEffect(() => {
    const savedCollapsed = localStorage.getItem("sidebar-collapsed");
    if (savedCollapsed !== null) setIsCollapsed(savedCollapsed === "true");
  }, []);

  // Sync persistence
  useEffect(() => {
    localStorage.setItem("sidebar-collapsed", String(isCollapsed));
    
    // Dispatch custom event for layout to sync
    window.dispatchEvent(new CustomEvent("sidebar-state-change", {
      detail: { 
        width: isCollapsed ? 80 : 288,
        isCollapsed
      }
    }));
  }, [isCollapsed]);

  useEffect(() => {
    const channel = supabase.channel("pharmacy-presence");

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const staff: Record<string, PresenceUser> = {};
        
        Object.keys(state).forEach((key) => {
          const presences = state[key] as unknown as PresenceUser[];
          if (presences && presences.length > 0) {
            const latest = presences[0];
            if (["Pharmacist", "Manager", "Cashier"].includes(latest.role)) {
              staff[latest.role] = latest;
            }
          }
        });
        setOnlineStaff(staff);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const roles = [
    { name: "Manager", icon: <UserCog size={18} />, color: "text-emerald-400" },
    { name: "Pharmacist", icon: <ShieldCheck size={18} />, color: "text-indigo-400" },
    { name: "Cashier", icon: <ShoppingCart size={18} />, color: "text-purple-400" },
  ];

  // Logic for display state
  const sidebarWidth = isCollapsed ? "w-20" : "w-72";

  return (
    <aside 
      className={`${sidebarWidth} relative bg-slate-900/80 backdrop-blur-3xl border-r border-slate-800 flex flex-col h-screen transition-all duration-300 ease-in-out group/sidebar`}
    >
      {/* Sidebar Header */}
      <div className={`flex items-center p-6 ${isCollapsed ? 'justify-center' : 'justify-between'} border-b border-slate-800/50`}>
        {!isCollapsed && (
          <h2 className="text-xl font-black tracking-tighter text-white flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20">
              <ShieldCheck size={20} />
            </div>
            PHARMA-CORE
          </h2>
        )}
        
        <div className={`flex items-center gap-1 ${isCollapsed ? 'flex-col gap-2' : ''}`}>
          {/* Collapse Toggle */}
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 px-3 py-6 space-y-2 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <div className={`text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4 ${isCollapsed ? 'text-center' : ''}`}>
          {isCollapsed ? 'Main' : 'Main Dashboard'}
        </div>
        
        <SidebarLink 
          href="/" 
          icon={<LayoutDashboard size={20} />} 
          label="Home" 
          active={pathname === "/"} 
          collapsed={isCollapsed}
        />
        
        {/* Live Staff Status Widget */}
        <div className="mt-8">
          {!isCollapsed && (
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 mb-4 flex items-center justify-between animate-in fade-in duration-500">
              <span>Live Staff Status</span>
              <div className="flex gap-1">
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse delay-75"></span>
              </div>
            </div>
          )}
          
          <div className={`space-y-1 ${isCollapsed ? 'px-0' : 'bg-slate-950/40 rounded-2xl border border-slate-800/50 p-1 mx-2'}`}>
            {roles.map((role) => {
              const staff = onlineStaff[role.name];
              const isOnline = !!staff;
              
              if (isCollapsed) {
                return (
                  <div key={role.name} className="flex justify-center py-3 relative group/role">
                    <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 transition-all ${isOnline ? 'text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.1)]' : 'text-slate-600 opacity-50'}`}>
                      {role.icon}
                    </div>
                    {isOnline && (
                      <div className="absolute top-2 right-4 w-2 h-2 rounded-full bg-emerald-500 border-2 border-slate-900"></div>
                    )}
                    {/* Tooltip */}
                    <div className="absolute left-16 bg-slate-900 border border-slate-800 text-white text-[10px] font-bold py-2 px-3 rounded-lg opacity-0 invisible group-hover/role:opacity-100 group-hover/role:visible transition-all whitespace-nowrap z-50">
                       {role.name}: {isOnline ? staff.name : 'Offline'}
                    </div>
                  </div>
                );
              }

              return (
                <div 
                  key={role.name}
                  className="flex items-center justify-between p-3 rounded-xl transition-all hover:bg-slate-800/40 group/item"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg bg-slate-900 border border-slate-800 transition-colors ${isOnline ? 'text-emerald-400 border-emerald-500/20' : 'text-slate-500'}`}>
                      {role.icon}
                    </div>
                    <div className="overflow-hidden">
                      <div className="text-[10px] font-bold uppercase tracking-tight text-slate-500 truncate">
                        {role.name}
                      </div>
                      <div className={`text-sm font-medium leading-none truncate ${isOnline ? 'text-white' : 'text-slate-600 italic'}`}>
                        {isOnline ? staff.name : "Offline"}
                      </div>
                    </div>
                  </div>
                  <div className={`shrink-0 w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-800'}`}></div>
                </div>
              );
            })}
          </div>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800/50">
        <button 
          onClick={() => supabase.auth.signOut()}
          className={`flex items-center gap-3 text-slate-400 hover:text-white hover:bg-red-500/10 hover:border-red-500/20 rounded-xl transition-all border border-transparent font-medium
            ${isCollapsed ? 'justify-center p-3 w-12 mx-auto' : 'px-4 py-3 w-full'}`}
          title="Sign Out"
        >
          <LogOut size={18} />
          {!isCollapsed && <span className="animate-in fade-in duration-300">Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}

function SidebarLink({ href, icon, label, active, collapsed }: { href: string, icon: any, label: string, active: boolean, collapsed: boolean }) {
  return (
    <Link 
      href={href}
      className={`flex items-center gap-3 rounded-xl transition-all group font-medium relative 
        ${collapsed ? 'justify-center p-3 w-12 mx-auto' : 'px-4 py-3'}
        ${active ? 'bg-indigo-600/10 border border-indigo-500/30 text-indigo-400 shadow-[0_0_15px_rgba(79,70,229,0.1)]' : 'text-slate-400 hover:text-white hover:bg-slate-800/50 border border-transparent'}
      `}
      title={collapsed ? label : ""}
    >
      <span className={active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'}>
        {icon}
      </span>
      {!collapsed && <span className="animate-in fade-in duration-300 whitespace-nowrap">{label}</span>}
      
      {collapsed && (
        <div className="absolute left-16 bg-slate-900 border border-slate-800 text-white text-[10px] font-bold py-2 px-3 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 shadow-2xl">
          {label}
        </div>
      )}
    </Link>
  );
}
