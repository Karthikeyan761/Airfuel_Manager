import client from './client';

export const DEMO_MODE = true; // Set to false to connect to the real Flask backend

// Helper resolve/reject mechanisms for Demo Mode
const mockResolve = (data) => Promise.resolve({ data });
const mockReject = (error, status = 400) => Promise.reject({
  response: {
    status,
    data: { error }
  }
});

// Dynamic in-memory database mock states
let mockUsers = [
  { id: 1, username: 'admin', role: 'admin' },
  { id: 2, username: 'operator', role: 'operator' }
];

let mockAircraft = [
  { id: 1, aircraft_id: 'VT-ANX', manufacturer: 'Boeing', model: '787-8', year: 2018, fuel_type: 'Jet A1', fuel_tank_capacity_liters: 126000, fuel_consumption_rate: 5.4, max_range_km: 13620, is_active: true },
  { id: 2, aircraft_id: 'VT-EDC', manufacturer: 'Airbus', model: 'A320neo', year: 2020, fuel_type: 'Jet A1', fuel_tank_capacity_liters: 26730, fuel_consumption_rate: 2.7, max_range_km: 6300, is_active: true },
  { id: 3, aircraft_id: 'VT-TES', manufacturer: 'Cessna', model: '172 Skyhawk', year: 2015, fuel_type: 'Avgas', fuel_tank_capacity_liters: 212, fuel_consumption_rate: 0.35, max_range_km: 1220, is_active: true }
];

let mockPurchases = [
  { id: 1, invoice_number: 'INV-2026-001', purchase_date: '2026-07-28', supplier_name: 'Reliance Aviation', location: 'BOM / VABB', fuel_type: 'Jet A1', quantity_liters: 45000, price_per_liter: 95.80, total_cost: 4311000 },
  { id: 2, invoice_number: 'INV-2026-002', purchase_date: '2026-07-29', supplier_name: 'Indian Oil Aviation', location: 'DEL / VIDP', fuel_type: 'Jet A1', quantity_liters: 60000, price_per_liter: 96.20, total_cost: 5772000 },
  { id: 3, invoice_number: 'INV-2026-003', purchase_date: '2026-07-30', supplier_name: 'Bharat Petroleum', location: 'MAA / VOMM', fuel_type: 'Avgas', quantity_liters: 12000, price_per_liter: 110.50, total_cost: 1326000 }
];

let mockFlights = [
  { id: 1, flight_number: 'AI-101', flight_date: '2026-08-01', aircraft: { id: 1, aircraft_id: 'VT-ANX' }, source: 'BOM', destination: 'DEL', distance_km: 1140, required_fuel_liters: 6156, actual_fuel_used_liters: 6100, trip_fuel_cost: 584380, status: 'completed' },
  { id: 2, flight_number: '6E-203', flight_date: '2026-08-02', aircraft: { id: 2, aircraft_id: 'VT-EDC' }, source: 'DEL', destination: 'BLR', distance_km: 1740, required_fuel_liters: 4698, actual_fuel_used_liters: null, trip_fuel_cost: null, status: 'scheduled' },
  { id: 3, flight_number: 'SG-501', flight_date: '2026-08-02', aircraft: { id: 3, aircraft_id: 'VT-TES' }, source: 'BOM', destination: 'PNQ', distance_km: 120, required_fuel_liters: 42, actual_fuel_used_liters: null, trip_fuel_cost: null, status: 'scheduled' }
];

let mockInventoryLevels = [
  { fuel_type: 'Jet A1', total_quantity_liters: 185000 },
  { fuel_type: 'Avgas', total_quantity_liters: 42000 }
];

