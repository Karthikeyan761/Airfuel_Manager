import React, { useState, useEffect, useCallback } from 'react';
import { usage } from '../api/services';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { CalendarDays, RefreshCw } from 'lucide-react';

const DailyUsagePage = () => {
  const [data, setData]     = useState([]);
  const [loading, setLoading] = useState(true);
  const [days, setDays]     = useState(14);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usage.list({ days });
      const raw = res.data.records || res.data;
      const formatted = raw.map(d => ({
        ...d,
        label: new Date(d.usage_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        jet_a1_used:  d.jet_a1_used  || 0,
        avgas_used:   d.avgas_used   || 0,
        total_fuel_used_liters: d.total_fuel_used_liters || 0,
        total_fuel_cost: d.total_fuel_cost || 0,
        total_flights: d.total_flights || 0,
      }));
      setData(formatted);
    } catch (err) {
      console.error('Failed to load daily usage', err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalFuel  = data.reduce((s, d) => s + d.total_fuel_used_liters, 0);
  const totalCost  = data.reduce((s, d) => s + d.total_fuel_cost, 0);
  const totalFlights = data.reduce((s, d) => s + d.total_flights, 0);
  const avgCostPerL  = totalFuel > 0 ? totalCost / totalFuel : 0;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1">Daily Fuel Usage</h1>
          <p className="text-muted">Jet A1 &amp; Avgas consumption — stacked daily breakdown</p>
        </div>
        <div className="page-actions">
          <div style={{ display: 'flex', gap: 4, background: 'white', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
            {[7, 14, 30, 60].map(d => (
              <button
                key={d}
                id={`usage-range-${d}`}
                onClick={() => setDays(d)}
                style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                  fontWeight: 600, fontSize: '0.82rem', fontFamily: 'Plus Jakarta Sans, sans-serif',
                  background: days === d ? 'var(--primary-accent)' : 'transparent',
                  color: days === d ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >{d}D</button>
            ))}
          </div>
          <button className="btn-secondary" onClick={fetchData} id="refresh-usage">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {/* Summary KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        {[
          { label: `Total Fuel (${days}D)`,    value: `${totalFuel.toLocaleString(undefined,{maximumFractionDigits:0})} L`,  color: 'var(--primary-accent)',   bg: 'var(--primary-light)' },
          { label: `Total Cost (${days}D)`,    value: `₹${totalCost.toLocaleString(undefined,{maximumFractionDigits:0})}`,  color: 'var(--warning)',          bg: 'var(--warning-light)' },
          { label: `Total Flights (${days}D)`, value: totalFlights,                                                          color: 'var(--tertiary-accent)',  bg: 'var(--tertiary-light)' },
          { label: 'Avg Cost / Litre',          value: `₹${avgCostPerL.toFixed(2)}`,                                         color: 'var(--secondary-accent)', bg: 'var(--secondary-light)' },
        ].map(s => (
          <div key={s.label} className="glass-card card" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div className="text-label">{s.label}</div>
            <div style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '1.6rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Stacked bar chart */}
      <div className="glass-card" style={{ padding: 24, marginBottom: 24 }}>
        <h3 className="text-h3" style={{ marginBottom: 4 }}>Stacked Daily Consumption</h3>
        <p className="text-muted" style={{ fontSize: '0.82rem', marginBottom: 20 }}>Jet A1 (blue) stacked with Avgas (amber) per day</p>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading chart…</span></div>
        ) : (
          <div style={{ height: 320 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={Math.max(6, Math.round(560 / Math.max(data.length, 1)) - 4)}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(data.length / 12) - 1)} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v, name) => [`${v?.toLocaleString()} L`, name === 'jet_a1_used' ? 'Jet A1' : 'Avgas']}
                />
                <Legend iconType="circle" iconSize={8} formatter={v => v === 'jet_a1_used' ? 'Jet A1' : 'Avgas'} />
                <Bar dataKey="jet_a1_used" stackId="a" fill="#1d4ed8" name="jet_a1_used" radius={[0,0,0,0]} />
                <Bar dataKey="avgas_used"  stackId="a" fill="#d97706" name="avgas_used"  radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Daily log table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <CalendarDays size={18} style={{ color: 'var(--primary-accent)' }} />
          <h3 className="text-h3">Daily Log</h3>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th style={{ textAlign: 'right' }}>Flights</th>
                <th style={{ textAlign: 'right' }}>Jet A1 (L)</th>
                <th style={{ textAlign: 'right' }}>Avgas (L)</th>
                <th style={{ textAlign: 'right' }}>Total Fuel (L)</th>
                <th style={{ textAlign: 'right' }}>Total Cost (₹)</th>
                <th style={{ textAlign: 'right' }}>Avg ₹ / L</th>
              </tr>
            </thead>
            <tbody>
              {data.slice().reverse().map(d => (
                <tr key={d.usage_date}>
                  <td style={{ fontWeight: 600 }}>{d.label}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className="badge badge-blue">{d.total_flights}</span>
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--primary-accent)', fontWeight: 600 }}>
                    {d.jet_a1_used?.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--warning)', fontWeight: 600 }}>
                    {d.avgas_used?.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    {d.total_fuel_used_liters?.toLocaleString()}
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 700 }}>
                    ₹{d.total_fuel_cost?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                    ₹{d.total_fuel_used_liters > 0
                      ? (d.total_fuel_cost / d.total_fuel_used_liters).toFixed(2)
                      : '—'}
                  </td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No usage data for selected period.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DailyUsagePage;
