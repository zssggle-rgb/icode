import React, { useEffect, useState } from 'react';
import { Bell, CheckCircle, AlertTriangle, ShieldAlert, Clock } from 'lucide-react';

interface Alert {
  id: string;
  type: string;
  user_id: string;
  device_id: string;
  status: 'pending' | 'resolved';
  detail: {
    prompt_summary?: string;
    keyword?: string;
    risk_level?: string;
    response_summary?: string;
  };
  created_at: string;
  resolved_by?: string;
  resolved_at?: string;
  note?: string;
}

const alertTypeLabels: Record<string, string> = {
  cross_project_attempt: '跨项目访问尝试',
  high_risk_keyword: '高风险关键词命中',
  high_risk_leakage: '高风险泄露告警',
};

const GatewayAlerts: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pending' | 'resolved'>('pending');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [noteMap, setNoteMap] = useState<Record<string, string>>({});

  const fetchAlerts = (status: 'pending' | 'resolved') => {
    setLoading(true);
    fetch(`/api/v1/alerts?status=${status}`)
      .then(res => res.json())
      .then(res => {
        if (res.code === 0) {
          setAlerts(res.data.alerts || []);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAlerts(activeTab);
  }, [activeTab]);

  const resolveAlert = async (id: string, note: string) => {
    setProcessing(id);
    try {
      await fetch(`/api/v1/alerts/${id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note }),
      });
      fetchAlerts(activeTab);
    } catch (err) {
      console.error('处理告警失败', err);
    }
    setProcessing(null);
  };

  const formatTime = (iso: string) => {
    try {
      return new Date(iso).toLocaleString('zh-CN', { hour12: false });
    } catch {
      return iso;
    }
  };

  const getRiskIcon = (type: string) => {
    if (type === 'high_risk_leakage') return <ShieldAlert size={16} className="text-red-500" />;
    if (type === 'high_risk_keyword') return <AlertTriangle size={16} className="text-orange-500" />;
    return <Bell size={16} className="text-blue-500" />;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-slate-800">告警中心</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'pending'
                ? 'bg-red-50 text-red-600 border border-red-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            待处理
          </button>
          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'resolved'
                ? 'bg-green-50 text-green-600 border border-green-200'
                : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
            }`}
          >
            已处理
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">加载中...</div>
        ) : alerts.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <CheckCircle size={32} className="mx-auto mb-2 text-green-400" />
            <p>暂无{activeTab === 'pending' ? '待处理' : '已处理'}告警</p>
          </div>
        ) : (
          alerts.map(alert => (
            <div key={alert.id} className="p-4 border-b border-slate-100 last:border-0 hover:bg-slate-50">
              <div className="flex items-start gap-3">
                <div className="mt-0.5">{getRiskIcon(alert.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-800">
                      {alertTypeLabels[alert.type] || alert.type}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      alert.status === 'pending'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {alert.status === 'pending' ? '待处理' : '已处理'}
                    </span>
                  </div>

                  {alert.detail.prompt_summary && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="text-slate-400">Prompt:</span> {alert.detail.prompt_summary}
                    </p>
                  )}
                  {alert.detail.keyword && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="text-slate-400">关键词:</span> <code className="bg-slate-100 px-1 rounded text-xs">{alert.detail.keyword}</code>
                    </p>
                  )}
                  {alert.detail.risk_level && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="text-slate-400">风险等级:</span> <span className={`font-medium ${
                        alert.detail.risk_level === 'high' ? 'text-red-600' :
                        alert.detail.risk_level === 'medium' ? 'text-orange-600' : 'text-green-600'
                      }`}>{alert.detail.risk_level}</span>
                    </p>
                  )}

                  <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                    <span className="flex items-center gap-1"><Clock size={12} /> {formatTime(alert.created_at)}</span>
                    {alert.user_id && <span>用户: {alert.user_id}</span>}
                    {alert.resolved_by && <span>处理人: {alert.resolved_by}</span>}
                  </div>

                  {alert.note && (
                    <p className="text-xs text-slate-500 mt-1 italic">备注: {alert.note}</p>
                  )}

                  {alert.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <input
                        type="text"
                        placeholder="处理备注（可选）"
                        value={noteMap[alert.id] || ''}
                        onChange={e => setNoteMap({ ...noteMap, [alert.id]: e.target.value })}
                        className="flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        onClick={() => resolveAlert(alert.id, noteMap[alert.id] || '')}
                        disabled={processing === alert.id}
                        className="px-4 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50"
                      >
                        {processing === alert.id ? '处理中...' : '标记已处理'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GatewayAlerts;
