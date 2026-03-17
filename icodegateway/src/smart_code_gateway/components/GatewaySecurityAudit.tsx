import React, { useState } from 'react';
import { 
  Server, Cloud, Code, Circle, Clock, Database, Terminal, FileText, 
  AlertTriangle, Shield, CheckCircle, XCircle, ArrowRight, BarChart2 
} from 'lucide-react';
import ReactECharts from 'echarts-for-react';

// Types
interface Agent {
  id: string;
  name: string;
  type: 'self-hosted' | 'saas' | 'no-code';
  status: 'online' | 'warning' | 'offline';
  description: string;
}

interface Log {
  id: string;
  time: string;
  tool: string;
  source: string;
  operation: string;
  duration: string;
}

interface Risk {
  id: string;
  description: string;
  confidence: number;
  action: string;
  level: 'high' | 'medium' | 'low';
}

// Mock Data
const agents: Agent[] = [
  { id: '1', name: 'DevOps 助手', type: 'self-hosted', status: 'online', description: '内部 CI/CD 自动化机器人' },
  { id: '2', name: '数据分析机器人', type: 'self-hosted', status: 'warning', description: 'SQL 查询与报告生成' },
  { id: '3', name: 'GitHub 代码助手', type: 'saas', status: 'online', description: '代码补全与重构' },
  { id: '4', name: '客户支持 AI', type: 'saas', status: 'offline', description: '外部客户咨询处理' },
  { id: '5', name: 'HR 政策助手', type: 'no-code', status: 'online', description: '基于 Dify 的 HR 问答机器人' },
];

const logs: Log[] = [
  { id: '1', time: '10:42:15', tool: 'SQL 连接器', source: '生产数据库-01', operation: '查询前 100 位用户数据', duration: '120毫秒' },
  { id: '2', time: '10:41:58', tool: '代码解释器', source: '本地环境', operation: '运行 Python 脚本', duration: '2.5秒' },
  { id: '3', time: '10:41:30', tool: '搜索 API', source: '内部维基', operation: '搜索 "部署策略"', duration: '450毫秒' },
  { id: '4', time: '10:40:12', tool: 'Git 插件', source: 'GitLab', operation: '克隆代码仓库', duration: '1.2秒' },
  { id: '5', time: '10:38:55', tool: '文件读取器', source: 'S3 存储桶', operation: '读取 config.json', duration: '85毫秒' },
];

const risks: Risk[] = [
  { id: '1', description: '非工作时间大量数据库读取', confidence: 92, action: '阻断并通知管理员', level: 'high' },
  { id: '2', description: '尝试访问敏感配置文件', confidence: 78, action: '需要人工审核', level: 'medium' },
];

