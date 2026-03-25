import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import { fetchPolicy, savePolicy, reloadPolicy, PolicyData } from '../api/client';
import { Save } from 'lucide-react';

type ModelProvider = 'ollama' | 'dashscope' | 'zhipu';

export default function PolicyPage() {
  const [policy, setPolicy] = useState<PolicyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [inputEnabled, setInputEnabled] = useState(true);
  const [blockKeywords, setBlockKeywords] = useState<string[]>([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [regexPatterns, setRegexPatterns] = useState<string[]>([]);
  const [newRegex, setNewRegex] = useState('');
  const [crossProjectEnabled, setCrossProjectEnabled] = useState(true);
  const [modelProvider, setModelProvider] = useState<ModelProvider>('dashscope');
  const [ollamaUrl, setOllamaUrl] = useState('http://localhost:11434');
  const [ollamaModel, setOllamaModel] = useState('qwen2.5-coder-27b-instruct');
  const [dashscopeKey, setDashscopeKey] = useState('');
  const [dashscopeModel, setDashscopeModel] = useState('glm-5');
  const [zhipuKey, setZhipuKey] = useState('');
  const [zhipuModel, setZhipuModel] = useState('glm-5');

  useEffect(() => {
    fetchPolicy().then(data => {
      setPolicy(data);
      setInputEnabled(data.input_security.enabled);
      setBlockKeywords(data.input_security.block_keywords);
      setRegexPatterns(data.input_security.regex_patterns);
      setCrossProjectEnabled(data.cross_project_detection.enabled);
      setModelProvider(data.model.provider);
      if (data.model.ollama) { setOllamaUrl(data.model.ollama.url); setOllamaModel(data.model.ollama.model); }
      if (data.model.dashscope) { setDashscopeKey(data.model.dashscope.apiKey); setDashscopeModel(data.model.dashscope.model); }
      if (data.model.zhipu) { setZhipuKey(data.model.zhipu.apiKey); setZhipuModel(data.model.zhipu.model); }
      setLoading(false);
    });
  }, []);

  const markDirty = () => setDirty(true);

  const handleAddKeyword = () => {
    if (newKeyword.trim() && !blockKeywords.includes(newKeyword.trim())) {
      setBlockKeywords([...blockKeywords, newKeyword.trim()]);
      setNewKeyword('');
      markDirty();
    }
  };

  const handleRemoveKeyword = (kw: string) => {
    setBlockKeywords(blockKeywords.filter(k => k !== kw));
    markDirty();
  };

  const handleAddRegex = () => {
    if (newRegex.trim() && !regexPatterns.includes(newRegex.trim())) {
      setRegexPatterns([...regexPatterns, newRegex.trim()]);
      setNewRegex('');
      markDirty();
    }
  };

  const handleRemoveRegex = (r: string) => {
    setRegexPatterns(regexPatterns.filter(p => p !== r));
    markDirty();
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);
    try {
      const updatedPolicy: PolicyData = {
        input_security: { enabled: inputEnabled, block_keywords: blockKeywords, regex_patterns: regexPatterns },
        output_security: policy?.output_security || { enabled: true, block_keywords: [] },
        cross_project_detection: { enabled: crossProjectEnabled },
        model: {
          provider: modelProvider,
          ollama: { url: ollamaUrl, model: ollamaModel },
          dashscope: { apiKey: dashscopeKey, model: dashscopeModel },
          zhipu: { apiKey: zhipuKey, model: zhipuModel },
        },
      };
      await savePolicy(updatedPolicy);
      await reloadPolicy();
      setPolicy(updatedPolicy);
      setDirty(false);
      setSaveMsg({ type: 'success', text: '配置已保存并热重载成功' });
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      console.error('保存失败', err);
      setSaveMsg({ type: 'error', text: '保存失败，请重试' });
    }
    setSaving(false);
  };

  if (loading) {
    return <Layout title="策略配置"><div className="flex items-center justify-center h-64"><div className="text-slate-400">加载中...</div></div></Layout>;
  }

  return (
    <Layout title="安全策略配置"
      actions={
        <div className="flex items-center gap-3">
          {saveMsg && <span className={`text-sm ${saveMsg.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>{saveMsg.text}</span>}
          <button onClick={handleSave} disabled={!dirty || saving}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium text-white rounded-lg transition-colors ${dirty ? 'bg-blue-500 hover:bg-blue-600' : 'bg-slate-300 cursor-not-allowed'}`}>
            <Save size={16} />
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      }>
      <div className="space-y-6 max-w-4xl">
        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-base font-medium text-slate-700 mb-4">输入扫描</h3>
          <div className="flex items-center gap-6 mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={inputEnabled} onChange={() => { setInputEnabled(true); markDirty(); }} className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">启用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!inputEnabled} onChange={() => { setInputEnabled(false); markDirty(); }} className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">禁用</span>
            </label>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-600 mb-2">阻断关键词（每行一个）</label>
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
              <div className="flex flex-wrap gap-2 mb-2">
                {blockKeywords.map(kw => (
                  <span key={kw} className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-slate-200 rounded text-sm text-slate-600">
                    {kw}
                    <button onClick={() => handleRemoveKeyword(kw)} className="text-slate-400 hover:text-red-500">×</button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())} placeholder="添加关键词..."
                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddKeyword} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50">添加</button>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">正则模式</label>
            <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
              <div className="space-y-2 mb-2">
                {regexPatterns.map((r, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1 bg-white border border-slate-200 rounded text-sm">
                    <span className="font-mono text-slate-600">{r}</span>
                    <button onClick={() => handleRemoveRegex(r)} className="text-slate-400 hover:text-red-500">×</button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newRegex} onChange={e => setNewRegex(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleAddRegex())} placeholder="添加正则模式..."
                  className="flex-1 px-2 py-1.5 text-sm border border-slate-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <button onClick={handleAddRegex} className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50">添加</button>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-base font-medium text-slate-700 mb-4">跨项目检测</h3>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={crossProjectEnabled} onChange={() => { setCrossProjectEnabled(true); markDirty(); }} className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">启用</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="radio" checked={!crossProjectEnabled} onChange={() => { setCrossProjectEnabled(false); markDirty(); }} className="w-4 h-4 text-blue-500" />
              <span className="text-sm text-slate-700">禁用</span>
            </label>
          </div>
          <p className="mt-2 text-sm text-slate-500">自动检测提示词中出现的其他仓库名，并记录告警</p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-5">
          <h3 className="text-base font-medium text-slate-700 mb-4">模型配置</h3>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-600 mb-3">接入方式</label>
            <div className="flex gap-6">
              {(['ollama', 'dashscope', 'zhipu'] as ModelProvider[]).map(provider => (
                <label key={provider} className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" name="provider" checked={modelProvider === provider}
                    onChange={() => { setModelProvider(provider); markDirty(); }} className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-slate-700">{provider === 'ollama' ? 'Ollama' : provider === 'dashscope' ? 'DashScope' : '智谱'}</span>
                </label>
              ))}
            </div>
          </div>

          {modelProvider === 'ollama' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div><label className="block text-sm font-medium text-slate-600 mb-1">服务地址</label>
                <input type="text" value={ollamaUrl} onChange={e => { setOllamaUrl(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1">模型名称</label>
                <input type="text" value={ollamaModel} onChange={e => { setOllamaModel(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          )}

          {modelProvider === 'dashscope' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div><label className="block text-sm font-medium text-slate-600 mb-1">API Key</label>
                <input type="password" value={dashscopeKey} onChange={e => { setDashscopeKey(e.target.value); markDirty(); }} placeholder="sk-xxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1">模型</label>
                <input type="text" value={dashscopeModel} onChange={e => { setDashscopeModel(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          )}

          {modelProvider === 'zhipu' && (
            <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div><label className="block text-sm font-medium text-slate-600 mb-1">API Key</label>
                <input type="password" value={zhipuKey} onChange={e => { setZhipuKey(e.target.value); markDirty(); }} placeholder="sk-xxxxx"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
              <div><label className="block text-sm font-medium text-slate-600 mb-1">模型</label>
                <input type="text" value={zhipuModel} onChange={e => { setZhipuModel(e.target.value); markDirty(); }}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" /></div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
