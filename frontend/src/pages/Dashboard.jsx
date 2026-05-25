import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, MessageSquare, AlertCircle, CheckCircle2, Clock, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

const API_BASE = 'http://localhost:5000/api';

const Dashboard = () => {
  const [emails, setEmails] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [emailRes, logRes] = await Promise.all([
        axios.get(`${API_BASE}/emails`),
        axios.get(`${API_BASE}/logs`)
      ]);
      setEmails(emailRes.data);
      setLogs(logRes.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Poll for new data every 10 seconds
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, []);

  // Quick action to send test SMS
 const testSms = async () => {

  try {

    const response = await axios.post(
      "http://localhost:5000/api/sms/send",
      {
        message: "Direct Test SMS",
      }
    );

    console.log(response.data);

    alert("✅ SMS Sent Successfully");

    fetchData();

  } catch (error) {

    console.log(error);

    alert(
      "❌ SMS Failed\nCheck backend terminal"
    );

  }

};

  if (loading) {
    return <div className="card animate-fade">Loading dashboard data...</div>;
  }

  return (
    <div className="animate-fade">
      <div className="card-header">
        <h1 className="card-title">
          <ActivityIcon /> System Dashboard
        </h1>
        <button className="btn btn-primary" onClick={testSms}>
          <MessageSquare size={16} /> Send Test SMS
        </button>
      </div>

      {/* Stats/Overview Cards */}
      <div className="grid-2" style={{ marginBottom: '1.5rem', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <StatCard title="Emails Received" value={emails.length} icon={<Mail color="var(--primary)" />} />
        <StatCard title="SMS Sent" value={logs.filter(l => l.status === 'SUCCESS').length} icon={<CheckCircle2 color="var(--success)" />} />
        <StatCard title="Failed SMS" value={logs.filter(l => l.status === 'FAILED').length} icon={<AlertCircle color="var(--danger)" />} />
        <StatCard title="Monitoring" value="Active" icon={<Clock color="var(--warning)" />} />
      </div>

      <div className="grid-2">
        {/* Recent Emails Panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><Mail size={20} /> Recent Emails</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Subject</th>
                  <th>Sender</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {emails.length === 0 ? (
                  <tr><td colSpan="3" className="row-empty">No emails processed yet.</td></tr>
                ) : (
                  emails.slice(0, 5).map(email => (
                    <tr key={email.id}>
                      <td className="truncate" title={email.subject}><strong>{email.subject}</strong></td>
                      <td className="text-muted text-sm">{email.from}</td>
                      <td className="text-muted text-sm whitespace-nowrap">
                        {formatDistanceToNow(new Date(email.date), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SMS Logs Panel */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title"><MessageSquare size={20} /> SMS Delivery Logs</h2>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Message Preview</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan="3" className="row-empty">No SMS logs.</td></tr>
                ) : (
                  logs.slice(0, 5).map(log => (
                    <tr key={log.id}>
                      <td>
                        <span className={`badge ${log.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="truncate" title={log.message}>{log.message}</td>
                      <td className="text-muted text-sm whitespace-nowrap">
                        {formatDistanceToNow(new Date(log.date), { addSuffix: true })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const ActivityIcon = () => <Activity size={24} color="var(--primary)" />;

const StatCard = ({ title, value, icon }) => (
  <div className="card" style={{ marginBottom: 0, padding: '1.25rem' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
      <span className="text-muted text-sm font-medium">{title}</span>
      {icon}
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: '700' }}>{value}</div>
  </div>
);

export default Dashboard;
