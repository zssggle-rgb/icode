import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShieldCheck, Settings, FileText, MonitorPlay, History, Laptop, Bell } from 'lucide-react';
import GatewayDashboard from './components/GatewayDashboard';
import GatewayPolicy from './components/GatewayPolicy';
import GatewaySecurityAudit from './components/GatewaySecurityAudit';
import GatewayAgentMonitor from './components/GatewayAgentMonitor';
import GatewayAuditLogs from './components/GatewayAuditLogs';
import GatewayDeviceManager from './components/GatewayDeviceManager';
import GatewayAlerts from './components/GatewayAlerts';

import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const SmartCodeGatewayApp: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Derive activeTab from URL path
  const getActiveTab = () => {
    const path = location.pathname.replace(/^\//, '') || 'dashboard';
    return path;
  };

  const activeTab = getActiveTab();

  const handleTabChange = (tabId: string) => {
    navigate(`/${tabId}`);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <GatewayDashboard />;
      case 'policy':
        return <GatewayPolicy />;
      case 'security-audit':
        return <GatewaySecurityAudit />;
      case 'agent-monitor':
        return <GatewayAgentMonitor />;
      case 'audit-logs':
        return <GatewayAuditLogs />;
      case 'device-manager':
        return <GatewayDeviceManager />;
      case 'alerts':
        return <GatewayAlerts />;
      default:
        return <GatewayDashboard />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      'dashboard': '态势总览',
      'policy': '策略管理',
      'agent-monitor': '智能体监控',
      'security-audit': '安全审计',
      'audit-logs': '审计日志',
      'alerts': '告警中心',
      'device-manager': '设备管理',
      'settings': '系统设置',
    };
    return titles[activeTab] || '智码安全网关';
  };

  const menuItems = [
    { id: 'dashboard', label: '态势总览', icon: <LayoutDashboard size={20} /> },
    { id: 'agent-monitor', label: '智能体监控', icon: <MonitorPlay size={20} /> },
    { id: 'security-audit', label: '安全合规', icon: <ShieldCheck size={20} /> },
    { id: 'audit-logs', label: '审计日志', icon: <History size={20} /> },
    { id: 'alerts', label: '告警中心', icon: <Bell size={20} /> },
    { id: 'device-manager', label: '设备管理', icon: <Laptop size={20} /> },
    { id: 'policy', label: '策略管理', icon: <FileText size={20} /> },
    { id: 'settings', label: '系统设置', icon: <Settings size={20} /> },
  ];

  const footerContent = (
    <>
      <p>智码安全网关</p>
      <p>© 2026 智码安全</p>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex">
      {/* Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        title="智码安全网关"
        subtitle="企业内网版"
        logo={<ShieldCheck className="text-blue-500 mr-3" size={24} />}
        menuItems={menuItems}
        footerContent={footerContent}
        theme="light"
      />

      {/* Main Content */}
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        {/* Header */}
        <Header title={getPageTitle()} />

        <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden h-[calc(100vh-64px)]">
           <div className="max-w-[1600px] mx-auto">
              {renderContent()}
           </div>
        </main>
      </div>
    </div>
  );
};

export default SmartCodeGatewayApp;