let mockTransactions = [
  { id: 1, transaction_date: '2026-07-28T10:30:00Z', transaction_type: 'purchase', fuel_type: 'Jet A1', flight_number: null, quantity_liters: 45000, price_per_liter: 95.80, total_cost: 4311000, notes: 'Initial batch purchase' },
  { id: 2, transaction_date: '2026-07-29T14:15:00Z', transaction_type: 'purchase', fuel_type: 'Jet A1', flight_number: null, quantity_liters: 60000, price_per_liter: 96.20, total_cost: 5772000, notes: 'Refill batch BOM' },
  { id: 3, transaction_date: '2026-07-30T11:00:00Z', transaction_type: 'purchase', fuel_type: 'Avgas', flight_number: null, quantity_liters: 12000, price_per_liter: 110.50, total_cost: 1326000, notes: 'Avgas procurement' },
  { id: 4, transaction_date: '2026-08-01T08:00:00Z', transaction_type: 'consumption', fuel_type: 'Jet A1', flight_number: 'AI-101', quantity_liters: 6100, price_per_liter: 95.80, total_cost: 584380, notes: 'Flight consumption BOM->DEL' }
];

export const auth = {
  login: (username, password) => {
    if (DEMO_MODE) {
      if (username === 'admin' && password === 'admin123') {
        const user = { id: 1, username: 'admin', role: 'admin' };
        return mockResolve({ access_token: 'mock-admin-token', user });
      }
      if (username === 'operator' && password === 'operator123') {
        const user = { id: 2, username: 'operator', role: 'operator' };
        return mockResolve({ access_token: 'mock-operator-token', user });
      }
      return mockReject('Invalid credentials (admin/admin123 or operator/operator123)', 401);
    }
    return client.post('/auth/login', { username, password });
  },
  profile: () => {
    if (DEMO_MODE) {
      const token = localStorage.getItem('token');
      if (token === 'mock-admin-token') {
        return mockResolve({ id: 1, username: 'admin', role: 'admin' });
      }
      if (token === 'mock-operator-token') {
        return mockResolve({ id: 2, username: 'operator', role: 'operator' });
      }
      return mockReject('Unauthorized', 401);
    }
    return client.get('/auth/me');
  },
  listUsers: () => {
    if (DEMO_MODE) {
      return mockResolve(mockUsers);
    }
    return client.get('/auth/users');
  },
  createUser: (data) => {
    if (DEMO_MODE) {
      const newUser = { id: mockUsers.length + 1, username: data.username, role: data.role };
      mockUsers.push(newUser);
      return mockResolve({ success: true, message: 'User created successfully', user: newUser });
    }
    return client.post('/auth/users', data);
  }
};

export const dashboard = {
  getKPIs: () => {
    if (DEMO_MODE) {
      const activeAcCount = mockAircraft.filter(a => a.is_active).length;
      const scheduledCount = mockFlights.filter(f => f.status === 'scheduled').length;
      const completedFlights = mockFlights.filter(f => f.status === 'completed');
      const totalFuelUsed = completedFlights.reduce((s, f) => s + (f.actual_fuel_used_liters || 0), 0);
      const totalFuelCost = completedFlights.reduce((s, f) => s + (f.trip_fuel_cost || 0), 0);
      
      const jetLevel = mockInventoryLevels.find(l => l.fuel_type === 'Jet A1')?.total_quantity_liters || 0;
      const avgasLevel = mockInventoryLevels.find(l => l.fuel_type === 'Avgas')?.total_quantity_liters || 0;
      
      const alerts = [];
      if (jetLevel < 50000) {
        alerts.push({ message: 'Jet A1 stock level is below safety threshold (50,000 L).' });
      }
      if (avgasLevel < 20000) {
        alerts.push({ message: 'Avgas stock level is below safety threshold (20,000 L).' });
      }
      
      return mockResolve({
        fuel_stock: { 'Jet A1': jetLevel, 'Avgas': avgasLevel },
        current_prices: { 'Jet A1': 95.80, 'Avgas': 110.50 },
        today: { fuel_used_liters: 6100, flights: 1 },
        this_month: { 
          total_flights: completedFlights.length + scheduledCount, 
          total_fuel_used_liters: totalFuelUsed, 
          total_fuel_cost: totalFuelCost 
        },
        total_active_aircraft: activeAcCount,
        active_flights: scheduledCount,
        alerts
      });
    }
    return client.get('/dashboard/kpis');
  },
  getConsumptionChart: () => {
    if (DEMO_MODE) {
      const usage = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const usage_date = d.toISOString().slice(0, 10);
        const dayOfWeek = d.getDay();
        const baseJet = dayOfWeek === 0 || dayOfWeek === 6 ? 15000 : 8000;
        const baseAvgas = dayOfWeek === 0 || dayOfWeek === 6 ? 4000 : 1500;
        usage.push({
          usage_date,
          jet_a1_used: Math.floor(baseJet + Math.sin(i) * 3000),
          avgas_used: Math.floor(baseAvgas + Math.cos(i) * 1000)
        });
      }
      return mockResolve(usage);
    }
    return client.get('/dashboard/fuel-consumption-chart');
  },
  getPriceChart: () => {
    if (DEMO_MODE) {
      const prices = [];
      const now = new Date();
      for (let i = 29; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        prices.push({
          date: d.toISOString().slice(0, 10),
          jet_a1_price: 94.50 + Math.sin(i / 3) * 2 + (i * 0.05),
          avgas_price: 108.20 + Math.cos(i / 4) * 3 + (i * 0.08)
        });
      }
      return mockResolve(prices);
    }
    return client.get('/dashboard/price-chart');
  },
  getAircraftConsumption: () => {
    if (DEMO_MODE) {
      return mockResolve([
        { model: 'Boeing 787-8', total_fuel_used: 48000 },
        { model: 'Airbus A320neo', total_fuel_used: 32000 },
        { model: 'Cessna 172', total_fuel_used: 1200 }
      ]);
    }
    return client.get('/dashboard/aircraft-consumption');
  }
};

