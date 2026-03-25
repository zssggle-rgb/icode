import React, { useEffect, useState, useCallback } from 'react';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import { fetchMyUsage, MyUsageData } from '../api/client';
import { AlertTriangle, CheckCircle2, XCircle, Clock, BarChart2 } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  adopted: { label: '已采纳', color: 'bg-green-100 text-green-700', icon: <CheckCircle2 size={12} /> },
  rejected: { label: '已拒绝', color: 'bg-red-100 text-red-700', icon: <XCircle size={12} /> },
  pending: { label: '待定', color: 'bg-slate-100 text-slate-600', icon: <Clock size={12} /> },
};

export default function MyUsage() {
  const [data, setData] = useState<MyUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const result = await fetchMyUsage();
    setData(result);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const usagePercent = data ? Math.round((data.total_requests / data.quota) * 100) : 0;
  const isOverQuota = data ? data.total_requests > data.quota : false;
  const isNearQuota = data ? usagePercent >= 80 : false;

  const chartOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>请求数: ${p.value}`;
      },
    },
    grid: { left: 50, right: 20, top: 10, bottom: 30 },
    xAxis: {
      type: 'category',
      data: data?.trend.map(t => t.date.slice(5)) || [],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11, interval: 4 },
    },
    yAxis: {
      type: 'value',
      axisLine: { show: false },
      splitLine: { lineStyle: { color: '#f1f5f9' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
    },
    series: [
      {
        name: '请求数',
        type: 'bar',
        data: data?.trend.map(t => t.requests) || [],
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#3b82f6' },
            { offset: 1, color: '#93c5fd' },
          ]),
          borderRadius: [3, 3, 0, 0],
        },
        barMaxWidth: 20,
      },
    ],
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN');
  };

  if (loading) {
    return (
      <Layout title="我的使用统计">
        <div className="flex items-center justify-center h-64 text-slate-400">加载中...</div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title="我的使用统计">
        <div className="flex items-center justify-center h-64 text-slate-400">加载失败</div>
      </Layout>
    );
  }

  return (
    <Layout title="我的使用统计">
      <div className="space-y-6 max-w-5xl">
        {/* Quota Header */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-800">本月使用情况</h3>
              <p className="text-sm text-slate-500 mt-1">配额刷新周期：每月 1 日</p>
            </div>
            <div className="text-right">
              <div className={`text-3xl font-bold ${isOverQuota ? 'text-red-500' : isNearQuota ? 'text-orange-500' : 'text-slate-800'}`}>
                {data.total_requests}
                <span className="text-lg font-normal text-slate-400"> / {data.quota} 次</span>
              </div>
              <div className="text-sm text-slate-500 mt-1">今日请求：{data.requests_today} 次</div>
            </div>
          </div>

          {/* Quota Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>配额使用</span>
              <span>{usagePercent}%</span>
            </div>
            <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isOverQuota ? 'bg-red-500' : isNearQuota ? 'bg-orange-400' : 'bg-blue-500'
                }`}
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
          </div>

          {/* Warning */}
          {isOverQuota && (
            <div className="flex items-center gap-2 mt-3 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertTriangle size={16} />
              <span>您本月已超出配额（{data.total_requests - data.quota} 次超额），超出部分可能受限。请联系管理员调整配额。</span>
            </div>
          )}
          {isNearQuota && !isOverQuota && (
            <div className="flex items-center gap-2 mt-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-700">
              <AlertTriangle size={16} />
              <span>配额使用已达 {usagePercent}%，剩余 {data.quota - data.total_requests} 次，建议关注使用情况。</span>
            </div>
          )}
        </div>

        {/* 30-day Trend Chart */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart2 size={16} className="text-slate-400" />
            <h3 className="text-base font-semibold text-slate-700">近30天请求趋势</h3>
          </div>
          <ReactECharts option={chartOption} style={{ height: 220 }} />
        </div>

        {/* Recent Requests */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200">
            <h3 className="text-base font-semibold text-slate-700">最近请求</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-slate-500 text-xs">
                  <th className="px-6 py-3 text-left font-medium w-[80px]">时间</th>
                  <th className="px-4 py-3 text-left font-medium">提示词摘要</th>
                  <th className="px-4 py-3 text-center font-medium w-[70px]">风险</th>
                  <th className="px-4 py-3 text-center font-medium w-[80px]">采纳状态</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_requests.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400">暂无请求记录</td>
                  </tr>
                ) : (
                  data.recent_requests.map(req => (
                    <React.Fragment key={req.id}>
                      <tr
                        className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${expandedId === req.id ? 'bg-blue-50' : ''}`}
                        onClick={() => setExpandedId(expandedId === req.id ? null : req.id)}
                      >
                        <td className="px-6 py-3 text-slate-600 font-mono text-xs">
                          <div className="text-slate-500 text-xs">{formatDate(req.created_at)}</div>
                          <div>{formatTime(req.created_at)}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 truncate max-w-md">{req.prompt_summary}</td>
                        <td className="px-4 py-3 text-center">
                          <RiskBadge level={req.risk_level} showLabel={false} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[req.status]?.color || 'bg-slate-100 text-slate-600'}`}>
                            {statusConfig[req.status]?.icon}
                            {statusConfig[req.status]?.label || req.status}
                          </span>
                        </td>
                      </tr>
                      {expandedId === req.id && (
                        <tr className="border-t border-slate-100 bg-blue-50/50">
                          <td colSpan={4} className="px-6 py-4">
                            <div className="grid grid-cols-3 gap-4 text-xs text-slate-500 mb-3">
                              <div>
                                <span className="font-medium text-slate-700">请求ID：</span>
                                {req.id}
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">请求时间：</span>
                                {formatDate(req.created_at)} {formatTime(req.created_at)}
                              </div>
                              <div>
                                <span className="font-medium text-slate-700">采纳状态：</span>
                                <span className={`inline-flex items-center gap-1 ${statusConfig[req.status]?.color}`}>
                                  {statusConfig[req.status]?.icon}
                                  {statusConfig[req.status]?.label}
                                </span>
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 mb-1">提示词摘要：</div>
                              <div className="bg-white rounded border border-slate-200 p-3 text-sm text-slate-700">
                                {req.prompt_summary}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}
