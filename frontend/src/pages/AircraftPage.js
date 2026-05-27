import React, { useState, useEffect, useCallback } from 'react';
import { aircraft as aircraftApi } from '../api/services';
import { PlaneTakeoff, Fuel, Plus, X, AlertCircle, CheckCircle, Gauge, Route } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FUEL_TYPES = ['Jet A1', 'Avgas'];

const AircraftModal = ({ aircraft, onClose, onSuccess }) => {
  const isEdit = !!aircraft;
  const [form, setForm] = useState({
    aircraft_id: aircraft?.aircraft_id || '',
    manufacturer: aircraft?.manufacturer || '',
    model: aircraft?.model || '',
    year: aircraft?.year || '',
    fuel_type: aircraft?.fuel_type || 'Jet A1',
    fuel_tank_capacity_liters: aircraft?.fuel_tank_capacity_liters || '',
    fuel_consumption_rate: aircraft?.fuel_consumption_rate || '',
    max_range_km: aircraft?.max_range_km || '',
    is_active: aircraft?.is_active ?? true
  });
  const [error, setError]   = useState('');
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        ...form,
        year: parseInt(form.year),
        fuel_tank_capacity_liters: parseFloat(form.fuel_tank_capacity_liters),
        fuel_consumption_rate: parseFloat(form.fuel_consumption_rate),
        max_range_km: parseFloat(form.max_range_km),
      };

      if (isEdit) {
        await aircraftApi.update(aircraft.id, payload);
      } else {
        await aircraftApi.create(payload);
      }
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${isEdit ? 'update' : 'register'} aircraft`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">
        <div className="modal-header">
          <div>
            <h2 className="text-h3">{isEdit ? 'Edit Aircraft' : 'Register Aircraft'}</h2>
            <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>
              {isEdit ? `Updating ${aircraft.aircraft_id}` : 'Add a new aircraft to the fleet registry'}
            </p>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-aircraft-modal"><X size={16} /></button>
        </div>
        <div className="modal-body">
          {error && (
            <div className="alert alert-error" style={{ marginBottom: 16 }}>
              <AlertCircle size={15} /><span style={{ fontSize: '0.85rem' }}>{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Aircraft ID *</label>
                <input id="ac-aircraft-id" className="form-input" placeholder="e.g. VT-ANF" value={form.aircraft_id} onChange={e => set('aircraft_id', e.target.value)} required disabled={isEdit} />
              </div>
              <div className="form-group">
                <label className="form-label">Year *</label>
                <input id="ac-year" type="number" className="form-input" placeholder="2020" value={form.year} onChange={e => set('year', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Manufacturer *</label>
                <input id="ac-manufacturer" className="form-input" placeholder="Boeing" value={form.manufacturer} onChange={e => set('manufacturer', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Model *</label>
                <input id="ac-model" className="form-input" placeholder="737-800" value={form.model} onChange={e => set('model', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Type *</label>
                <select id="ac-fuel-type" className="form-select" value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                  {FUEL_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Tank Capacity (L) *</label>
                <input id="ac-tank" type="number" step="0.1" className="form-input" placeholder="26000" value={form.fuel_tank_capacity_liters} onChange={e => set('fuel_tank_capacity_liters', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Consumption Rate (L/km) *</label>
                <input id="ac-rate" type="number" step="0.01" className="form-input" placeholder="5.5" value={form.fuel_consumption_rate} onChange={e => set('fuel_consumption_rate', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Max Range (km) *</label>
                <input id="ac-range" type="number" className="form-input" placeholder="5700" value={form.max_range_km} onChange={e => set('max_range_km', e.target.value)} required />
              </div>
              {isEdit && (
                <div className="form-group" style={{ gridColumn: 'span 2' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                    <input type="checkbox" checked={form.is_active} onChange={e => set('is_active', e.target.checked)} />
                    Already Active / In Service
                  </label>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button id="save-aircraft" type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : <><CheckCircle size={16} /> {isEdit ? 'Update Changes' : 'Register Aircraft'}</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const AircraftPage = () => {
  const [fleet, setFleet]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingAircraft, setEditingAircraft] = useState(null);
  const { user }                  = useAuth();

  const fetchFleet = useCallback(async () => {
    try {
      const res = await aircraftApi.list();
      setFleet(res.data);
    } catch (err) {
      console.error('Failed to fetch aircraft', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchFleet(); }, [fetchFleet]);

  const handleSuccess = () => {
    setShowModal(false);
    setEditingAircraft(null);
    fetchFleet();
  };

  const handleEdit = (ac) => {
    setEditingAircraft(ac);
    setShowModal(true);
  };

  const handleAdd = () => {
    setEditingAircraft(null);
    setShowModal(true);
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading fleet…</span></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--primary-accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PlaneTakeoff size={18} style={{ color: 'white' }} />
            </div>
            Aircraft
          </h1>
          <p className="text-muted">Manage your fleet registry and fuel specifications</p>
        </div>
        {user?.role === 'admin' && (
          <button id="add-aircraft-btn" className="btn-primary" onClick={handleAdd}>
            <Plus size={16} /> Add Aircraft
          </button>
        )}
      </div>

      {fleet.length === 0 ? (
        <div className="glass-card">
          <div className="empty-state">
            <div className="empty-state-icon">✈️</div>
            <h3 className="text-h3">No aircraft registered</h3>
            <p className="text-muted" style={{ marginTop: 8 }}>Add your first aircraft to get started.</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 20 }}>
          {fleet.map(ac => {
            const pct = Math.min(100, (ac.fuel_tank_capacity_liters / 30000) * 100);
            return (
              <div key={ac.id} className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', opacity: ac.is_active ? 1 : 0.7 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary-accent)', fontFamily: 'Outfit,sans-serif' }}>
                      {ac.aircraft_id}
                    </h3>
                    <div style={{ fontWeight: 600, marginTop: 4, color: 'var(--text-main)' }}>{ac.manufacturer} {ac.model}</div>
                    <div className="text-muted" style={{ fontSize: '0.85rem', marginTop: 2 }}>{ac.manufacturer} · {ac.year}</div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
                    <span className={`badge ${ac.is_active ? 'badge-green' : 'badge-gray'}`} style={{ width: 'fit-content' }}>
                      {ac.is_active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                    <span className={`badge ${ac.fuel_type === 'Jet A1' ? 'badge-blue' : 'badge-amber'}`} style={{ width: 'fit-content' }}>{ac.fuel_type}</span>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'var(--card-bg-subtle)', padding: '12px 16px', borderRadius: 10 }}>
                    <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <Fuel size={12} style={{ color: 'var(--danger)' }} /> Tank Capacity
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 4 }}>{ac.fuel_tank_capacity_liters?.toLocaleString()} L</div>
                  </div>
                  <div style={{ background: 'var(--card-bg-subtle)', padding: '12px 16px', borderRadius: 10 }}>
                    <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <Gauge size={12} style={{ color: 'var(--text-faint)' }} /> Consumption
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 4 }}>{ac.fuel_consumption_rate} L/km</div>
                  </div>
                  <div style={{ background: 'var(--card-bg-subtle)', padding: '12px 16px', borderRadius: 10 }}>
                    <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <Route size={12} style={{ color: 'var(--info)' }} /> Max Range
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 4 }}>{ac.max_range_km?.toLocaleString()} km</div>
                  </div>
                  <div style={{ background: 'var(--card-bg-subtle)', padding: '12px 16px', borderRadius: 10 }}>
                    <div className="text-muted" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>
                      <PlaneTakeoff size={12} style={{ color: 'var(--text-faint)' }} /> Type
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '1.1rem', marginTop: 4 }}>{ac.fuel_type}</div>
                  </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                    <span>Tank Capacity</span>
                    <span>{ac.fuel_tank_capacity_liters?.toLocaleString()} L</span>
                  </div>
                  <div className="progress-bar" style={{ height: 6, background: 'var(--border-color)' }}>
                    <div className="progress-fill" style={{
                      width: `${pct}%`,
                      background: ac.fuel_type === 'Jet A1' ? 'var(--primary-accent)' : 'var(--warning)'
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 'auto' }}>
                  <button className="btn-secondary" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }} onClick={() => alert(`Stats for ${ac.aircraft_id} coming soon`)}>📊 Stats</button>
                  <button className="btn-secondary" style={{ flex: 1, padding: '8px 0', fontSize: '0.85rem' }} onClick={() => handleEdit(ac)}>✏️ Edit</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <AircraftModal
          aircraft={editingAircraft}
          onClose={() => { setShowModal(false); setEditingAircraft(null); }}
          onSuccess={handleSuccess}
        />
      )}
    </div>
  );
};

export default AircraftPage;