export const aircraft = {
  list: () => {
    if (DEMO_MODE) {
      return mockResolve(mockAircraft);
    }
    return client.get('/aircraft/');
  },
  create: (data) => {
    if (DEMO_MODE) {
      const newAc = { id: mockAircraft.length + 1, ...data, is_active: true };
      mockAircraft.push(newAc);
      return mockResolve(newAc);
    }
    return client.post('/aircraft/', data);
  },
  stats: (id) => {
    if (DEMO_MODE) {
      return mockResolve({
        total_flights: 5,
        total_fuel_used: 25000,
        avg_efficiency: 0.95,
        total_cost: 2400000
      });
    }
    return client.get(`/aircraft/${id}/stats`);
  },
  update: (id, data) => {
    if (DEMO_MODE) {
      const idx = mockAircraft.findIndex(a => a.id === parseInt(id));
      if (idx !== -1) {
        mockAircraft[idx] = { ...mockAircraft[idx], ...data };
        return mockResolve(mockAircraft[idx]);
      }
      return mockReject('Aircraft not found', 404);
    }
    return client.put(`/aircraft/${id}`, data);
  }
};

export const purchases = {
  list: (params) => {
    if (DEMO_MODE) {
      let list = [...mockPurchases];
      if (params?.fuel_type) {
        list = list.filter(p => p.fuel_type === params.fuel_type);
      }
      if (params?.start_date) {
        list = list.filter(p => p.purchase_date >= params.start_date);
      }
      if (params?.end_date) {
        list = list.filter(p => p.purchase_date <= params.end_date);
      }
      return mockResolve({ purchases: list.slice().reverse(), total: list.length });
    }
    return client.get('/fuel-purchases/', { params });
  },
  create: (data) => {
    if (DEMO_MODE) {
      const total_cost = data.quantity_liters * data.price_per_liter;
      const newPurchase = {
        id: mockPurchases.length + 1,
        invoice_number: data.invoice_number || `INV-2026-${String(mockPurchases.length + 1).padStart(3, '0')}`,
        purchase_date: data.purchase_date,
        supplier_name: data.supplier_name,
        location: data.location,
        fuel_type: data.fuel_type,
        quantity_liters: data.quantity_liters,
        price_per_liter: data.price_per_liter,
        total_cost
      };
      mockPurchases.push(newPurchase);

      // Increase inventory level
      const level = mockInventoryLevels.find(l => l.fuel_type === data.fuel_type);
      if (level) {
        level.total_quantity_liters += data.quantity_liters;
      }

      // Add inventory transaction
      mockTransactions.push({
        id: mockTransactions.length + 1,
        transaction_date: new Date().toISOString(),
        transaction_type: 'purchase',
        fuel_type: data.fuel_type,
        flight_number: null,
        quantity_liters: data.quantity_liters,
        price_per_liter: data.price_per_liter,
        total_cost,
        notes: `Procurement from ${data.supplier_name} at ${data.location}`
      });

      return mockResolve(newPurchase);
    }
    return client.post('/fuel-purchases/', data);
  },
  currentPrice: () => {
    if (DEMO_MODE) {
      const getLatest = (fuel) => {
        const item = [...mockPurchases].reverse().find(p => p.fuel_type === fuel);
        return item ? {
          price_per_liter: item.price_per_liter,
          last_purchase_date: item.purchase_date,
          supplier: item.supplier_name
        } : null;
      };
      return mockResolve({
        'Jet A1': getLatest('Jet A1'),
        'Avgas': getLatest('Avgas')
      });
    }
    return client.get('/fuel-purchases/current-price');
  },
  priceTrend: (params) => {
    if (DEMO_MODE) {
      const range = params?.days || 30;
      const trend = [];
      const now = new Date();
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const factor = params?.fuel_type === 'Jet A1' ? 95.80 : 110.50;
        const trendVal = factor + Math.sin(i / 3.0) * 1.5 + (i * 0.04);
        trend.push({
          date: d.toISOString().slice(0, 10),
          price_per_liter: trendVal
        });
      }
      return mockResolve(trend);
    }
    return client.get('/fuel-purchases/price-trend', { params });
  },
  predictPrice: (params) => {
    if (DEMO_MODE) {
      const daysAhead = params?.days_ahead || 7;
      const predictions = [];
      const now = new Date();
      const startPrice = params?.fuel_type === 'Jet A1' ? 97.20 : 112.10;
      for (let i = 1; i <= daysAhead; i++) {
        const d = new Date(now.getTime() + i * 24 * 60 * 60 * 1000);
        predictions.push({
          date: d.toISOString().slice(0, 10),
          predicted_price: startPrice + (Math.sin(i / 2.0) * 0.8) + (i * 0.1)
        });
      }
      return mockResolve({ predictions });
    }
    return client.get('/fuel-purchases/predict-price', { params });
  },
  averagePrice: () => {
    if (DEMO_MODE) {
      const calcStats = (fuel) => {
        const items = mockPurchases.filter(p => p.fuel_type === fuel);
        const totalQty = items.reduce((s, p) => s + p.quantity_liters, 0);
        const totalCost = items.reduce((s, p) => s + p.total_cost, 0);
        const avgPrice = items.length ? totalCost / totalQty : 0;
        return {
          fuel_type: fuel,
          avg_price_per_liter: avgPrice,
          total_quantity_liters: totalQty,
          purchase_count: items.length
        };
      };
      return mockResolve([
        calcStats('Jet A1'),
        calcStats('Avgas')
      ]);
    }
    return client.get('/fuel-purchases/average-price');
  }
};

