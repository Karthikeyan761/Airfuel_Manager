import React, { useState, useEffect } from 'react';
import { dashboard } from '../api/services';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, AreaChart, Area, LineChart, Line, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import {
  Fuel, DollarSign, Plane, Activity, AlertTriangle,
  TrendingUp, TrendingDown, Minus, RefreshCw, BarChart2, PieChart as PieIcon,
  Shield, CheckCircle
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const KpiCard = ({ label, value, sub, icon, accent = 'blue', trend }) => {
  const colorMap = {
    blue:   { bg: 'var(--primary-light)',   color: 'var(--primary-accent)' },
    green:  { bg: 'var(--secondary-light)', color: 'var(--secondary-accent)' },
    amber:  { bg: 'var(--warning-light)',   color: 'var(--warning)' },
    purple: { bg: 'var(--tertiary-light)',  color: 'var(--tertiary-accent)' },
  };
  const c = colorMap[accent];
  return (
    <div className="stat-card glass-card card" style={{ padding: '20px 16px' }}>
      <div className="stat-card-icon" style={{ background: c.bg, color: c.color }}>
        {icon}
      </div>
      <div>
        <div className="stat-label" style={{ fontSize: '0.65rem' }}>{label}</div>
        <div className="stat-value" style={{ fontSize: '1.4rem' }}>{value}</div>
        {sub && (
          <div className="stat-sub" style={{ fontSize: '0.7rem' }}>
            {trend === 'up'   && <TrendingUp  size={12} style={{ color: 'var(--danger)' }} />}
            {trend === 'down' && <TrendingDown size={12} style={{ color: 'var(--secondary-accent)' }} />}
            {!trend           && <Minus size={12} />}
            {sub}
          </div>
        )}
      </div>
    </div>
  );
};

const FuelSelector = ({ activeFuels, onToggle }) => (
  <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
    {[
      { label: 'Jet A1', color: '#1d4ed8' },
      { label: 'Avgas',  color: '#059669' }
    ].map(f => (
      <button
        key={f.label}
        onClick={() => onToggle(f.label)}
        style={{
          padding: '6px 14px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: 700,
          border: '1px solid',
          borderColor: activeFuels.includes(f.label) ? f.color : 'var(--border-color)',
          background: activeFuels.includes(f.label) ? `${f.color}15` : 'rgba(255,255,255,0.05)',
          color: activeFuels.includes(f.label) ? f.color : 'var(--text-faint)',
          cursor: 'pointer',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          boxShadow: activeFuels.includes(f.label) ? `0 2px 8px ${f.color}33` : 'none'
        }}
      >
        <div style={{ 
          width: 8, 
          height: 8, 
          borderRadius: '50%', 
          background: activeFuels.includes(f.label) ? f.color : '#94a3b8',
          boxShadow: activeFuels.includes(f.label) ? `0 0 8px ${f.color}` : 'none'
        }} />
        {f.label}
      </button>
    ))}
  </div>
);

const DashboardPage = () => {
  const { user }                  = useAuth();
  const [kpis, setKpis]           = useState(null);
  const [usageData, setUsageData] = useState([]);
  const [priceData, setPriceData] = useState([]);
  const [acData, setAcData]       = useState([]);
  const [activeFuels, setActiveFuels] = useState(['Jet A1', 'Avgas']);
  const [loading, setLoading]     = useState(true);

  const toggleFuel = (fuel) => {
    setActiveFuels(prev => {
      if (prev.includes(fuel)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter(f => f !== fuel);
      } else {
        return [...prev, fuel];
      }
    });
  };

  const fetchData = async () => {
    try {
      const [kpiRes, usageRes, priceRes, acRes] = await Promise.all([
        dashboard.getKPIs(),
        dashboard.getConsumptionChart(),
        dashboard.getPriceChart(),
        dashboard.getAircraftConsumption(),
      ]);
      setKpis(kpiRes.data);

      setUsageData(usageRes.data.map(d => ({
        ...d,
        label: new Date(d.usage_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })));

      setPriceData(priceRes.data.map(d => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })));

      setAcData(acRes.data);
    } catch (err) {
      console.error('Dashboard fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) return (
    <div className="loading-screen" style={{
      backgroundImage: 'url("/landing_plane.png")',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      position: 'fixed',
      inset: 0,
      zIndex: 2000
    }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.8)', backdropFilter: 'blur(10px)' }} />
      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
        <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }} />
        <span style={{ fontWeight: 600, color: 'var(--primary-accent)', letterSpacing: '0.05em' }}>PREPARING YOUR DASHBOARD…</span>
      </div>
    </div>
  );

  const inventoryData = [
    { name: 'Jet A1', value: kpis?.fuel_stock?.['Jet A1'] || 0, color: '#1d4ed8' },
    { name: 'Avgas',  value: kpis?.fuel_stock?.['Avgas'] || 0,  color: '#059669' }
  ];

  return (
    <div>
      {/* Premium Welcome Banner */}
      <div className="glass-card" style={{
        marginBottom: 32,
        padding: '32px 40px',
        background: 'linear-gradient(135deg, rgba(29, 78, 216, 0.03) 0%, rgba(5, 150, 105, 0.03) 100%), url("/landing_plane.png")',
        backgroundSize: 'cover',
        backgroundPosition: 'center 45%',
        borderRadius: 'var(--radius-xl)',
        position: 'relative',
        overflow: 'hidden',
        border: '1px solid var(--border-color)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: 'var(--shadow-lg)'
      }}>
        {/* Banner Overlay for readability */}
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.7) 40%, rgba(255, 255, 255, 0) 100%)',
          zIndex: 1
        }} />

        <div style={{ position: 'relative', zIndex: 2 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--primary-accent)', marginBottom: 12 }}>
            <div style={{ background: 'var(--primary-light)', padding: 6, borderRadius: 8 }}>
              <Shield size={20} />
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {user?.role} Portal Access
            </span>
          </div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 800, marginBottom: 8, color: 'var(--text-main)' }}>
            Welcome back, <span className="gradient-text">{user?.username}</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500, maxWidth: 400 }}>
            Here's the latest data for your aviation fuel operations as of {new Date().toLocaleDateString()}.
          </p>
        </div>

        <div style={{ position: 'relative', zIndex: 2, display: 'flex', gap: 12 }}>
          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-faint)' }}>SYSTEM STATUS</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--success)', fontWeight: 700 }}>
              <CheckCircle size={14} /> Operational
            </div>
          </div>
          <button className="btn-primary" onClick={fetchData} style={{ padding: '12px 24px' }}>
            <RefreshCw size={18} /> Update Data
          </button>
        </div>
      </div>

      {/* Stats/KPIs Section Header */}
      <div style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
         <div style={{ height: 1, flex: 1, background: 'var(--border-color)' }} />
         <span style={{ color: 'var(--text-faint)', fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase' }}>Key Performance Indicators</span>
         <div style={{ height: 1, flex: 1, background: 'var(--border-color)' }} />
      </div>

      {/* Alerts */}
      {kpis?.alerts?.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
          {kpis.alerts.map((alert, idx) => (
            <div key={idx} className="alert alert-warning" style={{ alignItems: 'center' }}>
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div style={{ fontWeight: 600 }}>{alert.message}</div>
            </div>
          ))}
        </div>
      )}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 16, marginBottom: 24 }}>
        <KpiCard
          label="TOTAL FUEL STOCK"
          value={`${(kpis?.fuel_stock?.['Jet A1'] + kpis?.fuel_stock?.['Avgas'] || 0).toLocaleString()} L`}
          icon={<Fuel size={20} />}
          accent="blue"
          sub={`Jet A1: ${(kpis?.fuel_stock?.['Jet A1'] || 0).toLocaleString()} L | Avgas: ${(kpis?.fuel_stock?.['Avgas'] || 0).toLocaleString()} L`}
        />
        <KpiCard
          label="JET A1 PRICE"
          value={`₹${kpis?.current_prices?.['Jet A1'] || '95.81'}`}
          icon={<DollarSign size={20} />}
          accent="amber"
          sub="per Liter (latest)"
        />
        <KpiCard
          label="TODAY'S USAGE"
          value={`${(kpis?.today?.fuel_used_liters || 0).toLocaleString()} L`}
          icon={<Activity size={20} />}
          accent="green"
          sub={`${kpis?.today?.flights || 0} flights · ₹0`}
        />
        <KpiCard
          label="MONTHLY FLIGHTS"
          value={kpis?.this_month?.total_flights || 0}
          icon={<Plane size={20} />}
          accent="purple"
          sub={`₹${((kpis?.this_month?.total_fuel_cost || 0)/1000).toFixed(1)}K cost this month`}
        />
        <KpiCard
          label="ACTIVE AIRCRAFT"
          value={kpis?.total_active_aircraft || 0}
          icon={<Plane size={20} />}
          accent="blue"
          sub={`${kpis?.active_flights || 0} flights scheduled`}
        />
        <KpiCard
          label="MONTHLY FUEL USED"
          value={`${((kpis?.this_month?.total_fuel_used_liters || 0)/1000).toFixed(1)}K L`}
          icon={<Fuel size={20} />}
          accent="purple"
          sub="liters this month"
        />
      </div>

      {/* Charts Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Consumption Area Chart */}
        <div className="glass-card card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h3 className="text-h3" style={{ display:'flex', alignItems: 'center', gap: 6 }}>
               <Activity size={16} style={{ color: 'var(--primary-accent)' }} /> Daily Fuel Consumption (Last 30 days)
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Select fuels to display on trend</p>
          <FuelSelector activeFuels={activeFuels} onToggle={toggleFuel} />
          
          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={usageData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradJet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAvgas" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#059669" stopOpacity={0.12} />
                    <stop offset="95%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={Math.ceil(usageData.length / 8)} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v, name) => [`${v?.toLocaleString()} L`, name === 'jet_a1_used' ? 'Jet A1' : 'Avgas']}
                />
                <Legend iconType="circle" iconSize={8} />
                {activeFuels.includes('Jet A1') && (
                  <Area type="monotone" dataKey="jet_a1_used" name="Jet A1" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#gradJet)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={true} />
                )}
                {activeFuels.includes('Avgas') && (
                  <Area type="monotone" dataKey="avgas_used"  name="Avgas"  stroke="#059669" strokeWidth={2.5} fill="url(#gradAvgas)" dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={true} />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Price Trend Chart */}
        <div className="glass-card card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <h3 className="text-h3" style={{ display:'flex', alignItems: 'center', gap: 6 }}>
               <TrendingUp size={16} style={{ color: 'var(--tertiary-accent)' }} /> Fuel Price Trend
            </h3>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>Select fuels to display on trend</p>
          <FuelSelector activeFuels={activeFuels} onToggle={toggleFuel} />

          <div style={{ height: 210 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={priceData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={Math.ceil(priceData.length / 8)} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 5', 'dataMax + 5']} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v, name) => [`₹${v?.toFixed(2)}`, name]}
                />
                <Legend iconType="circle" iconSize={8} />
                {activeFuels.includes('Jet A1') && (
                  <Line type="monotone" dataKey="jet_a1_price" name="Jet A1" stroke="#1d4ed8" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={true} />
                )}
                {activeFuels.includes('Avgas') && (
                  <Line type="monotone" dataKey="avgas_price"  name="Avgas"  stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} connectNulls={true} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        {/* Aircraft Consumption Bar Chart */}
        <div className="glass-card card" style={{ padding: 20 }}>
           <h3 className="text-h3" style={{ marginBottom: 4, display:'flex', alignItems: 'center', gap: 6 }}>
             <BarChart2 size={16} style={{ color: 'var(--secondary-accent)' }} /> Aircraft Fuel Consumption
          </h3>
          <div style={{ height: 210, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={acData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="model" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v) => [`${v?.toLocaleString()} L`, 'Total Fuel Used']}
                />
                <Bar dataKey="total_fuel_used" name="Total Fuel Used" fill="var(--primary-accent)" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Inventory Pie Chart */}
        <div className="glass-card card" style={{ padding: 20 }}>
           <h3 className="text-h3" style={{ marginBottom: 4, display:'flex', alignItems: 'center', gap: 6 }}>
             <PieIcon size={16} style={{ color: 'var(--warning)' }} /> Stock Distribution
          </h3>
          <div style={{ height: 210, marginTop: 16 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={inventoryData} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} dataKey="value" stroke="none">
                  {inventoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v, name) => [`${v?.toLocaleString()} L`, name]}
                />
                <Legend iconType="circle" iconSize={8} verticalAlign="bottom" height={36} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
