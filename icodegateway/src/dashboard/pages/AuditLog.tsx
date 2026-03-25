import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import { fetchAuditLogs, AuditLog } from '../api/client';
import { Search, Download, ChevronLeft, ChevronRight, X } from 'lucide-react';

type RiskLevel = 'low' | 'medium' | 'high' | '';

export default function AuditLogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  const page = parseInt(searchParams.get('page') || '1');
  const riskLevel = (searchParams.get('risk_level') || '') as RiskLevel;
  const userFilter = searchParams.get('user_id') || '';
  const startTime = searchParams.get('start_time') || getTodayDate();
  const endTime = searchParams.get('end_time') || getTodayDate();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword]);

  const loadLogs = useCallback(() => {
    setLoading(true);
    fetchAuditLogs({
      page,
      page_size: 50,
      user_id: userFilter || undefined,
      risk_level: riskLevel || undefined,
      start_time: startTime,
      end_time: endTime,
      keyword: debouncedKeyword || undefined,
    }).then(data => {
      setLogs(data.logs);
      setPagination(data.pagination);
      setLoading(false);
    });
  }, [page, riskLevel, userFilter, startTime, endTime, debouncedKeyword]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  function updateFilter(key: string, value: string) {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    if (key !== 'page') {
      newParams.set('page', '1');
    }
    setSearchParams(newParams);
  }

  function clearFilters() {
    setSearchParams({
      start_time: getTodayDate(),
      end_time: getTodayDate(),
    });
    setKeyword('');
    setDebouncedKeyword('');
  }

  function exportCSV() {
    const headers = ['时间', '用户', '设备', '风险等级', '内容摘要', '完整提示词', '完整响应摘要', '模型', '耗时(ms)'];
    const rows = logs.map(log => [
      formatTime(log.created_at),
      log.user_id,
      log.device_id,
      log.risk_level,
      log.prompt_summary,
      log.prompt_summary,
      log.response_summary,
      log.metadata.model || '',
      log.metadata.duration_ms || '',
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${getTodayDate()}.csv`;
    link.click();
  }

  function formatTime(iso: string) {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { hour12: false });
  }

  function highlightKeyword(text: string, kw: string) {
    if (!kw) return text;
    const parts = text.split(new RegExp(`(${kw})`, 'gi'));
    return parts.map((p, i) =>
      p.toLowerCase() === kw.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200">{p}</mark>
      ) : p
    );
  }

  return (
    <Layout
      title="审计日志"
      actions={
        <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
          <Download size={16} />
          导出CSV
        </button>
      }
    >
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">时间范围:</label>
            <input type="date" value={startTime} onChange={e => updateFilter('start_time', e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <span className="text-slate-400">至</span>
            <input type="date" value={endTime} onChange={e => updateFilter('end_time', e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">用户:</label>
            <input type="text" value={userFilter} onChange={e => updateFilter('user_id', e.target.value)}
              placeholder="全部" className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-28" />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-slate-500">风险等级:</label>
            <select value={riskLevel} onChange={e => updateFilter('risk_level', e.target.value)}
              className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">全部</option>
              <option value="low">🟢低</option>
              <option value="medium">🟡中</option>
              <option value="high">🔴高</option>
            </select>
          </div>

          <div className="flex-1 flex items-center gap-2">
            <div className="relative flex-1 max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
                placeholder="搜索关键词..." className="w-full pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {(userFilter || riskLevel || keyword) && (
            <button onClick={clearFilters} className="flex items-center gap-1 px-2 py-1.5 text-sm text-slate-500 hover:text-slate-700">
              <X size={14} />
              清除筛选
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500 w-20">时间</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 w-24">用户</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 w-32">设备</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 w-16">风险</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">内容摘要</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">加载中...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">暂无数据</td></tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}>
                      <td className="px-4 py-3 text-sm text-slate-600 font-mono">
                        {formatTime(log.created_at).split(' ')[1]}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{log.user_id}</td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono truncate">{log.device_id.slice(0, 16)}...</td>
                      <td className="px-4 py-3"><RiskBadge level={log.risk_level} size="sm" /></td>
                      <td className="px-4 py-3 text-sm text-slate-600 truncate max-w-md">
                        {highlightKeyword(log.prompt_summary.slice(0, 50), debouncedKeyword)}
                        {log.prompt_summary.length > 50 ? '...' : ''}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="border-t border-slate-100 bg-slate-50">
                        <td colSpan={5} className="px-4 py-4">
                          <div className="text-sm space-y-3">
                            <div className="grid grid-cols-4 gap-4">
                              <div><span className="text-slate-500">请求时间：</span><span className="text-slate-700 ml-1">{formatTime(log.created_at)}</span></div>
                              <div><span className="text-slate-500">会话ID：</span><span className="text-slate-700 ml-1 font-mono text-xs">{log.request_id.slice(0, 20)}...</span></div>
                              <div><span className="text-slate-500">模型：</span><span className="text-slate-700 ml-1">{log.metadata.model || '-'}</span></div>
                              <div><span className="text-slate-500">耗时：</span><span className="text-slate-700 ml-1">{log.metadata.duration_ms} ms</span></div>
                            </div>
                            <div><span className="text-slate-500">设备ID：</span><span className="text-slate-700 ml-1 font-mono text-xs">{log.device_id}</span></div>
                            <div><span className="text-slate-500">风险等级：</span><RiskBadge level={log.risk_level} /></div>
                            <div className="border-t border-slate-200 pt-3">
                              <div className="mb-2 text-slate-500">完整提示词：</div>
                              <div className="bg-white rounded border border-slate-200 p-3 max-h-40 overflow-y-auto text-slate-700">
                                {highlightKeyword(log.prompt_summary.slice(0, 1000), debouncedKeyword)}
                              </div>
                            </div>
                            <div>
                              <div className="mb-2 text-slate-500">完整响应摘要：</div>
                              <div className="bg-white rounded border border-slate-200 p-3 max-h-40 overflow-y-auto text-slate-700">
                                {log.response_summary.slice(0, 1000)}
                              </div>
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

        <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
          <div className="text-sm text-slate-500">
            第 {pagination.page} 页 / 共 {pagination.total_pages} 页
            <span className="ml-2">(共 {pagination.total} 条)</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => updateFilter('page', String(page - 1))} disabled={page <= 1}
              className="p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronLeft size={18} />
            </button>
            <button onClick={() => updateFilter('page', String(page + 1))} disabled={page >= pagination.total_pages}
              className="p-1.5 text-slate-500 hover:text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function getTodayDate() {
  const d = new Date();
  return d.toISOString().split('T')[0];
}
