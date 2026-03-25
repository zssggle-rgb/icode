/**
 * Regression test for ISSUE-002
 * URL: .gstack/qa-reports/qa-report-icodegateway-2026-03-25.md
 *
 * Bug: GatewayDeviceManager called setDevices(res.data) but API returns
 * { code: 0, data: { devices: [...], total: n } }. The .map() call
 * on the outer object caused TypeError → blank page.
 * Fix: Use res.data.devices instead of res.data.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import GatewayDeviceManager from '../GatewayDeviceManager';

// Mock global fetch
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

const mockDevices = [
  { id: 'fp-001', fingerprint: 'fp-001', user_id: 'alice', status: 'active', last_seen_at: '2026-03-25T10:00:00Z', created_at: '2026-03-25T09:00:00Z' },
  { id: 'fp-002', fingerprint: 'fp-002', user_id: 'bob', status: 'idle', last_seen_at: '2026-03-25T09:30:00Z', created_at: '2026-03-25T09:00:00Z' },
];

describe('GatewayDeviceManager - ISSUE-002 Regression', () => {
  beforeEach(() => {
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        json: () => Promise.resolve({ code: 0, data: { devices: mockDevices, total: 2 } }),
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should render devices from res.data.devices (not res.data)', async () => {
    render(<GatewayDeviceManager />);

    // Verify fetch was called
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/v1/admin/devices');
    });

    // Verify devices are displayed
    await waitFor(() => {
      expect(screen.getByText(/fp-001/)).toBeTruthy();
      expect(screen.getByText(/fp-002/)).toBeTruthy();
    });
  });

  it('should correctly extract devices from API response structure { code, data: { devices, total } }', async () => {
    render(<GatewayDeviceManager />);

    // The API response structure is { code: 0, data: { devices: [...], total: n } }
    // NOT { code: 0, data: [...] }
    // This test verifies the fix: use res.data.devices
    await waitFor(() => {
      expect(screen.queryByText(/fp-001/)).toBeTruthy();
    });
  });
});
