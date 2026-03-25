// API Client for icodegateway dashboard
// All API calls go through this module

const API_BASE = '/api/v1';

interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const token = localStorage.getItem('session_token') || '';
  
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options?.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.status} ${res.statusText}`);
  }

  const json: ApiResponse<T> = await res.json();
  if (json.code !== 0) {
    throw new Error(json.message || 'API Error');
  }

  return json.data;
}

// ============ Stats API ============
export interface TrendItem {
  time: string;
  requests: number;
  risk_events: number;
}

export interface TopUser {
  user_id: string;
  requests: number;
  change?: number;
  risk_events?: number;
}

export interface RiskDistribution {
  low: number;
  medium: number;
  high: number;
}

export interface StatsData {
  total_requests: number;
  active_devices: number;
  risk_events: number;
  total_tokens?: number;
  trend: TrendItem[];
  top_users: TopUser[];
  risk_distribution: RiskDistribution;
}

export async function fetchStats(period: 'today' | '7d' | '30d' = 'today'): Promise<StatsData> {
  try {
    return await request<StatsData>(`/stats?period=${period}`);
  } catch {
    return getMockStats();
  }
}

function getMockStats(): StatsData {
  const today = new Date();
  const trend: TrendItem[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trend.push({
      time: d.toISOString().split('T')[0],
      requests: Math.floor(Math.random() * 200) + 100,
      risk_events: Math.floor(Math.random() * 5),
    });
  }
  return {
    total_requests: 1234,
    active_devices: 23,
    risk_events: 3,
    trend,
    top_users: [
      { user_id: 'zhangsan', requests: 234, change: 12, risk_events: 1 },
      { user_id: 'lisi', requests: 189, change: -3, risk_events: 2 },
      { user_id: 'wangwu', requests: 156, change: 5, risk_events: 0 },
      { user_id: 'zhaoliu', requests: 98, change: 8, risk_events: 0 },
      { user_id: 'sunqi', requests: 67, change: -1, risk_events: 0 },
    ],
    risk_distribution: { low: 1218, medium: 13, high: 3 },
  };
}

// ============ Audit Logs API ============
export interface AuditLog {
  id: string;
  request_id: string;
  user_id: string;
  device_id: string;
  action: string;
  prompt_summary: string;
  response_summary: string;
  risk_level: 'low' | 'medium' | 'high';
  cross_project_attempt?: boolean;
  metadata: {
    model?: string;
    provider?: string;
    duration_ms?: number;
  };
  created_at: string;
}

export interface PaginationInfo {
  page: number;
  page_size: number;
  total: number;
  total_pages: number;
}

export interface AuditLogsResponse {
  logs: AuditLog[];
  pagination: PaginationInfo;
}

export async function fetchAuditLogs(params: {
  page?: number;
  page_size?: number;
  user_id?: string;
  risk_level?: string;
  start_time?: string;
  end_time?: string;
  keyword?: string;
}): Promise<AuditLogsResponse> {
  const searchParams = new URLSearchParams();
  if (params.page) searchParams.set('page', String(params.page));
  if (params.page_size) searchParams.set('page_size', String(params.page_size));
  if (params.user_id) searchParams.set('user_id', params.user_id);
  if (params.risk_level) searchParams.set('risk_level', params.risk_level);
  if (params.start_time) searchParams.set('start_time', params.start_time);
  if (params.end_time) searchParams.set('end_time', params.end_time);

  const query = searchParams.toString();
  try {
    return await request<AuditLogsResponse>(`/admin/audit-logs${query ? '?' + query : ''}`);
  } catch {
    return getMockAuditLogs(params.page || 1);
  }
}

function getMockAuditLogs(page: number = 1): AuditLogsResponse {
  const logs: AuditLog[] = [];
  const riskLevels: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
  const users = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi'];
  const devices = ['Mac-mini', 'MacBook-Pro', 'iMac-27', 'ThinkPad-X1'];
  const prompts = [
    '帮我写一个hello world程序',
    '解释一下什么是闭包',
    '帮我review这段代码',
    '看看这个函数的逻辑',
    '如何优化这个算法',
  ];

  for (let i = 0; i < 50; i++) {
    const created = new Date();
    created.setMinutes(created.getMinutes() - (page - 1) * 50 * 5 - i * 5);
    logs.push({
      id: `log-${page}-${i}`,
      request_id: `req-${page}-${i}`,
      user_id: users[Math.floor(Math.random() * users.length)],
      device_id: `SHA256:${devices[Math.floor(Math.random() * devices.length)]}...`,
      action: 'chat_completion',
      prompt_summary: prompts[Math.floor(Math.random() * prompts.length)],
      response_summary: '这是AI的响应摘要内容...',
      risk_level: riskLevels[Math.floor(Math.random() * riskLevels.length)],
      metadata: {
        model: 'glm-5',
        provider: 'dashscope',
        duration_ms: Math.floor(Math.random() * 3000) + 500,
      },
      created_at: created.toISOString(),
    });
  }

  return {
    logs,
    pagination: {
      page,
      page_size: 50,
      total: 250,
      total_pages: 5,
    },
  };
}

// ============ Alerts API ============
export type AlertType = 'cross_project_attempt' | 'high_risk_keyword' | 'high_risk_leakage';

export interface Alert {
  id: string;
  type: AlertType;
  user_id: string;
  device_id: string;
  status: 'pending' | 'resolved';
  detail: {
    prompt_summary?: string;
    target_repo?: string;
    user_permission?: string;
    keyword?: string;
    risk_level?: string;
    response_summary?: string;
  };
  created_at: string;
  resolved_by?: string;
  resolved_at?: string;
  note?: string;
}

export interface AlertsResponse {
  alerts: Alert[];
  pagination: PaginationInfo;
}

export async function fetchAlerts(status: 'pending' | 'resolved' = 'pending', page: number = 1): Promise<AlertsResponse> {
  try {
    return await request<AlertsResponse>(`/alerts?status=${status}&page=${page}&page_size=50`);
  } catch {
    return getMockAlerts(status, page);
  }
}

function getMockAlerts(status: 'pending' | 'resolved', page: number): AlertsResponse {
  const types: AlertType[] = ['cross_project_attempt', 'high_risk_keyword', 'high_risk_leakage'];
  const alerts: Alert[] = [];

  const count = status === 'pending' ? 3 : 12;
  for (let i = 0; i < count; i++) {
    const type = types[i % types.length];
    const created = new Date();
    created.setHours(created.getHours() - i * 2);

    const alert: Alert = {
      id: `alert-${status}-${i}`,
      type,
      user_id: ['zhangsan', 'lisi', 'wangwu'][i % 3],
      device_id: 'SHA256:MacBook...',
      status,
      detail: {
        prompt_summary: type === 'cross_project_attempt'
          ? '看看repo_B的密钥在哪里'
          : type === 'high_risk_keyword'
          ? '帮我找一下private_key'
          : '生成的代码包含password字段',
        target_repo: type === 'cross_project_attempt' ? 'repo_B' : undefined,
        user_permission: type === 'cross_project_attempt' ? 'none' : undefined,
        keyword: type !== 'cross_project_attempt' ? 'private_key' : undefined,
        risk_level: type !== 'cross_project_attempt' ? 'high' : undefined,
      },
      created_at: created.toISOString(),
    };

    if (status === 'resolved') {
      alert.resolved_by = 'admin';
      alert.resolved_at = new Date(created.getTime() + 3600000).toISOString();
      alert.note = '正常开发咨询';
    }

    alerts.push(alert);
  }

  return {
    alerts,
    pagination: { page, page_size: 50, total: count, total_pages: 1 },
  };
}

export async function resolveAlert(id: string, note: string): Promise<void> {
  await request(`/alerts/${id}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ note }),
  });
}

