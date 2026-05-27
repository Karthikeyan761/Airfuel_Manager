import React, { useState, useEffect } from 'react';
import { purchases } from '../api/services';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
import { TrendingUp, Activity } from 'lucide-react';

const RANGES = [
  { label: '14d', days: 14 },
  { label: '30d', days: 30 },
  { label: '60d', days: 60 },
  { label: '90d', days: 90 },
];

const PriceTrendsPage = () => {
  const [data, setData] = useState([]);
  const [activeFuel, setActiveFuel] = useState('Jet A1');
  const [range, setRange] = useState(30);
  const [kpis, setKpis] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [loading, setLoading] = useState(true);
  const [predicting, setPredicting] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setPredictions(null);
    try {
      const [trendRes, avgRes, curRes] = await Promise.all([
        purchases.priceTrend({ fuel_type: activeFuel, days: range }),
        purchases.averagePrice(),
        purchases.currentPrice()
      ]);

      const currentPrice = curRes.data[activeFuel]?.price_per_liter || 0;
      const fuelStats = avgRes.data.find(r => r.fuel_type === activeFuel) || {};
      
      setKpis({
        current: currentPrice,
        avg: fuelStats.avg_price_per_liter || 0,
        totalPurchased: fuelStats.total_quantity_liters || 0,
        count: fuelStats.purchase_count || 0
      });

      setData(trendRes.data.map(d => ({
        ...d,
        label: new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      })));
    } catch (err) {
      console.error('Trend fetch error', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeFuel, range]);

  const handlePredict = async () => {
    setPredicting(true);
    try {
      const res = await purchases.predictPrice({ fuel_type: activeFuel, days_ahead: 7 });
      setPredictions(res.data);
    } catch (err) {
      alert("Failed to predict: " + (err.response?.data?.error || err.message));
    } finally {
      setPredicting(false);
    }
  };

  const getChartData = () => {
    const arr = [...data];
    if (predictions?.predictions && arr.length > 0) {
      // Connect predicting line to the last real data point by copying the object
      arr[arr.length - 1] = { 
        ...arr[arr.length - 1], 
        predicted_price: arr[arr.length - 1].price_per_liter 
      };
      predictions.predictions.forEach(p => {
        arr.push({
          label: new Date(p.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          predicted_price: p.predicted_price
        });
      });
    }
    return arr;
  };

  const chartData = getChartData();
  const formatLiters = (val) => val >= 1000 ? (val / 1000).toFixed(1) + 'K L' : val.toLocaleString() + ' L';

  return (
    <div>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <div className="page-header-left">
          <h1 className="text-h1" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, background: 'var(--tertiary-accent)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} style={{ color: 'white' }} />
            </div>
            Price Trends
          </h1>
          <p className="text-muted">Historical fuel price analysis and ML-powered predictions</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 24 }}>
          {/* Fuel Toggle */}
          <div style={{ display: 'flex', background: 'white', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
            {['Jet A1', 'Avgas'].map(f => (
              <button
                key={f}
                onClick={() => setActiveFuel(f)}
                style={{
                  padding: '6px 16px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  background: activeFuel === f ? 'var(--primary-accent)' : 'transparent',
                  color: activeFuel === f ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >{f}</button>
            ))}
          </div>

          {/* Range Toggle */}
          <div style={{ display: 'flex', background: 'white', padding: 4, borderRadius: 10, border: '1px solid var(--border-color)' }}>
            {RANGES.map(r => (
              <button
                key={r.days}
                onClick={() => setRange(r.days)}
                style={{
                  padding: '6px 14px', borderRadius: 7, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem',
                  background: range === r.days ? 'var(--primary-accent)' : 'transparent',
                  color: range === r.days ? 'white' : 'var(--text-muted)',
                  transition: 'all 0.2s ease'
                }}
              >{r.label}</button>
            ))}
          </div>
        </div>

        <button 
          onClick={handlePredict} 
          disabled={predicting || predictions}
          style={{
            background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
            color: 'white', border: 'none', padding: '8px 18px', borderRadius: 'var(--radius-md)',
            fontWeight: 700, cursor: (predicting || predictions) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)', display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem',
            opacity: predictions ? 0.6 : 1
          }}
        >
          {predicting ? <div className="spinner" style={{ width: 14, height: 14, borderWidth: 2 }} /> : '🤖'} 
          Predict 7 days
        </button>
      </div>

      {kpis && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20, marginBottom: 24 }}>
          <div className="glass-card card" style={{ padding: '20px 24px' }}>
            <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>{activeFuel.toUpperCase()} CURRENT PRICE</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--primary-accent)' }}>₹{kpis.current.toFixed(2)}/L</div>
          </div>
          <div className="glass-card card" style={{ padding: '20px 24px' }}>
            <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>AVERAGE PRICE</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary-accent)' }}>₹{kpis.avg.toFixed(2)}/L</div>
          </div>
          <div className="glass-card card" style={{ padding: '20px 24px' }}>
            <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>TOTAL PURCHASED</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--secondary-accent)' }}>{formatLiters(kpis.totalPurchased)}</div>
          </div>
          <div className="glass-card card" style={{ padding: '20px 24px' }}>
            <div className="text-label" style={{ marginBottom: 8, color: 'var(--text-muted)' }}>PURCHASE COUNT</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--warning)' }}>{kpis.count}</div>
          </div>
        </div>
      )}

      <div className="glass-card card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <Activity size={18} style={{ color: 'var(--text-muted)' }} />
          <h3 className="text-h3">{activeFuel} Price Trend — Last {range} Days</h3>
        </div>

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><span>Loading chart data…</span></div>
        ) : (
          <div style={{ height: 420 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="label" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} interval={Math.ceil(chartData.length / 10)} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} domain={['dataMin - 2', 'dataMax + 2']} tickFormatter={v => `₹${v}`} />
                <Tooltip
                  contentStyle={{ borderRadius: 10, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)', fontFamily: 'Plus Jakarta Sans, sans-serif', fontSize: 13 }}
                  formatter={(v, name) => [`₹${v?.toFixed(2) || v}`, name === 'price_per_liter' ? `${activeFuel} Price` : `Predicted Price`]}
                />
                <Legend iconType="circle" iconSize={8} formatter={(val) => <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{val === 'price_per_liter' ? `${activeFuel} Price (₹/L)` : `Predicted ${activeFuel}`}</span>} />
                <Line type="monotone" dataKey="price_per_liter" name="price_per_liter" stroke="#1d4ed8" strokeWidth={2.5} dot={false} activeDot={{ r: 5, strokeWidth: 0 }} />
                {predictions && (
                  <Line type="monotone" dataKey="predicted_price" name="predicted_price" stroke="#f97316" strokeDasharray="5 5" strokeWidth={2.5} dot={{ r: 3, fill: '#f97316' }} activeDot={{ r: 5, strokeWidth: 0 }} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
};

export default PriceTrendsPage;