const GatewaySecurityAudit: React.FC = () => {
  const [selectedAgentId, setSelectedAgentId] = useState<string>('2'); // Default to the warning agent
  const [showReport, setShowReport] = useState(false);

  const selectedAgent = agents.find(a => a.id === selectedAgentId);

  // Group agents
  const groupedAgents = {
    'self-hosted': agents.filter(a => a.type === 'self-hosted'),
    'saas': agents.filter(a => a.type === 'saas'),
    'no-code': agents.filter(a => a.type === 'no-code'),
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-500 bg-green-50 border-green-200';
      case 'warning': return 'text-amber-500 bg-amber-50 border-amber-200';
      case 'offline': return 'text-slate-400 bg-slate-50 border-slate-200';
      default: return 'text-slate-400';
    }
  };

  const getStatusDot = (status: string) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'warning': return 'bg-amber-500';
      case 'offline': return 'bg-slate-400';
      default: return 'bg-slate-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'self-hosted': return <Server size={16} />;
      case 'saas': return <Cloud size={16} />;
      case 'no-code': return <Code size={16} />;
      default: return <Circle size={16} />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'self-hosted': return '自建 Agent';
      case 'saas': return 'SaaS Agent';
      case 'no-code': return 'No-Code Agent';
      default: return '其他';
    }
  };

  // Chart option for deviation report
  const getDeviationChartOption = () => ({
    tooltip: { trigger: 'axis' },
    radar: {
      indicator: [
        { name: 'API 调用频率', max: 100 },
        { name: '数据访问量', max: 100 },
        { name: '响应延迟', max: 100 },
        { name: '错误率', max: 100 },
        { name: '敏感操作占比', max: 100 },
      ]
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: [40, 30, 20, 10, 15],
            name: '30天基线',
            itemStyle: { color: '#94a3b8' },
            areaStyle: { opacity: 0.3 }
          },
          {
            value: [85, 90, 45, 20, 70],
            name: '当前行为',
            itemStyle: { color: '#ef4444' },
            areaStyle: { opacity: 0.3 }
          }
        ]
      }
    ]
  });

  return (
    <div className="flex h-[calc(100vh-140px)] gap-6">
      {/* Left Panel: Agent Directory */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">Agent 目录</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(Object.keys(groupedAgents) as Array<keyof typeof groupedAgents>).map((type) => (
            <div key={type}>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                {getTypeIcon(type)}
                {getTypeLabel(type)}
              </div>
              <div className="space-y-2">
                {groupedAgents[type].map(agent => (
                  <div 
                    key={agent.id}
                    onClick={() => {
                      setSelectedAgentId(agent.id);
                      if (agent.status !== 'warning') setShowReport(false);
                    }}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedAgentId === agent.id 
                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200 shadow-sm' 
                        : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-medium text-slate-700 text-sm">{agent.name}</span>
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${getStatusDot(agent.status)}`} />
                    </div>
                    <p className="text-xs text-slate-400 truncate">{agent.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Panel: Timeline */}
      <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden relative">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white z-10">
          <div>
            <h3 className="font-semibold text-slate-800 flex items-center gap-2">
              {selectedAgent?.name} - 行为日志
              {selectedAgent?.status === 'warning' && (
                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs rounded-full border border-amber-200 font-normal">
                  异常行为检测中
                </span>
              )}
            </h3>
          </div>
          <div className="flex gap-2 text-xs text-slate-500">
             <span className="flex items-center gap-1"><Clock size={12}/> 实时监控</span>
          </div>
        </div>
        
        {/* Anomaly Alert Banner */}
        {selectedAgent?.status === 'warning' && (
          <div className="bg-amber-50 border-b border-amber-100 p-3 flex items-center justify-between px-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-3">
              <div className="p-1.5 bg-amber-100 rounded-full text-amber-600">
                <AlertTriangle size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-800">检测到异常行为</p>
                <p className="text-xs text-amber-600">该 Agent 在非工作时间频繁调用数据库 API</p>
              </div>
            </div>
            <button 
              onClick={() => setShowReport(true)}
              className="px-3 py-1.5 bg-white border border-amber-200 text-amber-700 text-xs font-medium rounded hover:bg-amber-100 transition-colors shadow-sm"
            >
              查看偏离报告
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 sticky top-0 z-0">
              <tr>
                <th className="px-6 py-3 font-medium w-32">触发时间</th>
                <th className="px-6 py-3 font-medium w-40">工具</th>
                <th className="px-6 py-3 font-medium w-40">数据来源</th>
                <th className="px-6 py-3 font-medium">操作详情</th>
                <th className="px-6 py-3 font-medium w-24 text-right">持续时长</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 font-mono text-xs">{log.time}</td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-slate-100 text-slate-600 border border-slate-200 text-xs font-medium">
                      <Terminal size={12} /> {log.tool}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-600">
                    <span className="flex items-center gap-1.5">
                      <Database size={14} className="text-slate-400" /> {log.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-800 font-mono text-xs truncate max-w-xs" title={log.operation}>
                    {log.operation}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500 text-xs">{log.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Panel: Risk Details */}
      <div className="w-80 bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-semibold text-slate-800">风险详情</h3>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {risks.map(risk => (
            <div key={risk.id} className="p-4 rounded-lg border border-red-100 bg-red-50/50">
              <div className="flex justify-between items-start mb-2">
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                  risk.level === 'high' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {risk.level === 'high' ? '高风险' : '中风险'}
                </span>
                <span className="text-xs font-mono font-medium text-slate-500">{risk.confidence}% 置信度</span>
              </div>
              <h4 className="text-sm font-semibold text-slate-800 mb-1">{risk.description}</h4>
              <div className="mt-3 pt-3 border-t border-red-100">
                <p className="text-xs text-slate-500 mb-2">建议处理动作:</p>
                <div className="flex items-center gap-2 text-sm text-slate-700 bg-white px-3 py-2 rounded border border-slate-200">
                  <Shield size={14} className="text-blue-500" />
                  {risk.action}
                </div>
              </div>
            </div>
          ))}
          
          {/* Safe State Placeholder */}
          {risks.length === 0 && (
            <div className="text-center py-10">
              <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3">
                <CheckCircle size={24} className="text-green-500" />
              </div>
              <p className="text-slate-500 text-sm">当前无风险项</p>
            </div>
          )}
        </div>
      </div>

      {/* Behavior Deviation Report Modal */}
      {showReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-800">行为偏离报告</h2>
                <p className="text-sm text-slate-500">生成时间: {new Date().toLocaleString()}</p>
              </div>
              <button onClick={() => setShowReport(false)} className="text-slate-400 hover:text-slate-600">
                <XCircle size={24} />
              </button>
            </div>
            
            <div className="p-6 grid grid-cols-2 gap-8">
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                  <BarChart2 size={16} /> 核心指标偏差
                </h4>
                <div className="h-64">
                   <ReactECharts option={getDeviationChartOption()} style={{ height: '100%', width: '100%' }} />
                </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-semibold text-slate-700 mb-3">异常分析摘要</h4>
                  <div className="bg-slate-50 p-4 rounded-lg text-sm text-slate-600 space-y-2 border border-slate-100">
                    <p>• 数据库读取操作比基线高出 <span className="text-red-600 font-bold">420%</span></p>
                    <p>• 操作时间集中在 <span className="text-amber-600 font-bold">02:00 - 04:00</span> (非工作时间)</p>
                    <p>• 访问了 <span className="text-slate-800 font-medium">12</span> 个从未访问过的敏感表</p>
                  </div>
                </div>

                <div>
                   <h4 className="text-sm font-semibold text-slate-700 mb-3">建议措施</h4>
                   <div className="space-y-2">
                     <button className="w-full flex items-center justify-between px-4 py-3 bg-red-50 text-red-700 rounded-lg border border-red-100 hover:bg-red-100 transition-colors text-sm font-medium">
                        <span>立即阻断连接</span>
                        <ArrowRight size={16} />
                     </button>
                     <button className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 hover:bg-slate-100 transition-colors text-sm font-medium">
                        <span>下载完整审计日志</span>
                        <FileText size={16} />
                     </button>
                   </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GatewaySecurityAudit;