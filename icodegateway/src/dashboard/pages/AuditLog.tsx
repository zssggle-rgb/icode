import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import { fetchAuditLogs, AuditLog, AuditLogsResponse } from '../api/client';
import { Search, Download, X, ChevronLeft, ChevronRight } from 'lucide-react';

const PAGE_SIZE = 50;

export default function AuditLog() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({ page: 1, page_size: 50, total: 0, total_pages: 0 });
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRisk, setSelectedRisk] = useState('');
  const [searchTime, setSearchTime] = useState('');

  // Get filter values from URL params
  useEffect(() => {
    const page = parseInt(searchParams.get('page') || '1');
    const user = searchParams.get('user_id') || '';
    const risk = searchParams.get('risk_level') || '';
    const start = searchParams.get('start_time') || '';
    const kw = searchParams.get('keyword') || '';
    setPagination(prev => ({ ...prev, page }));
    setSelectedUser(user);
    setSelectedRisk(risk);
    setSearchTime(start);
    setKeyword(kw);
  }, []);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    const page = parseInt(searchParams.get('page') || '1');
    const data = await fetchAuditLogs({
      page,
      page_size: PAGE_SIZE,
      user_id: selectedUser || undefined,
      risk_level: selectedRisk || undefined,
      start_time: searchTime || undefined,
      keyword: keyword || undefined,
    });
    setLogs(data.logs);
    setPagination(data.pagination);
    setLoading(false);
  }, [searchParams, selectedUser, selectedRisk, searchTime, keyword]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Debounced keyword search
  useEffect(() => {
    const timer = setTimeout(() => {
      const params: Record<string, string> = {};
      if (keyword) params.keyword = keyword;
      if (selectedUser) params.user_id = selectedUser;
      if (selectedRisk) params.risk_level = selectedRisk;
      if (searchTime) params.start_time = searchTime;
      setSearchParams(params);
    }, 300);
    return () => clearTimeout(timer);
  }, [keyword, selectedUser, selectedRisk, searchTime]);

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams);
    params.set('page', String(newPage));
    setSearchParams(params);
  };

  const clearFilters = () => {
    setKeyword('');
    setSelectedUser('');
    setSelectedRisk('');
    setSearchTime('');
    setSearchParams({});
  };

  const handleExport = () => {
    const headers = ['时间', '用户', '设备', '风险等级', '内容摘要', '完整提示词', '完整响应摘要', '模型', '耗时(ms)'];
    const rows = logs.map(log => [
      log.created_at,
      log.user_id,
      log.device_id,
      log.risk_level,
      log.prompt_summary,
      log.prompt_summary,
      log.response_summary,
      log.metadata.model || '',
      log.metadata.duration_ms?.toString() || '',
    ]);
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `审计日志_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN');
  };

  const highlightKeyword = (text: string, kw: string) => {
    if (!kw || !text) return text;
    const idx = text.toLowerCase().indexOf(kw.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200">{text.slice(idx, idx + kw.length)}</mark>
        {text.slice(idx + kw.length)}
      </>
    );
  };

  return (
    <Layout title="审计日志">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索关键词..."
              value={keyword}
              onChange={e => setKeyword(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部用户</option>
            <option value="zhangsan">zhangsan</option>
            <option value="lisi">lisi</option>
            <option value="wangwu">wangwu</option>
          </select>
          <select
            value={selectedRisk}
            onChange={e => setSelectedRisk(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部风险</option>
            <option value="low">低</option>
            <option value="medium">中</option>
            <option value="high">高</option>
          </select>
          <input
            type="date"
            value={searchTime}
            onChange={e => setSearchTime(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {(keyword || selectedUser || selectedRisk || searchTime) && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              <X size={14} /> 清除筛选
            </button>
          )}
          <div className="flex-1" />
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Download size={14} /> 导出CSV
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="px-4 py-3 text-left font-medium w-[90px]">时间</th>
                <th className="px-4 py-3 text-left font-medium w-[100px]">用户</th>
                <th className="px-4 py-3 text-left font-medium w-[140px]">设备</th>
                <th className="px-4 py-3 text-center font-medium w-[60px]">风险</th>
                <th className="px-4 py-3 text-left font-medium">内容摘要</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">加载中...</td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">暂无数据</td>
                </tr>
              ) : (
                logs.map(log => (
                  <React.Fragment key={log.id}>
                    <tr
                      className={`border-t border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${expandedId === log.id ? 'bg-blue-50' : ''}`}
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                        <div className="text-slate-500 text-xs">{formatDate(log.created_at)}</div>
                        <div>{formatTime(log.created_at)}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{log.user_id}</td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-mono">{log.device_id.slice(0, 20)}...</td>
                      <td className="px-4 py-3 text-center">
                        <RiskBadge level={log.risk_level} showLabel={false} size="sm" />
                      </td>
                      <td className="px-4 py-3 text-slate-600 truncate max-w-xs">
                        {highlightKeyword(log.prompt_summary, keyword)}
                      </td>
                    </tr>
                    {expandedId === log.id && (
                      <tr className="border-t border-slate-100 bg-blue-50/50">
                        <td colSpan={5} className="px-6 py-4">
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 text-xs text-slate-500">
                            <div>
                              <span className="font-medium text-slate-700">请求时间：</span>
                              {formatDate(log.created_at)} {formatTime(log.created_at)}
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">会话ID：</span>
                              {log.request_id.slice(0, 8)}...
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">设备ID：</span>
                              <span className="font-mono">{log.device_id}</span>
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">模型：</span>
                              {log.metadata.model || '-'}（{log.metadata.provider || '-'}）
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">耗时：</span>
                              {log.metadata.duration_ms?.toLocaleString() || '-'} ms
                            </div>
                            <div>
                              <span className="font-medium text-slate-700">风险等级：</span>
                              <RiskBadge level={log.risk_level} size="sm" />
                            </div>
                            {log.cross_project_attempt && (
                              <div className="col-span-2 text-red-600">
                                ⚠️ 存在跨项目访问尝试
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div>
                              <div className="text-xs font-medium text-slate-500 mb-1">完整提示词：</div>
                              <div className="bg-white rounded border border-slate-200 p-3 text-sm text-slate-700 max-h-48 overflow-y-auto">
                                {log.prompt_summary.length > 1000
                                  ? log.prompt_summary.slice(0, 1000) + '...'
                                  : log.prompt_summary}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs font-medium text-slate-500 mb-1">完整响应摘要：</div>
                              <div className="bg-white rounded border border-slate-200 p-3 text-sm text-slate-700 max-h-48 overflow-y-auto">
                                {log.response_summary.length > 1000
                                  ? log.response_summary.slice(0, 1000) + '...'
                                  : log.response_summary}
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

        {/* Pagination */}
        {!loading && logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50">
            <div className="text-sm text-slate-500">
              第{pagination.page}页 / 共{pagination.total_pages}页，共{pagination.total}条
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={14} /> 上一页
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.total_pages}
                className="flex items-center gap-1 px-3 py-1.5 text-sm text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                下一页 <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