export const flights = {
  list: (params) => {
    if (DEMO_MODE) {
      let list = [...mockFlights];
      if (params?.status) {
        list = list.filter(f => f.status === params.status);
      }
      return mockResolve({ flights: list.slice().reverse(), total: list.length });
    }
    return client.get('/flights/', { params });
  },
  create: (data) => {
    if (DEMO_MODE) {
      const ac = mockAircraft.find(a => a.id === parseInt(data.aircraft_id)) || { aircraft_id: 'VT-MOCK', fuel_type: 'Jet A1', fuel_consumption_rate: 2.0 };
      const distance = parseFloat(data.distance_km);
      const rate = ac.fuel_consumption_rate || 2.0;
      const required_fuel_liters = Math.round(distance * rate);

      const newFlight = {
        id: mockFlights.length + 1,
        flight_number: data.flight_number,
        flight_date: data.flight_date,
        aircraft: { id: parseInt(data.aircraft_id), aircraft_id: ac.aircraft_id },
        source: data.source,
        destination: data.destination,
        distance_km: distance,
        required_fuel_liters,
        actual_fuel_used_liters: null,
        trip_fuel_cost: null,
        status: 'scheduled'
      };
      mockFlights.push(newFlight);

      // Deduct from inventory on scheduling
      const fuelType = ac.fuel_type || 'Jet A1';
      const level = mockInventoryLevels.find(l => l.fuel_type === fuelType);
      if (level) {
        level.total_quantity_liters -= required_fuel_liters;
      }

      // Add transaction for allocation
      mockTransactions.push({
        id: mockTransactions.length + 1,
        transaction_date: new Date().toISOString(),
        transaction_type: 'allocation',
        fuel_type: fuelType,
        flight_number: data.flight_number,
        quantity_liters: required_fuel_liters,
        price_per_liter: fuelType === 'Jet A1' ? 95.80 : 110.50,
        total_cost: required_fuel_liters * (fuelType === 'Jet A1' ? 95.80 : 110.50),
        notes: `Allocation for scheduled flight ${data.flight_number}`
      });

      return mockResolve(newFlight);
    }
    return client.post('/flights/', data);
  },
  complete: (id, data) => {
    if (DEMO_MODE) {
      const flightIdx = mockFlights.findIndex(f => f.id === parseInt(id));
      if (flightIdx !== -1) {
        const flight = mockFlights[flightIdx];
        const actualFuel = parseFloat(data.actual_fuel_used_liters);
        const ac = mockAircraft.find(a => a.id === flight.aircraft.id) || { fuel_type: 'Jet A1' };
        const price = ac.fuel_type === 'Avgas' ? 110.50 : 95.80;
        const trip_fuel_cost = actualFuel * price;

        flight.actual_fuel_used_liters = actualFuel;
        flight.trip_fuel_cost = trip_fuel_cost;
        flight.status = 'completed';

        // Refund or extra consumption
        const diff = flight.required_fuel_liters - actualFuel;
        const level = mockInventoryLevels.find(l => l.fuel_type === ac.fuel_type);
        if (level && diff !== 0) {
          level.total_quantity_liters += diff;
        }

        mockTransactions.push({
          id: mockTransactions.length + 1,
          transaction_date: new Date().toISOString(),
          transaction_type: diff > 0 ? 'refund' : 'consumption',
          fuel_type: ac.fuel_type,
          flight_number: flight.flight_number,
          quantity_liters: Math.abs(diff),
          price_per_liter: price,
          total_cost: Math.abs(diff) * price,
          notes: diff > 0 
            ? `Refund for unused fuel from flight ${flight.flight_number}`
            : `Additional consumption adjustment for flight ${flight.flight_number}`
        });

        return mockResolve(flight);
      }
      return mockReject('Flight not found', 404);
    }
    return client.post(`/flights/${id}/complete`, data);
  },
  cancel: (id) => {
    if (DEMO_MODE) {
      const flightIdx = mockFlights.findIndex(f => f.id === parseInt(id));
      if (flightIdx !== -1) {
        const flight = mockFlights[flightIdx];
        flight.status = 'cancelled';

        const ac = mockAircraft.find(a => a.id === flight.aircraft.id) || { fuel_type: 'Jet A1' };
        const level = mockInventoryLevels.find(l => l.fuel_type === ac.fuel_type);
        if (level) {
          level.total_quantity_liters += flight.required_fuel_liters;
        }

        mockTransactions.push({
          id: mockTransactions.length + 1,
          transaction_date: new Date().toISOString(),
          transaction_type: 'refund',
          fuel_type: ac.fuel_type,
          flight_number: flight.flight_number,
          quantity_liters: flight.required_fuel_liters,
          price_per_liter: ac.fuel_type === 'Avgas' ? 110.50 : 95.80,
          total_cost: flight.required_fuel_liters * (ac.fuel_type === 'Avgas' ? 110.50 : 95.80),
          notes: `Refund due to cancellation of flight ${flight.flight_number}`
        });

        return mockResolve(flight);
      }
      return mockReject('Flight not found', 404);
    }
    return client.post(`/flights/${id}/cancel`);
  }
};

