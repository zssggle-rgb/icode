import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { fetchAlerts, resolveAlert, Alert, AlertsResponse } from '../api/client';
import { Bell, CheckCircle2, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react';

const alertTypeLabels: Record<string, string> = {
  cross_project_attempt: '跨项目访问尝试',
  high_risk_keyword: '高风险关键词命中',
  high_risk_leakage: '高风险泄露告警',
};

export default function Alerts() {
  const [tab, setTab] = useState<'pending' | 'resolved'>('pending');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [resolvedCount, setResolvedCount] = useState(0);
  const [resolveModal, setResolveModal] = useState<{ open: boolean; alert: Alert | null }>({ open: false, alert: null });
  const [resolveNote, setResolveNote] = useState('');
  const [resolving, setResolving] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const [pending, resolved] = await Promise.all([
      fetchAlerts('pending', 1),
      fetchAlerts('resolved', 1),
    ]);
    setAlerts(tab === 'pending' ? pending.alerts : resolved.alerts);
    setPendingCount(pending.pagination.total);
    setResolvedCount(resolved.pagination.total);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolve = async () => {
    if (!resolveModal.alert) return;
    setResolving(true);
    try {
      await resolveAlert(resolveModal.alert.id, resolveNote);
      setResolveModal({ open: false, alert: null });
      setResolveNote('');
      loadAlerts();
    } finally {
      setResolving(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN');
  };

  return (
    <Layout title="告警中心">
      {/* Tab Counts */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-slate-400" />
          <button
            onClick={() => setTab('pending')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'pending'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            未处理 {pendingCount > 0 && <span className="ml-1 text-red-400">({pendingCount}条)</span>}
          </button>
          <button
            onClick={() => setTab('resolved')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              tab === 'resolved'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            已处理 {resolvedCount > 0 && <span className="ml-1 text-slate-400">({resolvedCount}条)</span>}
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">加载中...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
            <CheckCircle2 size={40} className="mx-auto mb-3 text-green-300" />
            <p>暂无{tab === 'pending' ? '未处理' : '已处理'}告警</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              {/* Alert Header */}
              <div
                className="px-5 py-4 cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {tab === 'pending' ? (
                        <AlertTriangle size={18} className="text-red-500" />
                      ) : (
                        <CheckCircle2 size={18} className="text-green-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          tab === 'pending' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {tab === 'pending' ? '未处理' : '已处理'}
                        </span>
                        <span className="text-sm font-medium text-slate-700">
                          {alertTypeLabels[alert.type] || alert.type}
                        </span>
                      </div>
                      <p className="text-sm text-slate-500">
                        <span className="text-slate-700 font-medium">{alert.user_id}</span>
                        {' — '}
                        <span className="font-mono text-xs">{alert.device_id.slice(0, 16)}...</span>
                      </p>
                      <p className="text-sm text-slate-500 mt-1">
                        {alert.detail.prompt_summary || alert.detail.response_summary || '-'}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-xs text-slate-400">{formatTime(alert.created_at)}</div>
                    {expandedId === alert.id ? (
                      <ChevronUp size={16} className="text-slate-400" />
                    ) : (
                      <ChevronDown size={16} className="text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Quick Actions for Pending */}
                {tab === 'pending' && expandedId !== alert.id && (
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={e => { e.stopPropagation(); setExpandedId(alert.id); }}
                      className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      查看详情
                    </button>
                    <button
                      onClick={e => { e.stopPropagation(); setResolveModal({ open: true, alert }); }}
                      className="px-3 py-1.5 text-xs font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      标记已处理
                    </button>
                  </div>
                )}
              </div>

              {/* Expanded Detail */}
              {expandedId === alert.id && (
                <div className="px-5 pb-5 border-t border-slate-100 pt-4 bg-slate-50/50">
                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="text-slate-500">告警类型：</span>
                      <span className="text-slate-700">{alertTypeLabels[alert.type] || alert.type}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">触发时间：</span>
                      <span className="text-slate-700">{formatTime(alert.created_at)}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">用户：</span>
                      <span className="text-slate-700">{alert.user_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">设备：</span>
                      <span className="text-slate-700 font-mono text-xs">{alert.device_id}</span>
                    </div>
                  </div>

                  {/* Type-specific details */}
                  {alert.type === 'cross_project_attempt' && (
                    <div className="bg-white rounded border border-slate-200 p-3 mb-4">
                      <div className="text-xs font-medium text-slate-500 mb-2">触发内容：</div>
                      <div className="text-sm text-slate-700 mb-2">提示词摘要：{alert.detail.prompt_summary}</div>
                      <div className="text-sm text-slate-700 mb-1">
                        <span className="text-slate-500">目标仓库：</span>{alert.detail.target_repo}
                      </div>
                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">用户权限：</span>
                        <span className={alert.detail.user_permission === 'none' ? 'text-red-600' : 'text-green-600'}>
                          {alert.detail.user_permission === 'none' ? '无权限' : alert.detail.user_permission}
                        </span>
                      </div>
                    </div>
                  )}

                  {alert.type === 'high_risk_keyword' && (
                    <div className="bg-white rounded border border-slate-200 p-3 mb-4">
                      <div className="text-xs font-medium text-slate-500 mb-2">触发内容：</div>
                      <div className="text-sm text-slate-700 mb-2">提示词摘要：{alert.detail.prompt_summary}</div>
                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">命中关键词：</span>
                        <span className="text-red-600 font-mono">{alert.detail.keyword}</span>
                      </div>
                    </div>
                  )}

                  {alert.type === 'high_risk_leakage' && (
                    <div className="bg-white rounded border border-slate-200 p-3 mb-4">
                      <div className="text-xs font-medium text-slate-500 mb-2">触发内容：</div>
                      <div className="text-sm text-slate-700">
                        <span className="text-slate-500">命中关键词：</span>
                        <span className="text-red-600 font-mono">{alert.detail.keyword}</span>
                      </div>
                      <div className="text-sm text-slate-700 mt-2">
                        <span className="text-slate-500">响应摘要：</span>{alert.detail.response_summary}
                      </div>
                    </div>
                  )}

                  {/* Resolved info */}
                  {tab === 'resolved' && (
                    <div className="bg-green-50 rounded border border-green-200 p-3 mb-4">
                      <div className="text-sm text-green-700">
                        <span className="font-medium">处理人：</span>{alert.resolved_by}
                        <span className="mx-3">|</span>
                        <span className="font-medium">处理时间：</span>{alert.resolved_at ? formatTime(alert.resolved_at) : '-'}
                      </div>
                      {alert.note && (
                        <div className="text-sm text-green-700 mt-1">
                          <span className="font-medium">备注：</span>{alert.note}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Actions */}
                  {tab === 'pending' && (
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setResolveModal({ open: true, alert })}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                      >
                        确认处理
                      </button>
                      <button
                        onClick={() => setExpandedId(null)}
                        className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        收起
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Resolve Modal */}
      <ConfirmModal
        isOpen={resolveModal.open}
        title="处理告警"
        message={<span>确认处理此告警？可填写处理备注。</span>}
        confirmText={resolving ? '处理中...' : '确认处理'}
        onConfirm={handleResolve}
        onCancel={() => { setResolveModal({ open: false, alert: null }); setResolveNote(''); }}
        showInput
        inputLabel="处理备注（可选）"
        inputPlaceholder="请输入处理备注..."
      />
    </Layout>
  );
}
