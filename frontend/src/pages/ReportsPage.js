import React, { useState, useEffect, useCallback } from 'react';
import { reports, aircraft as aircraftApi } from '../api/services';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from 'recharts';
import { FileText, Download, Loader, Plane, CalendarRange } from 'lucide-react';

const REPORT_TYPES = [
  { id: 'trip_costs',           label: 'Trip Costs',          icon: <FileText size={18}/>,    desc: 'Per-flight fuel cost breakdown' },
  { id: 'monthly_usage',       label: 'Monthly Usage',        icon: <CalendarRange size={18}/>, desc: 'Month-by-month aggregation' },
  { id: 'aircraft_consumption',label: 'Aircraft Comparison',  icon: <Plane size={18}/>,        desc: 'Consumption across fleet' },
];

const COLORS = ['#1d4ed8','#059669','#7c3aed','#d97706','#dc2626'];

const ReportsPage = () => {
  const [activeType, setActiveType] = useState('trip_costs');
  const [startDate, setStartDate]   = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().slice(0,10); });
  const [endDate, setEndDate]       = useState(() => new Date().toISOString().slice(0,10));
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(false);
  const [exporting, setExporting]   = useState(false);
  const [fleet, setFleet]           = useState([]);
  const [aircraftFilter, setAircraftFilter] = useState('');

  useEffect(() => { aircraftApi.list().then(r => setFleet(r.data)).catch(()=>{}); }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (activeType === 'trip_costs') {
        const params = { start_date: startDate, end_date: endDate };
        if (aircraftFilter) params.aircraft_id = aircraftFilter;
        res = await reports.getTripCosts(params);
      } else if (activeType === 'monthly_usage') {
        res = await reports.getMonthlyUsage();
      } else {
        res = await reports.getAircraftConsumption({ start_date: startDate, end_date: endDate });
      }
      setData(res.data);
    } catch (err) {
      console.error('Report fetch error', err);
    } finally {
      setLoading(false);
    }
  }, [activeType, startDate, endDate, aircraftFilter]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await reports.exportPdf({ report_type: activeType, start_date: startDate, end_date: endDate });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `aerofuel_${activeType}_${startDate}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  /* ── Render helpers ─────────────────────── */
  const TripCostsView = () => {
    if (!data) return null;
    const { trips = [], summary = {} } = data;
    return (
      <>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginBottom: 24 }}>
          {[
            { label: 'Total Trips',    value: summary.total_trips || 0                                                               },
            { label: 'Total Fuel',     value: `${(summary.total_fuel_used || 0).toLocaleString()} L`                                },
            { label: 'Total Cost',     value: `₹${(summary.total_fuel_cost || 0).toLocaleString(undefined,{minimumFractionDigits:2})}` },
          ].map(s => (
            <div key={s.label} className="glass-card card" style={{ padding: '18px 20px', textAlign: 'center' }}>
              <div className="text-label" style={{ marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily:'Outfit,sans-serif', fontWeight:700, fontSize:'1.5rem', color:'var(--primary-accent)' }}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Flight #</th><th>Date</th><th>Route</th><th>Aircraft</th>
                <th style={{textAlign:'right'}}>Dist (km)</th>
                <th style={{textAlign:'right'}}>Fuel Used</th>
                <th style={{textAlign:'right'}}>Efficiency</th>
                <th style={{textAlign:'right'}}>Trip Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {trips.map(t => (
                <tr key={t.flight_number}>
                  <td style={{fontWeight:700, fontFamily:'Outfit,sans-serif'}}>{t.flight_number}</td>
                  <td style={{color:'var(--text-muted)', fontSize:'0.85rem'}}>{t.flight_date}</td>
                  <td style={{fontSize:'0.88rem'}}>{t.route}</td>
                  <td style={{color:'var(--primary-accent)', fontWeight:600}}>{t.aircraft}</td>
                  <td style={{textAlign:'right'}}>{t.distance_km?.toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>{t.actual_fuel?.toLocaleString()} L</td>
                  <td style={{textAlign:'right'}}>
                    <span className={`badge ${t.efficiency < 1.0 ? 'badge-green' : (t.efficiency < 1.1 ? 'badge-blue':'badge-amber')}`}>
                      {(t.efficiency * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{textAlign:'right', fontWeight:700}}>₹{t.trip_fuel_cost?.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {trips.length === 0 && <tr><td colSpan="8" style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>No completed trips in selected period.</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const MonthlyUsageView = () => {
    if (!data) return null;
    const months = data.data || [];
    return (
      <>
        <div style={{ height: 280, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={months} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={32}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="month_name" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:13 }} formatter={v => [`${v?.toLocaleString()} L`,'Fuel Used']} />
              <Bar dataKey="total_fuel_used" name="Fuel Used" radius={[6,6,0,0]}>
                {months.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th style={{textAlign:'right'}}>Flights</th>
                <th style={{textAlign:'right'}}>Jet A1 (L)</th>
                <th style={{textAlign:'right'}}>Avgas (L)</th>
                <th style={{textAlign:'right'}}>Total Fuel (L)</th>
                <th style={{textAlign:'right'}}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {months.map(m => (
                <tr key={m.month_name}>
                  <td style={{fontWeight:600}}>{m.month_name}</td>
                  <td style={{textAlign:'right'}}>{m.total_flights}</td>
                  <td style={{textAlign:'right'}}>{m.jet_a1_used?.toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>{m.avgas_used?.toLocaleString()}</td>
                  <td style={{textAlign:'right', fontWeight:600}}>{m.total_fuel_used?.toLocaleString()}</td>
                  <td style={{textAlign:'right', fontWeight:700, color:'var(--primary-accent)'}}>₹{m.total_cost?.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  const AircraftView = () => {
    if (!data) return null;
    const items = data.data || [];
    return (
      <>
        <div style={{ height: 260, marginBottom: 24 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={items} margin={{ top: 5, right: 10, left: 0, bottom: 0 }} barSize={36}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="aircraft_id" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ borderRadius:10, border:'1px solid #e2e8f0', boxShadow:'0 4px 12px rgba(0,0,0,0.08)', fontFamily:'Plus Jakarta Sans,sans-serif', fontSize:13 }} formatter={v=>[`${v?.toLocaleString()} L`,'Fuel Used']} />
              <Bar dataKey="total_fuel_used_liters" name="Fuel Used" radius={[6,6,0,0]}>
                {items.map((_,i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>Aircraft</th><th>Model</th>
                <th style={{textAlign:'right'}}>Flights</th>
                <th style={{textAlign:'right'}}>Fuel Used (L)</th>
                <th style={{textAlign:'right'}}>Distance (km)</th>
                <th style={{textAlign:'right'}}>Avg Efficiency</th>
                <th style={{textAlign:'right'}}>Total Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {items.map(a => (
                <tr key={a.aircraft_id}>
                  <td style={{fontWeight:700, color:'var(--primary-accent)', fontFamily:'Outfit,sans-serif'}}>{a.aircraft_id}</td>
                  <td>{a.model}</td>
                  <td style={{textAlign:'right'}}>{a.total_flights}</td>
                  <td style={{textAlign:'right', fontWeight:600}}>{a.total_fuel_used_liters?.toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>{a.total_distance_km?.toLocaleString()}</td>
                  <td style={{textAlign:'right'}}>
                    <span className={`badge ${a.avg_efficiency < 1.0 ? 'badge-green' : 'badge-amber'}`}>
                      {((a.avg_efficiency||1)*100).toFixed(1)}%
                    </span>
                  </td>
                  <td style={{textAlign:'right', fontWeight:700}}>₹{a.total_fuel_cost?.toLocaleString(undefined,{minimumFractionDigits:2})}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan="7" style={{textAlign:'center',padding:'48px',color:'var(--text-muted)'}}>No data available.</td></tr>}
            </tbody>
          </table>
        </div>
      </>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1">Reports &amp; Analytics</h1>
          <p className="text-muted">Comprehensive fuel cost and usage reports with PDF export</p>
        </div>
        <button id="export-pdf-btn" className="btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? <><Loader size={16} style={{ animation:'spin 0.7s linear infinite' }}/> Generating…</> : <><Download size={16}/> Export PDF</>}
        </button>
      </div>

      {/* Report type tabs */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        {REPORT_TYPES.map(rt => (
          <button
            key={rt.id}
            id={`report-tab-${rt.id}`}
            onClick={() => setActiveType(rt.id)}
            style={{
              flex: 1, padding: '14px 16px', borderRadius: 'var(--radius-md)',
              border: `2px solid ${activeType === rt.id ? 'var(--primary-accent)' : 'var(--border-color)'}`,
              background: activeType === rt.id ? 'var(--primary-light)' : 'white',
              cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s ease',
              fontFamily: 'Plus Jakarta Sans, sans-serif'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: activeType === rt.id ? 'var(--primary-accent)' : 'var(--text-muted)', marginBottom: 4 }}>
              {rt.icon}
              <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{rt.label}</span>
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{rt.desc}</div>
          </button>
        ))}
      </div>

      {/* Date filters */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {activeType !== 'monthly_usage' && (
            <>
              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>Start Date</label>
                <input type="date" id="report-start" className="form-input" style={{ height: 38, width: 160 }} value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label className="form-label" style={{ fontSize: '0.78rem' }}>End Date</label>
                <input type="date" id="report-end" className="form-input" style={{ height: 38, width: 160 }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
            </>
          )}
          {activeType === 'trip_costs' && (
            <div className="filter-group">
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Aircraft</label>
              <select id="report-aircraft" className="form-select" style={{ height: 38, width: 180 }} value={aircraftFilter} onChange={e => setAircraftFilter(e.target.value)}>
                <option value="">All Aircraft</option>
                {fleet.map(a => <option key={a.id} value={a.id}>{a.aircraft_id}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Report content */}
      <div className="glass-card" style={{ padding: 24 }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Generating report…</span></div>
        ) : (
          <>
            {activeType === 'trip_costs'            && <TripCostsView />}
            {activeType === 'monthly_usage'         && <MonthlyUsageView />}
            {activeType === 'aircraft_consumption'  && <AircraftView />}
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
