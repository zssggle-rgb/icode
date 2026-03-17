import React, { useState, useEffect } from 'react';

interface PolicyData {
  input_security: { enabled: boolean; block_keywords: string[]; regex_patterns: string[] };
  output_security: { enabled: boolean; block_keywords: string[] };
  ai_analysis: { enabled: boolean };
  routing: { default_mode: 'managed' | 'passthrough' };
}

const GatewayPolicy: React.FC = () => {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/admin/policies')
      .then(res => res.json())
      .then(data => {
        if (data.code === 0) {
          setPolicy(data.data);
        }
        setLoading(false);
      });
  }, []);

  const updatePolicy = (newPolicy: PolicyData) => {
    setPolicy(newPolicy);
    fetch('/api/v1/admin/policies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newPolicy)
    });
  };

  const toggleInputSecurity = () => {
    if (!policy) return;
    updatePolicy({
      ...policy,
      input_security: { ...policy.input_security, enabled: !policy.input_security.enabled }
    });
  };

  const toggleOutputSecurity = () => {
    if (!policy) return;
    updatePolicy({
      ...policy,
      output_security: { ...policy.output_security, enabled: !policy.output_security.enabled }
    });
  };

  const toggleAiAnalysis = () => {
    if (!policy) return;
    updatePolicy({
      ...policy,
      ai_analysis: { ...policy.ai_analysis, enabled: !policy.ai_analysis.enabled }
    });
  };

  const setRoutingMode = (mode: 'managed' | 'passthrough') => {
    if (!policy) return;
    updatePolicy({
      ...policy,
      routing: { ...policy.routing, default_mode: mode }
    });
  };

  if (loading || !policy) {
    return <div className="p-6">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-slate-800 font-semibold mb-4 text-lg">网关安全策略配置</h3>
        <p className="text-sm text-slate-500 mb-6">配置深度安全检查、AI 审计分析及网关默认路由行为。</p>
        
        <div className="space-y-4">
          
          {/* 输入安全检查 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-slate-800 font-medium">深度安全检查 (输入)</h4>
              <p className="text-sm text-slate-500 mt-1">对提示词进行正则匹配和关键词拦截（同步检查）。</p>
            </div>
            <div 
              onClick={toggleInputSecurity}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${policy.input_security.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${policy.input_security.enabled ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>
          
          {/* 输出安全检查 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-slate-800 font-medium">深度安全检查 (输出)</h4>
              <p className="text-sm text-slate-500 mt-1">对大模型返回结果进行 DLP 关键词脱敏和拦截（同步检查）。</p>
            </div>
            <div 
              onClick={toggleOutputSecurity}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${policy.output_security.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${policy.output_security.enabled ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>

          {/* AI 审计分析 */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div>
              <h4 className="text-slate-800 font-medium">AI 审计分析</h4>
              <p className="text-sm text-slate-500 mt-1">使用智谱 GLM-4.7 对请求和响应进行异步深度语义安全审查。</p>
            </div>
            <div 
              onClick={toggleAiAnalysis}
              className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${policy.ai_analysis.enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
            >
               <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${policy.ai_analysis.enabled ? 'right-1' : 'left-1'}`}></div>
            </div>
          </div>

          {/* 默认路由模式 */}
          <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="mb-3">
              <h4 className="text-slate-800 font-medium">默认路由模式</h4>
              <p className="text-sm text-slate-500 mt-1">当客户端未显式指定 mode 时的默认行为。</p>
            </div>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="routingMode" 
                  value="managed" 
                  checked={policy.routing.default_mode === 'managed'}
                  onChange={() => setRoutingMode('managed')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">托管模式 (Managed) - 拦截高危请求</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="routingMode" 
                  value="passthrough" 
                  checked={policy.routing.default_mode === 'passthrough'}
                  onChange={() => setRoutingMode('passthrough')}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-slate-700">透传模式 (Passthrough) - 仅记录不拦截</span>
              </label>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default GatewayPolicy;
