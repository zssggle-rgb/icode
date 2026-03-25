import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal';
import { fetchDevices, updateDeviceStatus, Device, DeviceStatus } from '../api/client';
import { Smartphone, Search } from 'lucide-react';

const statusConfig: Record<DeviceStatus, { emoji: string; label: string; color: string }> = {
  active: { emoji: '🟢', label: '活跃', color: 'text-green-600' },
  idle: { emoji: '🟡', label: '闲置', color: 'text-yellow-600' },
  pending: { emoji: '🔴', label: '未审批', color: 'text-red-600' },
  blocked: { emoji: '⚫', label: '已禁用', color: 'text-slate-500' },
};

export default function DevicesPage() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | ''>('');
  const [disableModal, setDisableModal] = useState<{ open: boolean; device: Device | null }>({ open: false, device: null });
  const [approveModal, setApproveModal] = useState<{ open: boolean; device: Device | null }>({ open: false, device: null });
  const [processing, setProcessing] = useState(false);

  const loadDevices = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchDevices();
      setDevices(data.devices);
      setTotal(data.total);
    } catch (err) {
      console.error('加载设备失败', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadDevices();
  }, [loadDevices]);

  const handleDisable = async () => {
    if (!disableModal.device) return;
    setProcessing(true);
    try {
      await updateDeviceStatus(disableModal.device.id, 'blocked');
      await loadDevices();
      setDisableModal({ open: false, device: null });
    } catch (err) {
      console.error('禁用设备失败', err);
    }
    setProcessing(false);
  };

  const handleApprove = async (approve: boolean) => {
    if (!approveModal.device) return;
    setProcessing(true);
    try {
      await updateDeviceStatus(approveModal.device.id, approve ? 'active' : 'blocked');
      await loadDevices();
      setApproveModal({ open: false, device: null });
    } catch (err) {
      console.error(approve ? '审批设备失败' : '拒绝设备失败', err);
    }
    setProcessing(false);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('zh-CN', { hour12: false }).split(' ')[1];
  };

  const filteredDevices = devices.filter(d => {
    const matchKeyword = !searchKeyword || d.id.toLowerCase().includes(searchKeyword.toLowerCase()) || d.user_id.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchStatus = !statusFilter || d.status === statusFilter;
    return matchKeyword && matchStatus;
  });

  return (
    <Layout title="设备注册表" actions={<span className="text-sm text-slate-500">设备总数 <span className="font-medium text-slate-700">{total}</span> 台</span>}>
      <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={searchKeyword} onChange={e => setSearchKeyword(e.target.value)} placeholder="搜索设备..."
              className="pl-9 pr-3 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64" />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as DeviceStatus | '')}
            className="px-2 py-1.5 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">全部状态</option>
            <option value="active">🟢 活跃</option>
            <option value="idle">🟡 闲置</option>
            <option value="pending">🔴 未审批</option>
            <option value="blocked">⚫ 已禁用</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left">
                <th className="px-4 py-3 text-xs font-medium text-slate-500">设备指纹</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">用户</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">状态</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500">最后活跃</th>
                <th className="px-4 py-3 text-xs font-medium text-slate-500 text-right">操作</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">加载中...</td></tr>
              ) : filteredDevices.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-slate-400">暂无设备</td></tr>
              ) : (
                filteredDevices.map(device => {
                  const config = statusConfig[device.status];
                  return (
                    <tr key={device.id} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Smartphone size={16} className="text-slate-400" />
                          <span className="text-sm font-mono text-slate-700">{device.id.slice(0, 20)}...</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">{device.user_id || '—'}</td>
                      <td className="px-4 py-3"><span className={`text-sm ${config.color}`}>{config.emoji} {config.label}</span></td>
                      <td className="px-4 py-3 text-sm text-slate-500 font-mono">{formatTime(device.last_seen_at)}</td>
                      <td className="px-4 py-3 text-right">
                        {device.status === 'pending' ? (
                          <button onClick={() => setApproveModal({ open: true, device })}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">审批</button>
                        ) : device.status !== 'blocked' ? (
                          <button onClick={() => setDisableModal({ open: true, device })}
                            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">禁用</button>
                        ) : (
                          <span className="text-sm text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal isOpen={disableModal.open} title="禁用设备"
        message={<div><p>确定要禁用此设备吗？</p><p className="mt-2 text-slate-500">设备指纹：<span className="font-mono text-xs">{disableModal.device?.id}</span></p><p className="text-sm text-red-500 mt-2">被禁用的设备发出的请求将一律返回 403。</p></div>}
        confirmText="确认禁用" danger onConfirm={handleDisable} onCancel={() => setDisableModal({ open: false, device: null })} />

      <ConfirmModal isOpen={approveModal.open} title="审批设备"
        message={<div><p>确定要审批此设备吗？</p><p className="mt-2 text-slate-500">设备指纹：<span className="font-mono text-xs">{approveModal.device?.id}</span></p><p className="mt-1 text-slate-500">用户：{approveModal.device?.user_id || '—'}</p></div>}
        confirmText="通过" onConfirm={() => handleApprove(true)} onCancel={() => setApproveModal({ open: false, device: null })} />
    </Layout>
  );
}