// ============ Devices API ============
export type DeviceStatus = 'active' | 'idle' | 'pending' | 'blocked';

export interface Device {
  id: string;
  user_id: string;
  status: DeviceStatus;
  last_seen_at: string;
  created_at: string;
}

export interface DevicesResponse {
  devices: Device[];
  total: number;
}

export async function fetchDevices(): Promise<DevicesResponse> {
  try {
    return await request<DevicesResponse>('/admin/devices');
  } catch {
    return getMockDevices();
  }
}

function getMockDevices(): DevicesResponse {
  const statuses: DeviceStatus[] = ['active', 'idle', 'pending', 'blocked'];
  const users = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'sunqi'];
  const devices: Device[] = [];

  for (let i = 0; i < 23; i++) {
    const lastSeen = new Date();
    lastSeen.setMinutes(lastSeen.getMinutes() - Math.floor(Math.random() * 1440));
    devices.push({
      id: `SHA256:Mac${i.toString().padStart(3, '0')}...`,
      user_id: users[i % users.length],
      status: statuses[i % 4],
      last_seen_at: lastSeen.toISOString(),
      created_at: new Date(Date.now() - 86400000 * 30).toISOString(),
    });
  }

  return { devices, total: 23 };
}

export async function updateDeviceStatus(id: string, status: string): Promise<void> {
  await request(`/admin/devices/${id}/status`, {
    method: 'POST',
    body: JSON.stringify({ status }),
  });
}

