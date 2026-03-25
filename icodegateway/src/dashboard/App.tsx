import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Overview from './pages/Overview';
import AuditLog from './pages/AuditLog';
import Alerts from './pages/Alerts';
import Devices from './pages/Devices';
import Policy from './pages/Policy';
import MyUsage from './pages/MyUsage';

export default function DashboardApp() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Overview />} />
        <Route path="/overview" element={<Overview />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/devices" element={<Devices />} />
        <Route path="/policy" element={<Policy />} />
        <Route path="/my-usage" element={<MyUsage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
