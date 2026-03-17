import React, { useEffect, useState } from 'react';
import { Activity, ShieldAlert, AlertTriangle, FileCheck, Users, Server } from 'lucide-react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';

const MetricCard = ({ title, value, subtext, icon: Icon, trend }: any) => (
  <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
    <div className="flex justify-between items-start mb-4">
      <div>
        <p className="text-slate-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-slate-800 mt-1">{value}</h3>
      </div>
      <div className={`p-2 rounded-lg ${trend === 'up' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-xs text-slate-500">
      <span className={trend === 'up' ? 'text-red-600' : 'text-green-600'}>{subtext}</span> 较上小时
    </p>
  </div>
);

const GatewayDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/stats')
      .then(res => res.json())
      .then(res => {
        if (res.code === 0) {
          setStats(res.data);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getChartOption = () => {
    const data = stats?.trend || [];
    return {
      tooltip: {
        trigger: 'axis',
        backgroundColor: '#fff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#1e293b' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: data.map((d: any) => d.name),
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: '#64748b' }
      },
      yAxis: {
        type: 'value',
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { lineStyle: { type: 'dashed', color: '#e2e8f0' } },
        axisLabel: { color: '#64748b' }
      },
      series: [
        {
          name: '吞吐量 (RPM)',
          type: 'line',
          smooth: true,
          lineStyle: { width: 2, color: '#3b82f6' },
          showSymbol: false,
          areaStyle: {
            opacity: 0.3,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: '#3b82f6'
              },
              {
                offset: 1,
                color: 'rgba(59, 130, 246, 0)'
              }
            ])
          },
          data: data.map((d: any) => d.rpm)
        },
        {
          name: '拦截数',
          type: 'line',
          smooth: true,
          lineStyle: { width: 2, color: '#ef4444' },
          showSymbol: false,
          areaStyle: {
            opacity: 0.3,
            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
              {
                offset: 0,
                color: '#ef4444'
              },
              {
                offset: 1,
                color: 'rgba(239, 68, 68, 0)'
              }
            ])
          },
          data: data.map((d: any) => d.block)
        }
      ]
    };
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center text-slate-500">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard 
          title="总请求数" 
          value={stats?.total_requests || 0} 
          subtext="+12.5%" 
          icon={Activity} 
          trend="up" 
        />
        <MetricCard 
          title="拦截请求" 
          value={stats?.blocked_requests || 0} 
          subtext="-2.1%" 
          icon={ShieldAlert} 
          trend="down" 
        />
        <MetricCard 
          title="活跃设备" 
          value={stats?.active_devices || 0} 
          subtext="+5" 
          icon={Users} 
          trend="up" 
        />
        <MetricCard 
          title="平均响应" 
          value="45ms" 
          subtext="+1.2%" 
          icon={Server} 
          trend="up" 
        />
      </div>

      {/* Main Chart */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-6">流量趋势监控</h3>
        <ReactECharts option={getChartOption()} style={{ height: '400px' }} />
      </div>
    </div>
  );
};


export default GatewayDashboard;
