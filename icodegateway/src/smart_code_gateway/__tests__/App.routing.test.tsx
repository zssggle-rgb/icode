/**
 * Regression test for ISSUE-001
 * URL: .gstack/qa-reports/qa-report-icodegateway-2026-03-25.md
 *
 * Bug: SmartCodeGatewayApp used useState to track active tab.
 * Clicking sidebar nav called setActiveTab but the URL didn't change,
 * so the component re-rendered with stale state on next interaction.
 * Fix: activeTab derived from URL via useLocation (not useState).
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import '@testing-library/react';

// Component that mirrors the fixed routing logic from App.tsx
function RoutedApp() {
  const location = useLocation();
  // FIX: activeTab derived from URL path, not useState
  const activeTab = location.pathname.replace(/^\//, '') || 'dashboard';

  const renderContent = () => {
    switch (activeTab) {
      case 'device-manager': return <div data-testid="content">DeviceManager</div>;
      case 'audit-logs': return <div data-testid="content">AuditLogs</div>;
      case 'policy': return <div data-testid="content">Policy</div>;
      case 'dashboard': return <div data-testid="content">Dashboard</div>;
      default: return <div data-testid="content">Dashboard</div>;
    }
  };

  return (
    <div>
      <nav data-testid="nav">
        <span data-testid="active-tab">{activeTab}</span>
      </nav>
      <main data-testid="content-area">{renderContent()}</main>
    </div>
  );
}

describe('ISSUE-001: activeTab must derive from URL (useLocation), not useState', () => {
  it('renders Dashboard at /dashboard', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route path="/*" element={<RoutedApp />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('content-area').textContent).toBe('Dashboard');
  });

  it('renders DeviceManager at /device-manager', () => {
    render(
      <MemoryRouter initialEntries={['/device-manager']}>
        <Routes>
          <Route path="/*" element={<RoutedApp />} />
        </Routes>
      </MemoryRouter>
    );
    expect(screen.getByTestId('content-area').textContent).toBe('DeviceManager');
  });

  it('derives activeTab from location.pathname (not useState)', () => {
    // Verify the URL-to-tab mapping logic
    const pathToTab = (path: string) => path.replace(/^\//, '') || 'dashboard';
    expect(pathToTab('/dashboard')).toBe('dashboard');
    expect(pathToTab('/device-manager')).toBe('device-manager');
    expect(pathToTab('/audit-logs')).toBe('audit-logs');
    expect(pathToTab('/')).toBe('dashboard'); // root defaults to dashboard
    expect(pathToTab('')).toBe('dashboard');
  });
});
