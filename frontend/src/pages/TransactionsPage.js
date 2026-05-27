import React, { useState, useEffect, useCallback } from 'react';
import { inventory } from '../api/services';
import { ArrowLeftRight, Filter } from 'lucide-react';

const TX_BADGE = {
  allocation:  { label: 'Allocation',  cls: 'badge-amber' },
  consumption: { label: 'Consumed',    cls: 'badge-red'   },
  refund:      { label: 'Refund',      cls: 'badge-green' },
  purchase:    { label: 'Purchase',    cls: 'badge-blue'  },
};

const TransactionsPage = () => {
  const [txs, setTxs]       = useState([]);
  const [total, setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter]   = useState('');
  const [fuelFilter, setFuelFilter]   = useState('');
  const [page, setPage] = useState(1);
  const perPage = 20;

  const fetchTxs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, per_page: perPage };
      if (typeFilter) params.transaction_type = typeFilter;
      if (fuelFilter) params.fuel_type = fuelFilter;
      const res = await inventory.getTransactions(params);
      const data = res.data;
      setTxs(data.transactions || data);
      setTotal(data.total || (data.transactions || data).length);
    } catch (err) {
      console.error('Failed to load transactions', err);
    } finally {
      setLoading(false);
    }
  }, [page, typeFilter, fuelFilter]);

  useEffect(() => { fetchTxs(); }, [fetchTxs]);

  const totalPages = Math.ceil(total / perPage);

  const summary = {
    totalIn:  txs.filter(t => ['refund','purchase'].includes(t.transaction_type)).reduce((s, t) => s + (t.quantity_liters || 0), 0),
    totalOut: txs.filter(t => ['allocation','consumption'].includes(t.transaction_type)).reduce((s, t) => s + (t.quantity_liters || 0), 0),
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--primary-accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ArrowLeftRight size={18} style={{ color: 'white' }} />
            </div>
            Fuel Transactions
          </h1>
          <p className="text-muted">Complete audit trail of all fuel movements</p>
        </div>
      </div>

      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 24 }}>
        {[
          { label: 'RECORDS SHOWN',  val: total,                    color: 'var(--primary-accent)',   bg: 'var(--card-bg)' },
          { label: 'TOTAL LITERS',   val: `${summary.totalIn.toLocaleString()} L`, color: 'var(--secondary-accent)', bg: 'var(--card-bg)' },
          { label: 'TOTAL VALUE',    val: `₹${(summary.totalOut * 95).toLocaleString()}`, color: 'var(--success)',          bg: 'var(--card-bg)' }, // Mock calc
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span className="text-label" style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.label}</span>
            <span style={{ fontFamily: 'Outfit,sans-serif', fontWeight: 800, fontSize: '2rem', color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select id="tx-filter-type" className="form-select" style={{ width: 140, height: 40 }} value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="">All Types</option>
              <option value="allocation">Allocation</option>
              <option value="consumption">Consumption</option>
              <option value="refund">Refund</option>
              <option value="purchase">Purchase</option>
            </select>
            <select id="tx-filter-fuel" className="form-select" style={{ width: 140, height: 40 }} value={fuelFilter} onChange={e => { setFuelFilter(e.target.value); setPage(1); }}>
              <option value="">All Fuel Types</option>
              <option>Jet A1</option>
              <option>Avgas</option>
            </select>
            <input type="date" className="form-input" style={{ width: 140, height: 40 }} />
            <input type="date" className="form-input" style={{ width: 140, height: 40 }} />
            <button className="btn-secondary" style={{ height: 40 }}>Clear</button>
        </div>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{total} total</span>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading…</span></div>
        ) : txs.length === 0 ? (
          <div className="empty-state">
            <div style={{ margin: '0 auto', width: 64, height: 64, background: 'var(--primary-accent)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, opacity: 0.8 }}>
              <ArrowLeftRight size={28} style={{ color: 'white' }} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-sub)' }}>No transactions found</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Fuel</th>
                    <th>Flight Ref</th>
                    <th style={{ textAlign: 'right' }}>Qty (L)</th>
                    <th style={{ textAlign: 'right' }}>₹ / L</th>
                    <th style={{ textAlign: 'right' }}>Total (₹)</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => {
                    const badge = TX_BADGE[tx.transaction_type] || { label: tx.transaction_type, cls: 'badge-gray' };
                    const isIn  = ['refund', 'purchase'].includes(tx.transaction_type);
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.8rem', color: 'var(--text-faint)' }}>#{tx.id}</td>
                        <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                          {new Date(tx.transaction_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td style={{ fontWeight: 600 }}>{tx.fuel_type}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.flight_number || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 700, color: isIn ? 'var(--secondary-accent)' : 'var(--danger)' }}>
                          {isIn ? '+' : '−'}{tx.quantity_liters?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>₹{parseFloat(tx.price_per_liter || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(tx.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                        <td style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.notes || '—'}</td>
                      </tr>
                    );
                  })}
                  {txs.length === 0 && (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>No transactions match your filters.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {page} of {totalPages} · {total} total</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={page <= 1} onClick={() => setPage(p => p - 1)}>← Prev</button>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default TransactionsPage;
