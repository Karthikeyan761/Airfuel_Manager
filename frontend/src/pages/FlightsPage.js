import React, { useState, useEffect, useCallback } from 'react';
import { flights, aircraft as aircraftApi } from '../api/services';
import { Plus, X, AlertCircle, CheckCircle, Navigation2, MapPin, Filter } from 'lucide-react';

const STATUS_BADGE = {
  scheduled:  { cls: 'badge-amber', label: 'Scheduled'  },
  completed:  { cls: 'badge-green', label: 'Completed'  },
  cancelled:  { cls: 'badge-red',   label: 'Cancelled'  },
  in_flight:  { cls: 'badge-blue',  label: 'In Flight'  },
};

/* ── Schedule Modal ─────────────────────────────── */
const ScheduleModal = ({ fleet, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    flight_number:'', aircraft_id_fk:'', source:'', destination:'',
    distance_km:'', flight_date: new Date().toISOString().slice(0,10), notes:''
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k,v) => setForm(f => ({ ...f, [k]: v }));

  const selectedAc = fleet.find(a => a.id === parseInt(form.aircraft_id_fk));
  const reqFuel = selectedAc && form.distance_km
    ? (parseFloat(form.distance_km) * selectedAc.fuel_consumption_rate).toFixed(1)
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await flights.create({
        ...form,
        aircraft_id_fk: parseInt(form.aircraft_id_fk),
        distance_km: parseFloat(form.distance_km),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to schedule flight');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 className="text-h3">Schedule Flight</h2>
            <p className="text-muted" style={{ marginTop:4, fontSize:'0.85rem' }}>Create a new trip — fuel will be auto-allocated from inventory</p>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-schedule-modal"><X size={16}/></button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-error" style={{ marginBottom:16 }}><AlertCircle size={15}/><span style={{fontSize:'0.85rem'}}>{error}</span></div>}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Flight Number *</label>
                <input id="fl-number" className="form-input" placeholder="AF-2024-001" value={form.flight_number} onChange={e=>set('flight_number',e.target.value)} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Flight Date *</label>
                <input id="fl-date" type="date" className="form-input" value={form.flight_date} onChange={e=>set('flight_date',e.target.value)} required/>
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Aircraft *</label>
                <select id="fl-aircraft" className="form-select" value={form.aircraft_id_fk} onChange={e=>set('aircraft_id_fk',e.target.value)} required>
                  <option value="">— Select aircraft —</option>
                  {fleet.map(a => <option key={a.id} value={a.id}>{a.aircraft_id} · {a.manufacturer} {a.model} ({a.fuel_type})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Source *</label>
                <input id="fl-source" className="form-input" placeholder="Mumbai (BOM)" value={form.source} onChange={e=>set('source',e.target.value)} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Destination *</label>
                <input id="fl-dest" className="form-input" placeholder="Delhi (DEL)" value={form.destination} onChange={e=>set('destination',e.target.value)} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Distance (km) *</label>
                <input id="fl-dist" type="number" step="0.1" className="form-input" placeholder="1400" value={form.distance_km} onChange={e=>set('distance_km',e.target.value)} required/>
              </div>
              <div className="form-group">
                <label className="form-label">Required Fuel (auto)</label>
                <input className="form-input" value={reqFuel ? `${reqFuel} L` : 'Select aircraft & distance'} readOnly style={{ background:'var(--card-bg-subtle)', fontWeight:600, color:'var(--primary-accent)' }}/>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input id="fl-notes" className="form-input" placeholder="Optional notes" value={form.notes} onChange={e=>set('notes',e.target.value)}/>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button id="save-flight" type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Scheduling…' : <><Navigation2 size={16}/> Schedule Flight</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ── Complete Modal ─────────────────────────────── */
const CompleteModal = ({ flight, onClose, onSuccess }) => {
  const [actualFuel, setActualFuel] = useState('');
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await flights.complete(flight.id, { actual_fuel_used_liters: parseFloat(actualFuel) });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to complete flight');
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal-box" style={{ maxWidth: 440 }}>
        <div className="modal-header">
          <div>
            <h2 className="text-h3">Complete Flight</h2>
            <p className="text-muted" style={{ marginTop:4, fontSize:'0.85rem' }}>{flight.flight_number} · {flight.source} → {flight.destination}</p>
          </div>
          <button className="btn-icon" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <div style={{ padding:'14px 16px', background:'var(--primary-light)', borderRadius:'var(--radius-md)', marginBottom:20, border:'1px solid var(--primary-mid)' }}>
            <span className="text-label">ALLOCATED FUEL</span>
            <div style={{ fontWeight:700, fontSize:'1.4rem', color:'var(--primary-accent)', marginTop:4 }}>{flight.required_fuel_liters?.toLocaleString()} L</div>
          </div>
          {error && <div className="alert alert-error" style={{marginBottom:16}}><AlertCircle size={15}/><span style={{fontSize:'0.85rem'}}>{error}</span></div>}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Actual Fuel Used (L) *</label>
              <input id="complete-fuel" type="number" step="0.1" className="form-input" placeholder={flight.required_fuel_liters} value={actualFuel} onChange={e=>setActualFuel(e.target.value)} required autoFocus/>
              {actualFuel && (
                <div style={{ marginTop:6, fontSize:'0.82rem', color: parseFloat(actualFuel) <= flight.required_fuel_liters ? 'var(--secondary-accent)' : 'var(--danger)' }}>
                  {parseFloat(actualFuel) < flight.required_fuel_liters
                    ? `✓ Saved ${(flight.required_fuel_liters - parseFloat(actualFuel)).toFixed(1)} L — will be refunded to inventory`
                    : `⚠ ${(parseFloat(actualFuel) - flight.required_fuel_liters).toFixed(1)} L over allocation`}
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button id="confirm-complete" type="submit" className="btn-success" disabled={saving}>
                {saving ? 'Completing…' : <><CheckCircle size={16}/> Mark Completed</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ─────────────────────────────────── */
const FlightsPage = () => {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [fleet, setFleet]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showSchedule, setShowSchedule] = useState(false);
  const [completeTarget, setCompleteTarget] = useState(null);
  const [statusFilter, setStatusFilter]     = useState('');
  const [page, setPage]   = useState(1);
  const perPage = 15;

  const fetchFlights = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (statusFilter) params.status = statusFilter;
      const [flRes, acRes] = await Promise.all([flights.list(params), aircraftApi.list()]);
      const data = flRes.data;
      setList(data.flights || data);
      setTotal(data.total || (data.flights || data).length);
      setFleet(acRes.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => { fetchFlights(); }, [fetchFlights]);

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this flight and return fuel to inventory?')) return;
    try { await flights.cancel(id); fetchFlights(); } catch (err) { alert(err.response?.data?.error || 'Cancel failed'); }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1">Flights &amp; Trips</h1>
          <p className="text-muted">Trip management with automatic fuel allocation — {total} total</p>
        </div>
        <div className="page-actions">
          <div style={{ position:'relative' }}>
            <Filter size={14} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'var(--text-faint)' }}/>
            <select id="flight-filter-status" className="form-select" style={{ paddingLeft:30, width:150, height:40 }} value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1); }}>
              <option value="">All Status</option>
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <button id="schedule-flight-btn" className="btn-primary" onClick={() => setShowSchedule(true)}>
            <Plus size={16}/> Schedule Trip
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding:0, overflow:'hidden' }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner"/><span>Loading flights…</span></div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Flight #</th>
                    <th>Date</th>
                    <th>Aircraft</th>
                    <th>Route</th>
                    <th style={{textAlign:'right'}}>Dist (km)</th>
                    <th style={{textAlign:'right'}}>Req. Fuel</th>
                    <th style={{textAlign:'right'}}>Actual</th>
                    <th style={{textAlign:'right'}}>Trip Cost</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(f => {
                    const badge = STATUS_BADGE[f.status] || { cls:'badge-gray', label: f.status };
                    return (
                      <tr key={f.id}>
                        <td style={{ fontWeight:700, fontFamily:'Outfit,sans-serif' }}>{f.flight_number}</td>
                        <td style={{ color:'var(--text-muted)', fontSize:'0.85rem' }}>{f.flight_date}</td>
                        <td>
                          <span style={{ fontWeight:600, color:'var(--primary-accent)' }}>{f.aircraft?.aircraft_id || '—'}</span>
                        </td>
                        <td>
                          <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                            <MapPin size={12} style={{ color:'var(--text-faint)', flexShrink:0 }}/>
                            <span style={{ fontSize:'0.88rem' }}>{f.source} → {f.destination}</span>
                          </div>
                        </td>
                        <td style={{ textAlign:'right' }}>{f.distance_km?.toLocaleString()}</td>
                        <td style={{ textAlign:'right', color:'var(--primary-accent)', fontWeight:600 }}>{f.required_fuel_liters?.toLocaleString()} L</td>
                        <td style={{ textAlign:'right', color: f.actual_fuel_used_liters ? 'var(--text-main)' : 'var(--text-faint)' }}>
                          {f.actual_fuel_used_liters ? `${f.actual_fuel_used_liters?.toLocaleString()} L` : '—'}
                        </td>
                        <td style={{ textAlign:'right', fontWeight:700 }}>
                          {f.trip_fuel_cost ? `₹${parseFloat(f.trip_fuel_cost).toLocaleString(undefined,{minimumFractionDigits:2})}` : '—'}
                        </td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td>
                          <div style={{ display:'flex', gap:6 }}>
                            {f.status === 'scheduled' && (
                              <>
                                <button className="btn-success" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => setCompleteTarget(f)} id={`complete-${f.id}`}>
                                  ✓ Done
                                </button>
                                <button className="btn-danger" style={{ padding:'5px 10px', fontSize:'0.78rem' }} onClick={() => handleCancel(f.id)} id={`cancel-${f.id}`}>
                                  ✕ Cancel
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr><td colSpan="10" style={{ textAlign:'center', padding:'48px', color:'var(--text-muted)' }}>No flights found. Schedule your first trip!</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'14px 20px', borderTop:'1px solid var(--border-color)' }}>
                <span className="text-muted" style={{ fontSize:'0.85rem' }}>Page {page} of {totalPages} · {total} total flights</span>
                <div style={{ display:'flex', gap:8 }}>
                  <button className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.85rem' }} disabled={page<=1} onClick={()=>setPage(p=>p-1)}>← Prev</button>
                  <button className="btn-secondary" style={{ padding:'6px 14px', fontSize:'0.85rem' }} disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showSchedule && <ScheduleModal fleet={fleet} onClose={()=>setShowSchedule(false)} onSuccess={()=>{ setShowSchedule(false); fetchFlights(); }}/>}
      {completeTarget && <CompleteModal flight={completeTarget} onClose={()=>setCompleteTarget(null)} onSuccess={()=>{ setCompleteTarget(null); fetchFlights(); }}/>}
    </div>
  );
};

export default FlightsPage;
