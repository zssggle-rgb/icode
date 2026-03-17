
import React, { useEffect, useState } from 'react';
import { Monitor, Search, Shield, ShieldOff, Laptop } from 'lucide-react';

interface Device {
  id: string;
  fingerprint: string;
  user_id: string;
  status: string;
  last_seen_at: string;
  created_at: string;
}

const GatewayDeviceManager: React.FC = () => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDevices = () => {
    setLoading(true);
    fetch('/api/v1/admin/devices')
      .then(res => res.json())
      .then(res => {
        if (res.code === 0) {
          setDevices(res.data);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, []);

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'blocked' : 'active';
    await fetch(`/api/v1/admin/devices/${id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    fetchDevices();
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
              placeholder="搜索设备指纹 / 用户..." 
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
            />
          </div>
        </div>
        <div className="text-sm text-slate-500">
          共 {devices.length} 台设备
        </div>
      </div>

      {/* Devices Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-12 text-slate-500">加载中...</div>
        ) : devices.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-500">暂无设备</div>
        ) : (
          devices.map((device) => (
            <div key={device.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-lg ${device.status === 'active' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
                    <Laptop size={24} />
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    device.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {device.status === 'active' ? '正常' : '已封禁'}
                  </span>
                </div>
                
                <h4 className="font-semibold text-slate-800 mb-1 truncate" title={device.fingerprint}>
                  {device.fingerprint}
                </h4>
                <p className="text-sm text-slate-500 mb-4 flex items-center gap-1">
                  <span className="font-medium">User:</span> {device.user_id || 'Unknown'}
                </p>

                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex justify-between">
                    <span>首次注册:</span>
                    <span>{new Date(device.created_at).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>最近活跃:</span>
                    <span>{device.last_seen_at ? new Date(device.last_seen_at).toLocaleString() : '-'}</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                <button 
                  onClick={() => toggleStatus(device.id, device.status)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    device.status === 'active' 
                      ? 'text-red-600 hover:bg-red-50' 
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                >
                  {device.status === 'active' ? (
                    <>
                      <ShieldOff size={16} />
                      封禁设备
                    </>
                  ) : (
                    <>
                      <Shield size={16} />
                      解封设备
                    </>
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default GatewayDeviceManager;
