import React from 'react';
import { LayoutDashboard, Plane, Map, Wrench, BarChart2, ShieldAlert, Settings, CloudRain, Warehouse } from 'lucide-react';

interface MenuItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  title?: string;
  subtitle?: string;
  logo?: React.ReactNode;
  menuItems?: MenuItem[];
  footerContent?: React.ReactNode;
  theme?: 'dark' | 'light';
}

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  setActiveTab,
  title = "飞机一体化监控系统",
  subtitle = "人影中心版",
  logo = <CloudRain className="text-blue-500 mr-3" size={24} />,
  menuItems,
  footerContent,
  theme = 'dark'
}) => {
  const isDark = theme === 'dark';
  
  const defaultMenuItems = [
    { id: 'dashboard', label: '态势总览', icon: <LayoutDashboard size={20} /> },
    { id: 'assets', label: '飞机管理', icon: <Plane size={20} /> },
    { id: 'ground', label: '停放监控', icon: <Warehouse size={20} /> },
    { id: 'flight', label: '作业监控', icon: <Map size={20} /> },
    { id: 'maintenance', label: '维保监控', icon: <Wrench size={20} /> },
    { id: 'analysis', label: '效益统计', icon: <BarChart2 size={20} /> },
    { id: 'safety', label: '安全预警', icon: <ShieldAlert size={20} /> },
    { id: 'settings', label: '系统管理', icon: <Settings size={20} /> },
  ];

  const items = menuItems || defaultMenuItems;

  const bgClass = isDark ? 'bg-slate-900' : 'bg-white border-r border-slate-200';
  const textClass = isDark ? 'text-slate-300' : 'text-slate-600';
  const headerBgClass = isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100';
  const titleClass = isDark ? 'text-white' : 'text-slate-800';
  const footerBorderClass = isDark ? 'border-slate-800' : 'border-slate-100';

  return (
    <div className={`w-64 flex flex-col h-screen fixed left-0 top-0 z-40 shadow-xl transition-colors duration-200 ${bgClass} ${textClass}`}>
      {/* Logo Area */}
      <div className={`h-16 flex items-center px-6 border-b ${headerBgClass}`}>
         {logo}
         <div>
            <h1 className={`${titleClass} font-bold text-lg tracking-tight`}>{title}</h1>
            <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">{subtitle}</p>
         </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {items.map(item => {
          const isActive = activeTab === item.id;
          let buttonClass = `w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 `;
          
          if (isActive) {
            buttonClass += isDark 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50' 
              : 'bg-blue-50 text-blue-600';
          } else {
            buttonClass += isDark 
              ? 'hover:bg-slate-800 hover:text-white' 
              : 'hover:bg-slate-50 hover:text-slate-900';
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={buttonClass}
            >
              {item.icon}
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className={`p-4 border-t ${footerBorderClass} text-xs text-slate-500 text-center`}>
         {footerContent || (
           <>
             <p>国家人影中心</p>
             <p>© 2025 WeatherMod Sys</p>
           </>
         )}
      </div>
    </div>
  );
};

export default Sidebar;