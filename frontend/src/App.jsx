import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mail, Settings, Activity, Smartphone } from 'lucide-react';
import Dashboard from './pages/Dashboard';
import SettingsPage from './pages/SettingsPage';
import './index.css';

// Sidebar Link Component
const NavLink = ({ to, icon, label }) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <Link to={to} className={`nav-item ${isActive ? 'active' : ''}`}>
      {icon}
      <span>{label}</span>
      {isActive && <div className="active-indicator" />}
    </Link>
  );
};

function App() {
  return (
    <Router>
      <div className="app-container">
        {/* Sidebar Navigation */}
        <aside className="sidebar">
          <div className="logo-container">
            <Smartphone className="logo-icon" size={28} />
            <span>SMS Notifier</span>
          </div>
          
          <nav className="nav-links">
            <NavLink to="/" icon={<Activity size={20} />} label="Dashboard" />
            {/* <NavLink to="/emails" icon={<Mail size={20} />} label="All Emails" /> */}
            <NavLink to="/settings" icon={<Settings size={20} />} label="Settings" />
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
