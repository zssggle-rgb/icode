import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/Layout';
import { fetchPolicy, savePolicy, PolicyData } from '../api/client';
import { Save, RefreshCw, Plus, Trash2 } from 'lucide-react';

type Provider = 'ollama' | 'dashscope' | 'zhipu';

const providerLabels: Record<Provider, string> = {
  ollama: 'Ollama',
  dashscope: 'DashScope（阿里云）',
  zhipu: '智谱 GLM',
};

export default function Policy() {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [newKeyword, setNewKeyword] = useState('');
  const [newRegex, setNewRegex] = useState('');

  const loadPolicy = useCallback(async () => {
    setLoading(true);
    const data = await fetchPolicy();
    setPolicy(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPolicy();
  }, [loadPolicy]);

  const updatePolicy = (path: string, value: any) => {
    if (!policy) return;
    const parts = path.split('.');
    const updated = JSON.parse(JSON.stringify(policy));
    let obj: any = updated;
    for (let i = 0; i < parts.length - 1; i++) {
      obj = obj[parts[i]];
    }
    obj[parts[parts.length - 1]] = value;
    setPolicy(updated);
    setSaved(false);
  };

  const addKeyword = (field: 'input' | 'output') => {
    if (!newKeyword.trim() || !policy) return;
    const key = field === 'input' ? 'block_keywords' : 'block_keywords';
    if (field === 'input') {
      updatePolicy('input_security.block_keywords', [...policy.input_security.block_keywords, newKeyword.trim()]);
    } else {
      updatePolicy('output_security.block_keywords', [...policy.output_security.block_keywords, newKeyword.trim()]);
    }
    setNewKeyword('');
  };

  const removeKeyword = (field: 'input' | 'output', idx: number) => {
    if (!policy) return;
    if (field === 'input') {
      updatePolicy('input_security.block_keywords', policy.input_security.block_keywords.filter((_, i) => i !== idx));
    } else {
      updatePolicy('output_security.block_keywords', policy.output_security.block_keywords.filter((_, i) => i !== idx));
    }
  };

  const addRegex = () => {
    if (!newRegex.trim() || !policy) return;
    updatePolicy('input_security.regex_patterns', [...policy.input_security.regex_patterns, newRegex.trim()]);
    setNewRegex('');
  };

  const removeRegex = (idx: number) => {
    if (!policy) return;
    updatePolicy('input_security.regex_patterns', policy.input_security.regex_patterns.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!policy) return;
    setSaving(true);
    try {
      // Validate model config
      if (policy.model.provider === 'dashscope' && !policy.model.dashscope?.apiKey) {
        alert('请填写 DashScope API Key');
        return;
      }
      if (policy.model.provider === 'ollama' && !policy.model.ollama?.url) {
        alert('请填写 Ollama 服务地址');
        return;
      }
      if (policy.model.provider === 'zhipu' && !policy.model.zhipu?.apiKey) {
        alert('请填写智谱 API Key');
        return;
      }
      await savePolicy(policy);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading || !policy) {
    return (
      <Layout title="安全策略配置">
        <div className="flex items-center justify-center h-64 text-slate-400">加载中...</div>
      </Layout>
    );
  }

  return (
    <Layout
      title="安全策略配置"
      actions={
        <div className="flex items-center gap-3">
          {saved && (
            <span className="text-sm text-green-600 font-medium">✓ 保存成功</span>
          )}
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 transition-colors"
          >
            <Save size={14} /> {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-4xl">
        {/* Input Security */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">输入扫描</h3>
              <p className="text-sm text-slate-500 mt-1">检测用户提示词中的敏感内容</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={policy.input_security.enabled}
                  onChange={() => updatePolicy('input_security.enabled', true)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!policy.input_security.enabled}
                  onChange={() => updatePolicy('input_security.enabled', false)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">禁用</span>
              </label>
            </div>
          </div>

          {policy.input_security.enabled && (
            <>
              {/* Block Keywords */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  阻断关键词（每行一个，命中后阻断请求）
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {policy.input_security.block_keywords.map((kw, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-50 text-red-700 rounded-full text-sm"
                    >
                      {kw}
                      <button
                        onClick={() => removeKeyword('input', idx)}
                        className="hover:text-red-900"
                      >
                        <Trash2 size={12} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newKeyword}
                    onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword('input'); } }}
                    placeholder="添加关键词后回车"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={() => addKeyword('input')}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> 添加
                  </button>
                </div>
              </div>

              {/* Regex Patterns */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  正则模式（每行一条，命中后阻断请求）
                </label>
                <div className="space-y-2 mb-3">
                  {policy.input_security.regex_patterns.map((pattern, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 rounded px-3 py-2">
                      <code className="flex-1 text-sm text-slate-700 font-mono">{pattern}</code>
                      <button
                        onClick={() => removeRegex(idx)}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newRegex}
                    onChange={e => setNewRegex(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRegex(); } }}
                    placeholder="添加正则表达式后回车"
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    onClick={addRegex}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Plus size={14} /> 添加
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Output Security */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">输出扫描</h3>
              <p className="text-sm text-slate-500 mt-1">检测AI响应中的敏感内容</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={policy.output_security.enabled}
                  onChange={() => updatePolicy('output_security.enabled', true)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!policy.output_security.enabled}
                  onChange={() => updatePolicy('output_security.enabled', false)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">禁用</span>
              </label>
            </div>
          </div>

          {policy.output_security.enabled && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                阻断关键词（输出命中后记录告警）
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {policy.output_security.block_keywords.map((kw, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-50 text-orange-700 rounded-full text-sm"
                  >
                    {kw}
                    <button
                      onClick={() => removeKeyword('output', idx)}
                      className="hover:text-orange-900"
                    >
                      <Trash2 size={12} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newKeyword}
                  onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addKeyword('output'); } }}
                  placeholder="添加关键词后回车"
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => addKeyword('output')}
                  className="flex items-center gap-1 px-3 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                >
                  <Plus size={14} /> 添加
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Cross-Project Detection */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-slate-800">跨项目检测</h3>
              <p className="text-sm text-slate-500 mt-1">自动检测提示词中出现的其他仓库名，并记录告警</p>
            </div>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={policy.cross_project_detection.enabled}
                  onChange={() => updatePolicy('cross_project_detection.enabled', true)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">启用</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!policy.cross_project_detection.enabled}
                  onChange={() => updatePolicy('cross_project_detection.enabled', false)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700">禁用</span>
              </label>
            </div>
          </div>
        </div>

        {/* Model Configuration */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h3 className="text-base font-semibold text-slate-800 mb-4">模型配置</h3>

          {/* Provider Radio */}
          <div className="flex items-center gap-6 mb-6">
            <span className="text-sm font-medium text-slate-700">接入方式：</span>
            {(['ollama', 'dashscope', 'zhipu'] as Provider[]).map(p => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="provider"
                  checked={policy.model.provider === p}
                  onChange={() => updatePolicy('model.provider', p)}
                  className="text-blue-500 focus:ring-blue-500"
                />
                <span className={`text-sm ${policy.model.provider === p ? 'text-blue-600 font-medium' : 'text-slate-600'}`}>
                  {providerLabels[p]}
                </span>
              </label>
            ))}
          </div>

          {/* Ollama Config */}
          {policy.model.provider === 'ollama' && (
            <div className="space-y-4 bg-slate-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">服务地址</label>
                <input
                  type="text"
                  value={policy.model.ollama?.url || ''}
                  onChange={e => updatePolicy('model.ollama.url', e.target.value)}
                  placeholder="http://localhost:11434"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={policy.model.ollama?.model || ''}
                  onChange={e => updatePolicy('model.ollama.model', e.target.value)}
                  placeholder="qwen2.5-coder-27b-instruct"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* DashScope Config */}
          {policy.model.provider === 'dashscope' && (
            <div className="space-y-4 bg-slate-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={policy.model.dashscope?.apiKey || ''}
                  onChange={e => updatePolicy('model.dashscope.apiKey', e.target.value)}
                  placeholder="sk-xxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={policy.model.dashscope?.model || ''}
                  onChange={e => updatePolicy('model.dashscope.model', e.target.value)}
                  placeholder="glm-5"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Zhipu Config */}
          {policy.model.provider === 'zhipu' && (
            <div className="space-y-4 bg-slate-50 rounded-lg p-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">API Key</label>
                <input
                  type="password"
                  value={policy.model.zhipu?.apiKey || ''}
                  onChange={e => updatePolicy('model.zhipu.apiKey', e.target.value)}
                  placeholder="sk-xxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">模型名称</label>
                <input
                  type="text"
                  value={policy.model.zhipu?.model || ''}
                  onChange={e => updatePolicy('model.zhipu.model', e.target.value)}
                  placeholder="glm-5"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
