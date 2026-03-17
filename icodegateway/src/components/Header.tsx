import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Header: React.FC<{ title: string }> = ({ title }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
       <div className="flex items-center gap-2">
          <span className="text-slate-400 font-light">/</span>
          <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
       </div>
       
       <div className="flex items-center gap-4">
          {/* Global Search */}
          <div className="hidden md:flex items-center bg-slate-50 rounded-full px-3 py-1.5 border border-slate-200 focus-within:ring-2 ring-primary-100 transition-all">
             <Search size={14} className="text-slate-400 mr-2" />
             <input type="text" placeholder="全局搜索..." className="bg-transparent text-sm focus:outline-none w-48 text-slate-600 placeholder:text-slate-400"/>
          </div>

          <button className="relative p-2 text-slate-500 hover:bg-slate-50 rounded-full transition-colors">
             <Bell size={20} />
             <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
          </button>
          
          <div className="flex items-center gap-3 pl-4 border-l border-slate-200">
             <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-slate-800">指挥长</p>
                <p className="text-xs text-slate-500">基地管理中心</p>
             </div>
             <div className="w-9 h-9 bg-slate-200 rounded-full flex items-center justify-center border border-slate-300 overflow-hidden">
                <User size={20} className="text-slate-500" />
             </div>
          </div>
       </div>
    </header>
  );
};

export default Header;