// ============ Policy API ============
export interface PolicyData {
  input_security: {
    enabled: boolean;
    block_keywords: string[];
    regex_patterns: string[];
  };
  output_security: {
    enabled: boolean;
    block_keywords: string[];
  };
  cross_project_detection: {
    enabled: boolean;
  };
  model: {
    provider: 'ollama' | 'dashscope' | 'zhipu';
    dashscope?: { apiKey: string; model: string };
    ollama?: { url: string; model: string };
    zhipu?: { apiKey: string; model: string };
  };
}

export async function fetchPolicy(): Promise<PolicyData> {
  try {
    return await request<PolicyData>('/admin/policy');
  } catch {
    return getMockPolicy();
  }
}

function getMockPolicy(): PolicyData {
  return {
    input_security: {
      enabled: true,
      block_keywords: ['private_key', 'password', 'secret', 'ak', 'sk'],
      regex_patterns: ['AWS_ACCESS_KEY_ID', 'BEGIN RSA PRIVATE KEY', 'eyJ[a-zA-Z0-9]{10,}'],
    },
    output_security: {
      enabled: true,
      block_keywords: ['private_key', 'password', 'secret'],
    },
    cross_project_detection: {
      enabled: true,
    },
    model: {
      provider: 'dashscope',
      dashscope: { apiKey: 'sk-xxxxx', model: 'glm-5' },
      ollama: { url: 'http://localhost:11434', model: 'qwen2.5-coder-27b-instruct' },
    },
  };
}

export async function savePolicy(policy: PolicyData): Promise<void> {
  await request('/admin/policy', {
    method: 'POST',
    body: JSON.stringify(policy),
  });
}

export async function reloadPolicy(): Promise<void> {
  await request('/admin/policy/reload', { method: 'POST' });
}

// ============ My Usage API ============
export interface UsageTrend {
  date: string;
  requests: number;
}

export interface RecentRequest {
  id: string;
  prompt_summary: string;
  risk_level: 'low' | 'medium' | 'high';
  status: 'adopted' | 'rejected' | 'pending';
  created_at: string;
}

export interface MyUsageData {
  total_requests: number;
  quota: number;
  requests_today: number;
  trend: UsageTrend[];
  recent_requests: RecentRequest[];
}

export async function fetchMyUsage(): Promise<MyUsageData> {
  try {
    return await request<MyUsageData>('/my-usage?period=month');
  } catch {
    return getMockMyUsage();
  }
}

function getMockMyUsage(): MyUsageData {
  const today = new Date();
  const trend: UsageTrend[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    trend.push({
      date: d.toISOString().split('T')[0],
      requests: Math.floor(Math.random() * 30) + 5,
    });
  }

  const statuses: ('adopted' | 'rejected' | 'pending')[] = ['adopted', 'rejected', 'pending'];
  const prompts = [
    '帮我写一个hello world',
    '解释这段代码的含义',
    '帮我review这个PR',
    '如何优化算法',
    '写一个排序函数',
  ];

  const recent: RecentRequest[] = [];
  for (let i = 0; i < 20; i++) {
    const created = new Date();
    created.setMinutes(created.getMinutes() - i * 30);
    recent.push({
      id: `req-${i}`,
      prompt_summary: prompts[i % prompts.length],
      risk_level: ['low', 'medium', 'high'][i % 3] as 'low' | 'medium' | 'high',
      status: statuses[i % 3],
      created_at: created.toISOString(),
    });
  }

  return {
    total_requests: 234,
    quota: 500,
    requests_today: 12,
    trend,
    recent_requests: recent,
  };
}

// Export types for use in components
export type { AlertType, DeviceStatus, PolicyData };
