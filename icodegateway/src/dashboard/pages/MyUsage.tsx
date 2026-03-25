import React, { useEffect, useState } from 'react';
import ReactECharts from 'echarts-for-react';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import { fetchMyUsage, MyUsageData } from '../api/client';
import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  adopted: { label: '已采纳', color: 'text-green-600', icon: <CheckCircle size={14} /> },
  rejected: { label: '已拒绝', color: 'text-red-600', icon: <XCircle size={14} /> },
  pending: { label: '待定', color: 'text-slate-400', icon: <Clock size={14} /> },
};

export default function MyUsagePage() {
  const [usage, setUsage] = useState<MyUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMyUsage().then(data => {
      setUsage(data);
      setLoading(false);
    });
  }, []);

  const trendOption = {
    tooltip: { trigger: 'axis', formatter: (params: any) => `${params[0].name}<br/>请求数: ${params[0].value}` },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: usage?.trend.map(t => t.date.slice(5)) || [],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 10, interval: 4 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [{
      name: '请求数',
      type: 'bar',
      data: usage?.trend.map(t => t.requests) || [],
      itemStyle: { color: '#3b82f6', borderRadius: [2, 2, 0, 0] },
      barMaxWidth: 20,
    }],
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false, hour: '2-digit', minute: '2-digit' });
  };

  if (loading) {
    return <Layout title="我的使用统计"><div className="flex items-center justify-center h-64"><div className="text-slate-400">加载中...</div></div></Layout>;
  }

  if (!usage) {
    return <Layout title="我的使用统计"><div className="flex items-center justify-center h-64"><div className="text-slate-400">加载失败</div></div></Layout>;
  }

  const isOverQuota = usage.total_requests > usage.quota;

  return (
    <Layout title="我的使用统计">
      <div className="space-y-6">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-medium text-slate-700">本月已用</h3>
              <div className="mt-2">
                <span className={`text-3xl font-bold ${isOverQuota ? 'text-orange-500' : 'text-slate-800'}`}>{usage.total_requests}</span>
                <span className="text-lg text-slate-400 ml-1">/</span>
                <span className="text-xl text-slate-500 ml-1">{usage.quota}</span>
                <span className="text-slate-500 ml-1">次</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-slate-500">今日请求</div>
              <div className="text-2xl font-semibold text-slate-700">{usage.requests_today}</div>
            </div>
          </div>

          <div className="mt-4">
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${isOverQuota ? 'bg-orange-500' : 'bg-blue-500'}`}
                style={{ width: `${Math.min((usage.total_requests / usage.quota) * 100, 100)}%` }} />
            </div>
          </div>

          {isOverQuota && (
            <div className="mt-4 flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle size={18} className="text-orange-500" />
              <span className="text-sm text-orange-600">
                已超出配额 {usage.total_requests - usage.quota} 次。当前配额为 {usage.quota} 次/月，超出部分将按量计费。
              </span>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-base font-medium text-slate-700 mb-4">请求趋势（近30天）</h3>
          <ReactECharts option={trendOption} style={{ height: 220 }} />
        </div>

        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h3 className="text-base font-medium text-slate-700">最近请求</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {usage.recent_requests.length === 0 ? (
              <div className="px-5 py-12 text-center text-slate-400">暂无请求记录</div>
            ) : (
              usage.recent_requests.map(req => {
                const status = statusConfig[req.status];
                return (
                  <div key={req.id} className="px-5 py-3 hover:bg-slate-50 cursor-pointer" onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-slate-400 font-mono w-12">{formatTime(req.created_at)}</span>
                      <span className="flex-1 text-sm text-slate-700 truncate">{req.prompt_summary}</span>
                      <RiskBadge level={req.risk_level} size="sm" />
                      <span className={`flex items-center gap-1 text-xs ${status.color}`}>{status.icon}{status.label}</span>
                    </div>

                    {expandedId === req.id && (
                      <div className="mt-3 p-3 bg-slate-50 rounded text-sm">
                        <div className="grid grid-cols-3 gap-2 text-slate-500 mb-2">
                          <span>请求ID：<span className="font-mono text-xs">{req.id}</span></span>
                          <span>风险等级：<RiskBadge level={req.risk_level} size="sm" /></span>
                          <span>采纳状态：<span className={status.color}>{status.label}</span></span>
                        </div>
                        <div className="text-slate-500">时间：{new Date(req.created_at).toLocaleString('zh-CN')}</div>
                        <div className="mt-2 text-slate-700">
                          <span className="text-slate-500">提示词：</span>
                          <div className="mt-1 p-2 bg-white rounded border border-slate-200">{req.prompt_summary}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