export const inventory = {
  getLevels: () => {
    if (DEMO_MODE) {
      return mockResolve(mockInventoryLevels);
    }
    return client.get('/fuel-transactions/inventory');
  },
  getTransactions: (params) => {
    if (DEMO_MODE) {
      let list = [...mockTransactions];
      if (params?.transaction_type) {
        list = list.filter(t => t.transaction_type === params.transaction_type);
      }
      if (params?.fuel_type) {
        list = list.filter(t => t.fuel_type === params.fuel_type);
      }
      return mockResolve({ transactions: list.slice().reverse(), total: list.length });
    }
    return client.get('/fuel-transactions/', { params });
  }
};

export const usage = {
  list: (params) => {
    if (DEMO_MODE) {
      const range = params?.days || 14;
      const records = [];
      const now = new Date();
      for (let i = range - 1; i >= 0; i--) {
        const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const dateStr = d.toISOString().slice(0, 10);
        records.push({
          usage_date: dateStr,
          jet_a1_used: 5000 + Math.floor(Math.random() * 8000),
          avgas_used: 1000 + Math.floor(Math.random() * 3000),
          total_fuel_used_liters: 6000 + Math.floor(Math.random() * 11000),
          total_fuel_cost: 650000 + Math.floor(Math.random() * 900000),
          total_flights: 1 + Math.floor(Math.random() * 4)
        });
      }
      return mockResolve({ records });
    }
    return client.get('/daily-usage/', { params });
  }
};

