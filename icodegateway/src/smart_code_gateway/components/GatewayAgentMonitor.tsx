import React, { useState } from 'react';
import { 
  Bot, UserCog, Key, AppWindow, Server, Clock, Calendar, ShieldAlert, FileKey, CheckCircle2, AlertTriangle, X
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

interface Category {
  id: string;
  name: string;
  count: number;
  riskScore: number;
  icon: React.ReactNode;
}

const categories: Category[] = [
  { id: 'ai-agents', name: 'AI Agents', count: 12, riskScore: 85, icon: <Bot size={18} /> },
  { id: 'service-accounts', name: 'Service Accounts', count: 45, riskScore: 42, icon: <UserCog size={18} /> },
  { id: 'api-keys', name: 'API Keys', count: 128, riskScore: 65, icon: <Key size={18} /> },
  { id: 'oauth-apps', name: 'OAuth Apps', count: 8, riskScore: 30, icon: <AppWindow size={18} /> },
  { id: 'mcp-servers', name: 'MCP Servers', count: 3, riskScore: 15, icon: <Server size={18} /> },
];

const mockProfile = {
  id: 'agent-01',
  name: 'Data Analyst Bot',
  type: 'AI Agent',
  createdAt: '2023-05-12 10:00:00',
  lastActive: '2023-10-27 14:23:45',
  credentials: [
    { name: 'AWS Access Key', id: 'AKIA********ABCD' },
    { name: 'DB Password', id: 'usr_********9x2' }
  ],
  permissions: [
    's3:GetObject',
    's3:ListBucket',
    'rds:DescribeDBInstances',
    'iam:PassRole' // High risk
  ],
  riskScore: 85,
  riskReasons: [
    '此 Key 189 天未轮转',
    '此账号拥有 admin 级别权限 (iam:PassRole) 但近 30 天无活跃使用记录',
    '在非工作时间存在大量数据库查询请求'
  ]
};

const GatewayAgentMonitor: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState<string>('ai-agents');
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const getRiskColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-50 border-red-200';
    if (score >= 50) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-green-600 bg-green-50 border-green-200';
  };

  const getRiskTextClass = (score: number) => {
    if (score >= 80) return 'text-red-600';
    if (score >= 50) return 'text-amber-600';
    return 'text-green-600';
  };

  // ECharts Graph Configuration
  const getGraphOption = () => {
    const nodes = [
      { id: '0', name: 'Data Analyst Bot\n(AI Agent)', category: 0, symbolSize: 60, itemStyle: { color: '#ef4444' } },
      { id: '1', name: 'CI/CD Runner\n(Service)', category: 0, symbolSize: 50, itemStyle: { color: '#f59e0b' } },
      { id: '2', name: 'GitHub Copilot\n(AI Agent)', category: 0, symbolSize: 50, itemStyle: { color: '#10b981' } },
      { id: '3', name: 'Prod DB\n(Database)', category: 1, symbolSize: 65, itemStyle: { color: '#3b82f6' } },
      { id: '4', name: 'Backup Bucket\n(AWS S3)', category: 1, symbolSize: 55, itemStyle: { color: '#8b5cf6' } },
      { id: '5', name: 'Config Repo\n(GitHub)', category: 1, symbolSize: 55, itemStyle: { color: '#6366f1' } },
    ];

    const edges = [
      { source: '0', target: '3', label: { show: true, formatter: 'Read' }, lineStyle: { color: '#94a3b8', width: 2, curveness: 0.2 } },
      { source: '1', target: '4', label: { show: true, formatter: 'Write' }, lineStyle: { color: '#94a3b8', width: 2, curveness: 0.2 } },
      { source: '1', target: '5', label: { show: true, formatter: 'Admin' }, lineStyle: { color: '#ef4444', width: 2, curveness: 0.2 } },
      { source: '2', target: '5', label: { show: true, formatter: 'Read/Write' }, lineStyle: { color: '#94a3b8', width: 2, curveness: 0.2 } },
      { source: '0', target: '4', label: { show: true, formatter: 'Admin' }, lineStyle: { color: '#ef4444', width: 2, curveness: -0.2 } },
    ];

    return {
      title: { text: '身份与资源关联图谱', textStyle: { fontSize: 14, color: '#475569', fontWeight: 'normal' }, top: 10, left: 10 },
      tooltip: { trigger: 'item' },
      animationDurationUpdate: 1500,
      animationEasingUpdate: 'quinticInOut',
      series: [
        {
          type: 'graph',
          layout: 'force',
          force: { repulsion: 400, edgeLength: 150 },
          roam: true,
          label: { show: true, position: 'bottom', color: '#475569', fontSize: 11 },
          edgeSymbol: ['circle', 'arrow'],
          edgeSymbolSize: [4, 8],
          edgeLabel: { fontSize: 10, color: '#64748b' },
          data: nodes,
          links: edges,
          categories: [{ name: '身份' }, { name: '资源' }],
          lineStyle: { opacity: 0.9, width: 2, curveness: 0 },
        }
      ]
    };
  };

  const onGraphClick = (e: any) => {
    if (e.dataType === 'node' && e.data.category === 0) {
      // 仅当点击身份节点时展开侧边栏
      setSelectedNode(e.data.name);
    }
  };

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Left Panel: Categories Navigation */}
      <div className="w-72 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">非人类身份分类</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all text-left ${
                activeCategory === cat.id 
                  ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm' 
                  : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeCategory === cat.id ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                  {cat.icon}
                </div>
                <div>
                  <div className="font-medium text-slate-700 text-sm">{cat.name}</div>
                  <div className="text-xs text-slate-400 mt-0.5">数量: {cat.count}</div>
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-slate-400 mb-1">风险评分</span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${getRiskColor(cat.riskScore)}`}>
                  {cat.riskScore}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Main Panel: Graph */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
          <h3 className="font-semibold text-slate-800">访问链路与权限拓扑</h3>
          <div className="flex items-center gap-4 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500"></span> 高风险节点</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500"></span> 核心资源</span>
          </div>
        </div>
        <div className="flex-1 p-4 bg-slate-50/50">
          <ReactECharts 
            option={getGraphOption()} 
            style={{ height: '100%', width: '100%' }} 
            onEvents={{ 'click': onGraphClick }}
          />
        </div>
      </div>

      {/* Right Sidebar: Identity Profile */}
      {selectedNode && (
        <div className="w-80 bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col overflow-hidden shrink-0 animate-in slide-in-from-right-8">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              <Bot size={18} className="text-blue-500" />
              身份档案
            </h3>
            <button onClick={() => setSelectedNode(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
              <X size={20} />
            </button>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            {/* Header Section */}
            <div className="p-5 border-b border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-slate-800">{mockProfile.name}</h2>
                <span className="px-2 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded border border-blue-100">
                  {mockProfile.type}
                </span>
              </div>
              
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-slate-400" />
                  <span className="text-slate-500 w-20">创建时间:</span>
                  <span className="font-mono text-xs">{mockProfile.createdAt}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-slate-400" />
                  <span className="text-slate-500 w-20">最近活跃:</span>
                  <span className="font-mono text-xs">{mockProfile.lastActive}</span>
                </div>
              </div>
            </div>

            {/* Risk Section */}
            <div className="p-5 border-b border-slate-100 bg-red-50/30">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-slate-800 flex items-center gap-2">
                  <ShieldAlert size={16} className={getRiskTextClass(mockProfile.riskScore)} />
                  风险评估
                </h4>
                <span className={`text-xl font-bold ${getRiskTextClass(mockProfile.riskScore)}`}>
                  {mockProfile.riskScore}<span className="text-sm font-normal text-slate-500">/100</span>
                </span>
              </div>
              <div className="space-y-2">
                {mockProfile.riskReasons.map((reason, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 bg-white p-2 rounded border border-red-100 shadow-sm">
                    <AlertTriangle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                    <span>{reason}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Credentials Section */}
            <div className="p-5 border-b border-slate-100">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <Key size={16} className="text-slate-400" />
                关联凭证
              </h4>
              <div className="space-y-2">
                {mockProfile.credentials.map((cred, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200">
                    <span className="text-sm text-slate-700">{cred.name}</span>
                    <span className="font-mono text-xs text-slate-500 bg-slate-200/50 px-2 py-1 rounded">
                      {cred.id}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions Section */}
            <div className="p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center gap-2">
                <FileKey size={16} className="text-slate-400" />
                权限列表 (IAM Policy)
              </h4>
              <div className="space-y-2">
                {mockProfile.permissions.map((perm, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-slate-600">
                    <CheckCircle2 size={14} className={perm.includes('iam:PassRole') ? 'text-amber-500' : 'text-green-500'} />
                    <span className={`font-mono text-xs ${perm.includes('iam:PassRole') ? 'text-amber-700 font-bold' : ''}`}>
                      {perm}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};

export default GatewayAgentMonitor;