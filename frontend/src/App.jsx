import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Topbar from './components/Topbar';
import Toaster from './components/ui/Toast';
import Dashboard from './pages/Dashboard';
import EmailsPage from './pages/EmailsPage';
import NotificationsPage from './pages/NotificationsPage';
import ClassificationPage from './pages/ClassificationPage';
import VoiceCallsPage from './pages/VoiceCallsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

function App() {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('ms:collapsed') === '1');
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem('ms:collapsed', collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <Router>
      <div className="app-atmosphere" />
      <Toaster />
      <div className="relative z-10 flex min-h-screen">
        <Sidebar
          collapsed={collapsed}
          onToggle={() => setCollapsed((v) => !v)}
          mobileOpen={mobileOpen}
          onCloseMobile={() => setMobileOpen(false)}
        />

        <div className="flex-1 min-w-0 flex flex-col">
          <Topbar onMenuClick={() => setMobileOpen(true)} />

          <main className="flex-1 p-4 sm:p-6 lg:p-8">
            <div className="max-w-[1400px] mx-auto">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/emails" element={<EmailsPage />} />
                <Route path="/important" element={<EmailsPage presetPriority="IMPORTANT" />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/classification" element={<ClassificationPage />} />
                <Route path="/voice" element={<VoiceCallsPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </div>
          </main>

          <footer className="px-6 py-4 text-center text-[11px] text-slate-600 border-t border-white/[0.05]">
            Email to SMS Converter (Offline Notifier) · MailSense AI · Active channels: SMS + AI Voice Call
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