export const reports = {
  getTripCosts: (params) => {
    if (DEMO_MODE) {
      let trips = mockFlights.filter(f => f.status === 'completed').map(f => ({
        flight_number: f.flight_number,
        flight_date: f.flight_date,
        route: `${f.source} → ${f.destination}`,
        aircraft: f.aircraft.aircraft_id,
        distance_km: f.distance_km,
        actual_fuel: f.actual_fuel_used_liters,
        efficiency: 0.96 + Math.random() * 0.08,
        trip_fuel_cost: f.trip_fuel_cost
      }));
      if (params?.aircraft_id) {
        const ac = mockAircraft.find(a => a.id === parseInt(params.aircraft_id));
        if (ac) {
          trips = trips.filter(t => t.aircraft === ac.aircraft_id);
        }
      }
      const summary = {
        total_trips: trips.length,
        total_fuel_used: trips.reduce((s, t) => s + t.actual_fuel, 0),
        total_fuel_cost: trips.reduce((s, t) => s + t.trip_fuel_cost, 0)
      };
      return mockResolve({ trips, summary });
    }
    return client.get('/reports/trip-costs', { params });
  },
  getMonthlyUsage: () => {
    if (DEMO_MODE) {
      const data = [
        { month_name: 'May 2026', total_flights: 45, jet_a1_used: 120000, avgas_used: 24000, total_fuel_used: 144000, total_cost: 14200000 },
        { month_name: 'Jun 2026', total_flights: 52, jet_a1_used: 135000, avgas_used: 28000, total_fuel_used: 163000, total_cost: 16100000 },
        { month_name: 'Jul 2026', total_flights: 58, jet_a1_used: 142000, avgas_used: 31000, total_fuel_used: 173000, total_cost: 17000000 }
      ];
      return mockResolve({ data });
    }
    return client.get('/reports/monthly-usage');
  },
  getAircraftConsumption: (params) => {
    if (DEMO_MODE) {
      const data = [
        { aircraft_id: 'VT-ANX', model: 'Boeing 787-8', total_flights: 12, total_fuel_used_liters: 72000, total_distance_km: 13680, avg_efficiency: 0.95, total_fuel_cost: 6897600 },
        { aircraft_id: 'VT-EDC', model: 'Airbus A320neo', total_flights: 15, total_fuel_used_liters: 40500, total_distance_km: 15000, avg_efficiency: 0.98, total_fuel_cost: 3880000 },
        { aircraft_id: 'VT-TES', model: 'Cessna 172 Skyhawk', total_flights: 8, total_fuel_used_liters: 960, total_distance_km: 2740, avg_efficiency: 1.05, total_fuel_cost: 106080 }
      ];
      return mockResolve({ data });
    }
    return client.get('/reports/aircraft-consumption', { params });
  },
  exportPdf: (params) => {
    if (DEMO_MODE) {
      const mockPdfBlob = new Blob(['%PDF-1.4 mock pdf content'], { type: 'application/pdf' });
      return mockResolve(mockPdfBlob);
    }
    return client.get('/reports/export-pdf', {
      params,
      responseType: 'blob',
    });
  }
};
