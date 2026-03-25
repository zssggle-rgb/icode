import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { fetchDevices, updateDeviceStatus, Device, DeviceStatus } from '../api/client';
import { Smartphone, Search, Ban, CheckCircle2, XCircle } from 'lucide-react';

const statusConfig: Record<DeviceStatus, { label: string; color: string; icon: React.ReactNode }> = {
  active: { label: '活跃', color: 'bg-green-100 text-green-700', icon: <span className="text-green-500">🟢</span> },
  idle: { label: '闲置', color: 'bg-yellow-100 text-yellow-700', icon: <span className="text-yellow-500">🟡</span> },
  pending: { label: '未审批', color: 'bg-red-100 text-red-700', icon: <span className="text-red-500">🔴</span> },
  blocked: { label: '已禁用', color: 'bg-slate-200 text-slate-500', icon: <span className="text-slate-400">⚫</span> },
};

export default function Devices() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('');
  const [approveModal, setApproveModal] = useState<{ open: boolean; device: Device | null; action: 'approve' | 'reject' }>({ open: false, device: null, action: 'approve' });
  const [disableModal, setDisableModal] = useState<{ open: boolean; device: Device | null }>({ open: false, device: null });
  const [operating, setOperating] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    const data = await fetchDevices();
    setDevices(data.devices);
    setTotal(data.total);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleApproveOrReject = async () => {
    if (!approveModal.device) return;
    setOperating(true);
    try {
      await updateDeviceStatus(
        approveModal.device.id,
        approveModal.action === 'approve' ? 'active' : 'blocked'
      );
      setApproveModal({ open: false, device: null, action: 'approve' });
      loadDevices();
    } finally {
      setOperating(false);
    }
  };

  const handleDisable = async () => {
    if (!disableModal.device) return;
    setOperating(true);
    try {
      await updateDeviceStatus(disableModal.device.id, 'blocked');
      setDisableModal({ open: false, device: null });
      loadDevices();
    } finally {
      setOperating(false);
    }
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString('zh-CN', { hour12: false });
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN');
  };

  const filteredDevices = devices.filter(d => {
    const matchSearch = !search || d.id.toLowerCase().includes(search.toLowerCase()) || d.user_id.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <Layout
      title="设备注册表"
      actions={
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Smartphone size={16} />
          <span>设备总数 <span className="font-semibold text-slate-700">{total}</span> 台</span>
        </div>
      }
    >
      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="搜索设备指纹或用户..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as DeviceStatus | '')}
            className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">全部状态</option>
            <option value="active">活跃</option>
            <option value="idle">闲置</option>
            <option value="pending">未审批</option>
            <option value="blocked">已禁用</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs">
                <th className="px-4 py-3 text-left font-medium">设备指纹</th>
                <th className="px-4 py-3 text-left font-medium w-[120px]">用户</th>
                <th className="px-4 py-3 text-center font-medium w-[90px]">状态</th>
                <th className="px-4 py-3 text-left font-medium w-[120px]">最后活跃</th>
                <th className="px-4 py-3 text-left font-medium w-[120px]">注册时间</th>
                <th className="px-4 py-3 text-center font-medium w-[140px]">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">加载中...</td>
                </tr>
              ) : filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">暂无设备</td>
                </tr>
              ) : (
                filteredDevices.map(device => (
                  <tr key={device.id} className="border-t border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-slate-600">{device.id}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{device.user_id || '—'}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[device.status].color}`}>
                        {statusConfig[device.status].icon}
                        {statusConfig[device.status].label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <div>{formatDate(device.last_seen_at)}</div>
                      <div>{formatTime(device.last_seen_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      <div>{formatDate(device.created_at)}</div>
                      <div>{formatTime(device.created_at)}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {device.status === 'pending' ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setApproveModal({ open: true, device, action: 'approve' })}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-green-500 rounded-lg hover:bg-green-600 transition-colors"
                          >
                            <CheckCircle2 size={12} /> 通过
                          </button>
                          <button
                            onClick={() => setApproveModal({ open: true, device, action: 'reject' })}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                          >
                            <XCircle size={12} /> 拒绝
                          </button>
                        </div>
                      ) : device.status === 'active' || device.status === 'idle' ? (
                        <button
                          onClick={() => setDisableModal({ open: true, device })}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                        >
                          <Ban size={12} /> 禁用
                        </button>
                      ) : device.status === 'blocked' ? (
                        <span className="text-xs text-slate-400">已禁用</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Approve/Reject Modal */}
      <ConfirmModal
        isOpen={approveModal.open}
        title={approveModal.action === 'approve' ? '审批设备' : '拒绝设备'}
        message={
          <div>
            <p className="mb-2">
              {approveModal.action === 'approve' ? '确认通过以下设备的接入申请？' : '确认拒绝以下设备？'}
            </p>
            {approveModal.device && (
              <div className="bg-slate-100 rounded p-3 text-sm">
                <div><span className="text-slate-500">设备指纹：</span><span className="font-mono">{approveModal.device.id}</span></div>
                <div><span className="text-slate-500">用户：</span>{approveModal.device.user_id}</div>
              </div>
            )}
          </div>
        }
        confirmText={operating ? '处理中...' : (approveModal.action === 'approve' ? '通过' : '拒绝')}
        danger={approveModal.action === 'reject'}
        onConfirm={handleApproveOrReject}
        onCancel={() => setApproveModal({ open: false, device: null, action: 'approve' })}
      />

      {/* Disable Modal */}
      <ConfirmModal
        isOpen={disableModal.open}
        title="禁用设备"
        message={
          <div>
            <p className="mb-2">确认禁用以下设备？禁用后该设备发出的请求将一律返回 403。</p>
            {disableModal.device && (
              <div className="bg-slate-100 rounded p-3 text-sm">
                <div><span className="text-slate-500">设备指纹：</span><span className="font-mono">{disableModal.device.id}</span></div>
                <div><span className="text-slate-500">用户：</span>{disableModal.device.user_id}</div>
              </div>
            )}
          </div>
        }
        confirmText={operating ? '禁用中...' : '确认禁用'}
        danger
        onConfirm={handleDisable}
        onCancel={() => setDisableModal({ open: false, device: null })}
      />
    </Layout>
  );
}
