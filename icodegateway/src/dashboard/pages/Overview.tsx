import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactECharts from 'echarts-for-react';
import * as echarts from 'echarts';
import Layout from '../components/Layout';
import StatCard from '../components/StatCard';
import RiskBadge from '../components/RiskBadge';
import { fetchStats, StatsData } from '../api/client';
import { Smartphone, AlertTriangle, TrendingUp } from 'lucide-react';

type Period = 'today' | '7d' | '30d';

const periodLabels: Record<Period, string> = {
  today: '今天',
  '7d': '近7天',
  '30d': '近30天',
};

export default function Overview() {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('7d');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchStats(period).then(data => {
      setStats(data);
      setLoading(false);
    });
  }, [period]);

  // Trend chart option
  const trendOption = {
    tooltip: {
      trigger: 'axis',
      formatter: (params: any) => {
        const p = params[0];
        return `${p.name}<br/>请求数: ${p.value}`;
      },
    },
    grid: { left: 50, right: 20, top: 20, bottom: 30 },
    xAxis: {
      type: 'category',
      data: stats?.trend.map(t => t.time.split('T')[0].slice(5)) || [],
      axisLine: { lineStyle: { color: '#e2e8f0' } },
      axisLabel: { color: '#64748b', fontSize: 11 },
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
        type: 'line',
        smooth: true,
        data: stats?.trend.map(t => t.requests) || [],
        lineStyle: { color: '#3b82f6', width: 2 },
        itemStyle: { color: '#3b82f6' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(59, 130, 246, 0.2)' },
            { offset: 1, color: 'rgba(59, 130, 246, 0)' },
          ]),
        },
        symbol: 'circle',
        symbolSize: 6,
      },
    ],
  };

  // Risk distribution pie chart
  const pieOption = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      orient: 'vertical',
      right: 20,
      top: 'center',
      itemWidth: 12,
      itemHeight: 12,
      textStyle: { color: '#64748b', fontSize: 12 },
    },
    series: [
      {
        type: 'pie',
        radius: ['45%', '70%'],
        center: ['35%', '50%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: false },
        },
        data: stats
          ? [
              { value: stats.risk_distribution.high, name: '高', itemStyle: { color: '#ef4444' } },
              { value: stats.risk_distribution.medium, name: '中', itemStyle: { color: '#eab308' } },
              { value: stats.risk_distribution.low, name: '低', itemStyle: { color: '#22c55e' } },
            ]
          : [],
      },
    ],
  };

  const handlePieClick = (params: any) => {
    if (params.name === '高') {
      navigate('/audit?risk_level=high');
    } else if (params.name === '中') {
      navigate('/audit?risk_level=medium');
    }
  };

  return (
    <Layout
      title="概览"
      actions={
        <select
          value={period}
          onChange={e => setPeriod(e.target.value as Period)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="today">今天</option>
          <option value="7d">近7天</option>
          <option value="30d">近30天</option>
        </select>
      }
    >
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">加载中...</div>
        </div>
      ) : stats ? (
        <div className="space-y-6">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <StatCard
              label="总请求数"
              value={stats.total_requests}
              icon={<TrendingUp size={24} />}
            />
            <StatCard
              label="活跃设备"
              value={stats.active_devices}
              suffix="台"
              icon={<Smartphone size={24} />}
            />
            <StatCard
              label="风险事件"
              value={stats.risk_events}
              icon={<AlertTriangle size={24} />}
              className={stats.risk_events > 0 ? 'border-red-200' : ''}
            />
          </div>

          {/* Trend Chart */}
          <div className="bg-white rounded-lg border border-slate-200 p-5">
            <h3 className="text-base font-medium text-slate-700 mb-4">近7天请求趋势</h3>
            <ReactECharts option={trendOption} style={{ height: 280 }} />
          </div>

          {/* Bottom Row: Top Users + Risk Distribution */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Top 5 Users */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-medium text-slate-700 mb-4">Top 5 活跃用户</h3>
              <div className="space-y-3">
                {stats.top_users.map((user, idx) => (
                  <div key={user.user_id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : ''}
                      </span>
                      <span className="text-sm font-medium text-slate-700">{user.user_id}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-slate-500">{user.requests} 次</span>
                      {user.change !== undefined && (
                        <span className={`text-xs ${user.change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                          {user.change >= 0 ? '+' : ''}{user.change}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk Distribution */}
            <div className="bg-white rounded-lg border border-slate-200 p-5">
              <h3 className="text-base font-medium text-slate-700 mb-4">风险分布</h3>
              <ReactECharts
                option={pieOption}
                style={{ height: 220 }}
                onEvents={{ click: handlePieClick }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-64">
          <div className="text-slate-400">加载失败</div>
        </div>
      )}
    </Layout>
  );
}
