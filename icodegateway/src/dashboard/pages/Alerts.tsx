import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import RiskBadge from '../components/RiskBadge';
import ConfirmModal from '../components/ConfirmModal';
import { fetchAlerts, resolveAlert, Alert } from '../api/client';
import { Bell, CheckCircle } from 'lucide-react';

type AlertStatus = 'pending' | 'resolved';
type AlertTab = AlertStatus;

const alertTypeLabels: Record<string, string> = {
  cross_project_attempt: '跨项目访问尝试',
  high_risk_keyword: '高风险关键词命中',
  high_risk_leakage: '高风险泄露告警',
};

const alertTypeColors: Record<string, string> = {
  cross_project_attempt: 'text-red-600',
  high_risk_keyword: 'text-red-600',
  high_risk_leakage: 'text-red-600',
};

export default function AlertsPage() {
  const [activeTab, setActiveTab] = useState<AlertTab>('pending');
  const [pendingAlerts, setPendingAlerts] = useState<Alert[]>([]);
  const [resolvedAlerts, setResolvedAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [processModal, setProcessModal] = useState<{ open: boolean; alert: Alert | null }>({ open: false, alert: null });
  const [processNote, setProcessNote] = useState('');
  const [processing, setProcessing] = useState(false);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    const [pending, resolved] = await Promise.all([
      fetchAlerts('pending'),
      fetchAlerts('resolved'),
    ]);
    setPendingAlerts(pending.alerts);
    setResolvedAlerts(resolved.alerts);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAlerts();
  }, [loadAlerts]);

  const handleResolve = async () => {
    if (!processModal.alert) return;
    setProcessing(true);
    try {
      await resolveAlert(processModal.alert.id, processNote);
      await loadAlerts();
      setProcessModal({ open: false, alert: null });
      setProcessNote('');
    } catch (err) {
      console.error('处理告警失败', err);
    }
    setProcessing(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { hour12: false });
  };

  const alerts = activeTab === 'pending' ? pendingAlerts : resolvedAlerts;

  return (
    <Layout title="告警中心">
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'pending'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Bell size={18} />
          未处理
          {pendingAlerts.length > 0 && (
            <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">{pendingAlerts.length}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('resolved')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'resolved'
              ? 'bg-green-50 text-green-600 border border-green-200'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <CheckCircle size={18} />
          已处理
          <span className="text-slate-400 text-sm">({resolvedAlerts.length})</span>
        </button>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">加载中...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-lg border border-slate-200 p-12 text-center text-slate-400">
            {activeTab === 'pending' ? '暂无未处理告警' : '暂无已处理告警'}
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-5 py-4 cursor-pointer hover:bg-slate-50" onClick={() => setExpandedId(expandedId === alert.id ? null : alert.id)}>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">🔴</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${alertTypeColors[alert.type]}`}>
                          [{activeTab === 'pending' ? '未处理' : '已处理'}]
                        </span>
                        <span className="font-medium text-slate-700">{alertTypeLabels[alert.type]}</span>
                      </div>
                      <div className="mt-1 text-sm text-slate-500">
                        <span>{alert.user_id}</span>
                        <span className="mx-2">—</span>
                        <span className="font-mono">{alert.device_id.slice(0, 16)}...</span>
                      </div>
                      <div className="mt-2 text-sm text-slate-600">
                        {alert.type === 'cross_project_attempt' && (
                          <span>提示词涉及 {alert.detail.target_repo}（该用户{alert.detail.user_permission === 'none' ? '无权限访问' : '有权限'}）</span>
                        )}
                        {alert.type === 'high_risk_keyword' && (
                          <span>命中关键词：{alert.detail.keyword}</span>
                        )}
                        {alert.type === 'high_risk_leakage' && (
                          <span>响应含敏感词：{alert.detail.keyword}</span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-400">时间：{formatTime(alert.created_at)}</div>
                    </div>
                  </div>
                  {activeTab === 'pending' && (
                    <button
                      onClick={e => { e.stopPropagation(); setProcessModal({ open: true, alert }); }}
                      className="px-3 py-1.5 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      标记已处理
                    </button>
                  )}
                </div>
              </div>

              {expandedId === alert.id && (
                <div className="px-5 py-4 bg-slate-50 border-t border-slate-200">
                  <div className="text-sm space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div><span className="text-slate-500">告警类型：</span><span className="ml-1">{alertTypeLabels[alert.type]}</span></div>
                      <div><span className="text-slate-500">触发时间：</span><span className="ml-1">{formatTime(alert.created_at)}</span></div>
                      <div><span className="text-slate-500">用户：</span><span className="ml-1">{alert.user_id}</span></div>
                      <div><span className="text-slate-500">设备：</span><span className="ml-1 font-mono text-xs">{alert.device_id}</span></div>
                    </div>
                    <div className="border-t border-slate-200 pt-3 mt-3">
                      <div className="font-medium text-slate-700 mb-2">触发内容：</div>
                      <div className="bg-white rounded border border-slate-200 p-3">
                        <div className="text-slate-500 text-xs mb-1">提示词摘要：</div>
                        <div className="text-slate-700">{alert.detail.prompt_summary || '-'}</div>
                        {alert.detail.target_repo && (
                          <><div className="text-slate-500 text-xs mt-2 mb-1">目标仓库：</div><div className="text-slate-700">{alert.detail.target_repo}</div></>
                        )}
                        {alert.detail.keyword && (
                          <><div className="text-slate-500 text-xs mt-2 mb-1">命中关键词：</div><div className="text-slate-700">{alert.detail.keyword}</div></>
                        )}
                      </div>
                    </div>
                    {activeTab === 'resolved' && alert.note && (
                      <div className="border-t border-slate-200 pt-3 mt-3">
                        <div className="grid grid-cols-2 gap-2 text-slate-500 text-xs">
                          <span>处理人：{alert.resolved_by}</span>
                          <span>处理时间：{alert.resolved_at ? formatTime(alert.resolved_at) : '-'}</span>
                        </div>
                        <div className="mt-2"><span className="text-slate-500">备注：</span><span className="ml-1 text-slate-700">{alert.note}</span></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={processModal.open}
        title="处理告警"
        message={
          <div>
            <p className="mb-3">确定要处理此告警吗？</p>
            <label className="block text-sm font-medium text-slate-700 mb-1">添加备注（可选）</label>
            <textarea value={processNote} onChange={e => setProcessNote(e.target.value)} placeholder="输入处理备注..."
              rows={3} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          </div>
        }
        confirmText="确认处理"
        onConfirm={handleResolve}
        onCancel={() => { setProcessModal({ open: false, alert: null }); setProcessNote(''); }}
      />
    </Layout>
  );
}
