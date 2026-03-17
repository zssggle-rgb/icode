
import React, { useEffect, useState } from 'react';
import { History, Search, Filter, Bot, AlertTriangle, CheckCircle, ShieldAlert } from 'lucide-react';

interface AuditLog {
  id: string;
  request_id: string;
  user_id: string;
  device_id: string;
  action: string;
  prompt_summary: string;
  risk_level: string;
  metadata: string;
  created_at: string;
}

const GatewayAuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/audit-logs')
      .then(res => res.json())
      .then(res => {
        if (res.code === 0) {
          // Sort logs by created_at desc if not already sorted
          const sortedLogs = res.data.sort((a: AuditLog, b: AuditLog) => 
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          setLogs(sortedLogs);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const getMetadata = (jsonStr: string) => {
    try {
      return JSON.parse(jsonStr);
    } catch {
      return {};
    }
  };

  return (
    <div className="space-y-6">
      {/* Header / Filter */}
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="搜索请求ID / 用户..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 text-sm">
            <Filter size={18} />
            <span>筛选</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <History size={20} className="text-blue-500" />
            最近审计记录
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3 w-40">时间</th>
                <th className="px-6 py-3 w-40">用户 / 设备</th>
                <th className="px-6 py-3 w-32">动作类型</th>
                <th className="px-6 py-3 w-64">内容摘要</th>
                <th className="px-6 py-3 w-32">风险等级</th>
                <th className="px-6 py-3">AI 审计分析</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    加载中...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    暂无审计记录
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const meta = getMetadata(log.metadata);
                  const aiAnalysis = meta.ai_analysis;
                  
                  return (
                  <tr key={log.id} className="bg-white border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800">{log.user_id || 'Unknown'}</div>
                      <div className="text-xs text-slate-400 font-mono mt-1">{log.device_id?.substring(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.action === 'chat_completion' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 max-w-xs truncate" title={log.prompt_summary}>
                      {log.prompt_summary || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        log.risk_level === 'high' ? 'bg-red-100 text-red-800' :
                        log.risk_level === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {log.risk_level === 'high' && <ShieldAlert size={12} className="mr-1" />}
                        {log.risk_level === 'medium' && <AlertTriangle size={12} className="mr-1" />}
                        {log.risk_level === 'low' && <CheckCircle size={12} className="mr-1" />}
                        {log.risk_level || 'low'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-600 text-xs">
                      {aiAnalysis ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-slate-700 font-medium">
                            <Bot size={14} className="text-indigo-500" />
                            <span>AI 判定: {aiAnalysis.risk_level}</span>
                          </div>
                          {aiAnalysis.tags && aiAnalysis.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {aiAnalysis.tags.map((tag: string, idx: number) => (
                                <span key={idx} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded border border-slate-200 text-[10px]">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                          {aiAnalysis.reason && (
                            <div className="text-slate-500 truncate max-w-xs" title={aiAnalysis.reason}>
                              {aiAnalysis.reason}
                            </div>
                          )}
                        </div>
                      ) : (
                         <div className="flex items-center gap-1 text-slate-400">
                            <div className="w-2 h-2 rounded-full bg-slate-300"></div>
                            Waiting for Analysis...
                         </div>
                      )}
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GatewayAuditLogs;
