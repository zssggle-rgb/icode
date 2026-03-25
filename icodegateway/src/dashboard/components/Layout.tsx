import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bell,
  Smartphone,
  Settings,
  User,
} from 'lucide-react';

interface TabItem {
  key: string;
  label: string;
  path: string;
  icon: React.ReactNode;
}

const tabs: TabItem[] = [
  { key: 'overview', label: '概览', path: '/', icon: <LayoutDashboard size={18} /> },
  { key: 'audit', label: '审计日志', path: '/audit', icon: <FileText size={18} /> },
  { key: 'alerts', label: '告警中心', path: '/alerts', icon: <Bell size={18} /> },
  { key: 'devices', label: '设备管理', path: '/devices', icon: <Smartphone size={18} /> },
  { key: 'policy', label: '策略配置', path: '/policy', icon: <Settings size={18} /> },
  { key: 'my-usage', label: '我的使用', path: '/my-usage', icon: <User size={18} /> },
];

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
}

export default function Layout({ children, title, actions }: LayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const activeTab = tabs.find(tab => {
    if (tab.path === '/') return location.pathname === '/';
    return location.pathname.startsWith(tab.path);
  }) || tabs[0];

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b border-slate-200">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-semibold text-slate-800">
              {title || activeTab.label}
            </h1>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </div>
        </div>

        <nav className="px-6 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab.key === tab.key
                  ? 'text-blue-600 border-blue-600'
                  : 'text-slate-500 border-transparent hover:text-slate-700 hover:border-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="p-6">
        {children}
      </main>
    </div>
  );
}

export { tabs };
