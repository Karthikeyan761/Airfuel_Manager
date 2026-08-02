import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Plane, PlaneTakeoff, Fuel,
  TrendingUp, FileText, LogOut, Users,
  ArrowLeftRight, CalendarDays, ShieldCheck
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const navSections = [
    {
      label: 'OVERVIEW',
      items: [
        { 
          to: '/', 
          icon: (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M3 3v18h18" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <rect x="6" y="14" width="4" height="7" fill="#ef4444" rx="1"/>
              <rect x="11" y="9"  width="4" height="12" fill="#3b82f6" rx="1"/>
              <rect x="16" y="4"  width="4" height="17" fill="#10b981" rx="1"/>
            </svg>
          ), 
          label: 'Dashboard', 
          end: true 
        },
      ]
    },
    {
      label: 'FUEL OPERATIONS',
      items: [
        { to: '/purchases',     icon: <Fuel size={18} fill="#ef4444" color="#ef4444" />,        label: 'Fuel Purchases' },
        { to: '/inventory',     icon: <FileText size={18} fill="#8b5cf6" color="#8b5cf6" />,    label: 'Inventory' },
        { to: '/transactions',  icon: <ArrowLeftRight size={18} color="#0284c7" strokeWidth={2.5} />, label: 'Transactions' },
      ]
    },
    {
      label: 'FLIGHT MANAGEMENT',
      items: [
        { to: '/aircraft', icon: <Plane size={18} fill="#3b82f6" color="#3b82f6" />,         label: 'Aircraft' },
        { to: '/flights',  icon: <PlaneTakeoff size={18} color="#3b82f6" strokeWidth={2.5} />,       label: 'Flights & Trips' },
        { to: '/daily-usage',   icon: <CalendarDays size={18} color="#6366f1" fill="#e0e7ff" strokeWidth={2} />,   label: 'Daily Usage' },
      ]
    },
    {
      label: 'ANALYTICS',
      items: [
        { to: '/reports', icon: <FileText size={18} fill="#ffedd5" color="#f97316" />,   label: 'Reports' },
        { to: '/trends',  icon: <TrendingUp size={18} color="#8b5cf6" strokeWidth={2.5} />, label: 'Price Trends' },
      ]
    },
    ...(user?.role === 'admin' ? [{
      label: 'ADMIN',
      items: [
        { to: '/users', icon: <Users size={18} color="#64748b" />, label: 'User Management' },
      ]
    }] : [])
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-header" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, backgroundColor: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Plane size={24} color="white" fill="white" />
        </div>
        <div>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 800, margin: 0, lineHeight: 1.2, letterSpacing: '0.05em' }}>AEROFUEL MANAGER</h2>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500, marginTop: 2 }}>Fuel Cost &amp; Trip System</div>
        </div>
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {navSections.map((section) => (
          <div key={section.label}>
            <div className="sidebar-section-label" style={{ marginTop: 24, marginBottom: 12 }}>{section.label}</div>
            {section.items.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '10px 12px', marginBottom: '4px',
          background: 'var(--card-bg-subtle)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'linear-gradient(135deg, #1d4ed8, #059669)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0
          }}>
            {user?.username?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.username}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <ShieldCheck size={10} style={{ color: user?.role === 'admin' ? 'var(--primary-accent)' : 'var(--secondary-accent)' }} />
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.role}</span>
            </div>
          </div>
        </div>

        <button onClick={handleLogout} className="nav-item" style={{ color: 'var(--danger)' }}>
          <LogOut size={18} />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
