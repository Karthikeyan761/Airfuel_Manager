import React, { useState, useEffect, useCallback } from 'react';
import { purchases, reports } from '../api/services';
import { Plus, X, AlertCircle, CheckCircle, Filter, Search, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const FUEL_TYPES = ['', 'Jet A1', 'Avgas'];

const AddPurchaseModal = ({ onClose, onSuccess, currentPrices }) => {
  const [form, setForm] = useState({
    supplier_name: '', location: '', fuel_type: 'Jet A1',
    quantity_liters: '', price_per_liter: currentPrices?.['Jet A1']?.price_per_liter || '', purchase_date: new Date().toISOString().slice(0, 10),
    invoice_number: '', notes: ''
  });
  const [error,  setError]  = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentPrices && currentPrices[form.fuel_type]?.price_per_liter) {
      setForm(f => ({ ...f, price_per_liter: currentPrices[form.fuel_type].price_per_liter }));
    }
  }, [form.fuel_type, currentPrices]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const total = ((parseFloat(form.quantity_liters) || 0) * (parseFloat(form.price_per_liter) || 0)).toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await purchases.create({
        ...form,
        quantity_liters: parseFloat(form.quantity_liters),
        price_per_liter: parseFloat(form.price_per_liter),
      });
      onSuccess();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to record purchase');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div>
            <h2 className="text-h3">Record Fuel Purchase</h2>
            <p className="text-muted" style={{ marginTop: 4, fontSize: '0.85rem' }}>Log a new procurement event and update inventory</p>
          </div>
          <button className="btn-icon" onClick={onClose} id="close-purchase-modal"><X size={16} /></button>
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
                <label className="form-label">Supplier Name *</label>
                <input id="pur-supplier" className="form-input" placeholder="AirFuel India Ltd" value={form.supplier_name} onChange={e => set('supplier_name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Location *</label>
                <input id="pur-location" className="form-input" placeholder="Mumbai Airport" value={form.location} onChange={e => set('location', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Fuel Type *</label>
                <select id="pur-fuel-type" className="form-select" value={form.fuel_type} onChange={e => set('fuel_type', e.target.value)}>
                  <option>Jet A1</option>
                  <option>Avgas</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Purchase Date *</label>
                <input id="pur-date" type="date" className="form-input" value={form.purchase_date} onChange={e => set('purchase_date', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Quantity (Litres) *</label>
                <input id="pur-qty" type="number" step="0.1" className="form-input" placeholder="50000" value={form.quantity_liters} onChange={e => set('quantity_liters', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Price / Litre (₹) *</label>
                <input id="pur-price" type="number" step="0.01" className="form-input" placeholder="95.50" value={form.price_per_liter} onChange={e => set('price_per_liter', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">Invoice Number</label>
                <input id="pur-invoice" className="form-input" placeholder="INV-2024-001" value={form.invoice_number} onChange={e => set('invoice_number', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Total Cost</label>
                <input className="form-input" value={`₹ ${parseFloat(total).toLocaleString(undefined, { minimumFractionDigits: 2 })}`} readOnly style={{ background: 'var(--card-bg-subtle)', fontWeight: 600, color: 'var(--primary-accent)' }} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input id="pur-notes" className="form-input" placeholder="Optional notes" value={form.notes} onChange={e => set('notes', e.target.value)} />
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
              <button id="save-purchase" type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Saving…' : <><CheckCircle size={16} /> Record Purchase</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const FuelPurchasesPage = () => {
  const [list, setList]         = useState([]);
  const [total, setTotal]       = useState(0);
  const [currentPrices, setCurrentPrices] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [fuelFilter, setFuelFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate]     = useState('');
  const [page, setPage]           = useState(1);
  const perPage = 15;
  const { user } = useAuth();

  const fetchPurchases = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (fuelFilter) params.fuel_type = fuelFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const [res, priceRes] = await Promise.all([
        purchases.list(params),
        purchases.currentPrice()
      ]);
      const data = res.data;
      setList(data.purchases || data);
      setTotal(data.total || (data.purchases || data).length);
      setCurrentPrices(priceRes.data);
    } catch (err) {
      console.error('Failed to load purchases', err);
    } finally {
      setLoading(false);
    }
  }, [page, fuelFilter, startDate, endDate]);

  useEffect(() => { fetchPurchases(); }, [fetchPurchases]);

  const handleAdded = () => { setShowModal(false); fetchPurchases(); };

  const handleExportPDF = async () => {
    try {
      const res = await reports.exportPdf({
        report_type: 'fuel_purchases',
        start_date: startDate || undefined,
        end_date: endDate || undefined
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fuel_purchases_${startDate || 'all'}_to_${endDate || 'now'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to generate PDF report');
    }
  };

  const totalPages = Math.ceil(total / perPage);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1">Fuel Purchases</h1>
          <p className="text-muted">Record and track all fuel procurement</p>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={handleExportPDF} title="Download procurement report">
             <FileText size={16} /> Export PDF
          </button>
          {user?.role === 'admin' && (
            <button id="new-purchase-btn" className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Purchase
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
           <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>AVGAS CURRENT PRICE</div>
           <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)', marginBottom: 8 }}>
             ₹{currentPrices?.['Avgas']?.price_per_liter?.toFixed(2) || '---'}/L
           </div>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
             {currentPrices?.['Avgas']?.last_purchase_date || 'N/A'} · {currentPrices?.['Avgas']?.supplier || 'Unknown Supplier'}
           </div>
        </div>
        <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column' }}>
           <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>JET A1 CURRENT PRICE</div>
           <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)', marginBottom: 8 }}>
             ₹{currentPrices?.['Jet A1']?.price_per_liter?.toFixed(2) || '---'}/L
           </div>
           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
             {currentPrices?.['Jet A1']?.last_purchase_date || 'N/A'} · {currentPrices?.['Jet A1']?.supplier || 'Unknown Supplier'}
           </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select
              id="purchase-filter-fuel"
              className="form-select"
              style={{ width: 140, height: 40, background: 'var(--card-bg)' }}
              value={fuelFilter}
              onChange={e => { setFuelFilter(e.target.value); setPage(1); }}
            >
              <option value="">All Fuel Types</option>
              <option>Jet A1</option>
              <option>Avgas</option>
            </select>
            <input 
              type="date" 
              className="form-input" 
              style={{ width: 140, height: 40 }} 
              value={startDate}
              onChange={e => { setStartDate(e.target.value); setPage(1); }}
              placeholder="Start Date"
            />
            <input 
              type="date" 
              className="form-input" 
              style={{ width: 140, height: 40 }} 
              value={endDate}
              onChange={e => { setEndDate(e.target.value); setPage(1); }}
              placeholder="End Date"
            />
            <button 
              className="btn-secondary" 
              style={{ height: 40 }}
              onClick={() => { setFuelFilter(''); setStartDate(''); setEndDate(''); setPage(1); }}
            >
              Clear
            </button>
          </div>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{total} records</span>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading purchases…</span></div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice</th>
                    <th>Date</th>
                    <th>Supplier</th>
                    <th>Location</th>
                    <th>Type</th>
                    <th style={{ textAlign: 'right' }}>Qty (L)</th>
                    <th style={{ textAlign: 'right' }}>₹ / L</th>
                    <th style={{ textAlign: 'right' }}>Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(p => (
                    <tr key={p.id}>
                      <td>
                        <span style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)', background: 'var(--card-bg-subtle)', padding: '2px 8px', borderRadius: 4 }}>
                          {p.invoice_number || `P-${String(p.id).padStart(4,'0')}`}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)' }}>{p.purchase_date}</td>
                      <td style={{ fontWeight: 600 }}>{p.supplier_name}</td>
                      <td>{p.location}</td>
                      <td>
                        <span className={`badge ${p.fuel_type === 'Jet A1' ? 'badge-blue' : 'badge-amber'}`}>
                          {p.fuel_type}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 500 }}>{p.quantity_liters?.toLocaleString()}</td>
                      <td style={{ textAlign: 'right', color: 'var(--primary-accent)', fontWeight: 600 }}>
                        ₹{parseFloat(p.price_per_liter)?.toFixed(2)}
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700 }}>
                        ₹{parseFloat(p.total_cost)?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                  {list.length === 0 && (
                    <tr><td colSpan="8" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No purchases found</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages} · {total} total records</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {showModal && <AddPurchaseModal onClose={() => setShowModal(false)} onSuccess={handleAdded} currentPrices={currentPrices} />}
    </div>
  );
};

export default FuelPurchasesPage;
