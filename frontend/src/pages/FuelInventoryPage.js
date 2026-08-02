import React, { useState, useEffect, useCallback } from 'react';
import { inventory } from '../api/services';
import { Database, RefreshCw, AlertTriangle } from 'lucide-react';

const TX_BADGE = {
  allocation:  { label: 'Allocation',  cls: 'badge-amber' },
  consumption: { label: 'Consumed',    cls: 'badge-red'   },
  refund:      { label: 'Refund',      cls: 'badge-green' },
  purchase:    { label: 'Purchase',    cls: 'badge-blue'  },
};

const CAPACITY = 250000; // assumed max for gauge

const FuelInventoryPage = () => {
  const [levels, setLevels]   = useState([]);
  const [txs, setTxs]         = useState([]);
  const [txTotal, setTxTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [txPage, setTxPage]   = useState(1);
  const perPage = 15;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [invRes, txRes] = await Promise.all([
        inventory.getLevels(),
        inventory.getTransactions({ page: txPage, per_page: perPage })
      ]);
      setLevels(invRes.data);
      const txData = txRes.data;
      setTxs(txData.transactions || txData);
      setTxTotal(txData.total || (txData.transactions || txData).length);
    } catch (err) {
      console.error('Failed to fetch inventory', err);
    } finally {
      setLoading(false);
    }
  }, [txPage]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const txPages = Math.ceil(txTotal / perPage);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-left">
          <h1 className="text-h1">Fuel Inventory</h1>
          <p className="text-muted">Live stock levels and transaction movements</p>
        </div>
        <button className="btn-secondary" onClick={fetchData} id="refresh-inventory">
          <RefreshCw size={16} /> Refresh
        </button>
      </div>

      {/* Stock Gauges */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        {levels.map(inv => {
          const pct  = Math.min(100, (inv.total_quantity_liters / CAPACITY) * 100);
          const low  = inv.total_quantity_liters < 50000;
          const isJet = inv.fuel_type === 'Jet A1';
          const fillColor = isJet
            ? 'linear-gradient(90deg,#1d4ed8,#3b82f6)'
            : 'linear-gradient(90deg,#d97706,#f59e0b)';

          return (
            <div key={inv.fuel_type} className="glass-card card" style={{ padding: '24px 30px', display: 'flex', gap: 20, alignItems: 'center' }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--primary-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Database size={24} style={{ color: 'white' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                   <div className="text-label">{inv.fuel_type} STOCK</div>
                </div>
                <div style={{ fontFamily: 'Outfit,sans-serif', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2, marginBottom: 12 }}>
                  {inv.total_quantity_liters >= 1000 ? (inv.total_quantity_liters / 1000).toFixed(1) + 'K' : inv.total_quantity_liters} L
                </div>
                {low && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--warning)', fontSize: '0.85rem', fontWeight: 600, marginBottom: 8 }}>
                    <AlertTriangle size={14} /> Low Stock Alert
                  </div>
                )}
                <div className="progress-bar" style={{ height: 6, background: 'var(--card-bg-subtle)' }}>
                  <div className="progress-fill" style={{ width: `${pct}%`, background: fillColor }} />
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Updated: {new Date().toISOString().slice(0,10)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Transaction History */}
      <h3 className="text-h3" style={{ marginBottom: 16 }}>Transaction History</h3>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 10 }}>
          <select className="form-select" style={{ width: 140, height: 38, background: 'var(--card-bg)' }}>
            <option>All Types</option>
          </select>
          <select className="form-select" style={{ width: 140, height: 38, background: 'var(--card-bg)' }}>
            <option>All Fuel Types</option>
          </select>
          <button className="btn-secondary" style={{ padding: '6px 14px', height: 38 }}>Clear</button>
        </div>
        <span className="text-muted" style={{ fontSize: '0.85rem' }}>{txTotal} records</span>
      </div>

      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading transactions…</span></div>
        ) : txs.length === 0 ? (
          <div className="empty-state">
            <div style={{ margin: '0 auto', width: 64, height: 64, background: 'var(--primary-accent)', borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 20, opacity: 0.8 }}>
              <RefreshCw size={28} style={{ color: 'white' }} />
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 500, color: 'var(--text-sub)' }}>No transactions found</div>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Type</th>
                    <th>Fuel</th>
                    <th>Flight Ref</th>
                    <th style={{ textAlign: 'right' }}>Quantity (L)</th>
                    <th style={{ textAlign: 'right' }}>₹ / L</th>
                    <th style={{ textAlign: 'right' }}>Value (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.map(tx => {
                    const badge = TX_BADGE[tx.transaction_type] || { label: tx.transaction_type, cls: 'badge-gray' };
                    const isIn = tx.transaction_type === 'refund' || tx.transaction_type === 'purchase';
                    return (
                      <tr key={tx.id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                          {new Date(tx.transaction_date).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td><span className={`badge ${badge.cls}`}>{badge.label}</span></td>
                        <td><span style={{ fontWeight: 600 }}>{tx.fuel_type}</span></td>
                        <td style={{ fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{tx.flight_number || '—'}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600, color: isIn ? 'var(--secondary-accent)' : 'var(--danger)' }}>
                          {isIn ? '+' : '−'}{tx.quantity_liters?.toLocaleString()}
                        </td>
                        <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>₹{parseFloat(tx.price_per_liter || 0).toFixed(2)}</td>
                        <td style={{ textAlign: 'right', fontWeight: 600 }}>₹{parseFloat(tx.total_cost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {txPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderTop: '1px solid var(--border-color)' }}>
                <span className="text-muted" style={{ fontSize: '0.85rem' }}>Page {txPage} of {txPages}</span>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={txPage <= 1} onClick={() => setTxPage(p => p - 1)}>← Prev</button>
                  <button className="btn-secondary" style={{ padding: '6px 14px', fontSize: '0.85rem' }} disabled={txPage >= txPages} onClick={() => setTxPage(p => p + 1)}>Next →</button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default FuelInventoryPage;
