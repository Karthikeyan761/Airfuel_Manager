import client from './client';

export const auth = {
  login:      (username, password) => client.post('/auth/login', { username, password }),
  profile:    () => client.get('/auth/me'),
  listUsers:  () => client.get('/auth/users'),
  createUser: (data) => client.post('/auth/users', data),
};

export const dashboard = {
  getKPIs:               () => client.get('/dashboard/kpis'),
  getConsumptionChart:   () => client.get('/dashboard/fuel-consumption-chart'),
  getPriceChart:         () => client.get('/dashboard/price-chart'),
  getAircraftConsumption:() => client.get('/dashboard/aircraft-consumption'),
};

export const aircraft = {
  list:   ()         => client.get('/aircraft/'),
  create: (data)     => client.post('/aircraft/', data),
  stats:  (id)       => client.get(`/aircraft/${id}/stats`),
  update: (id, data) => client.put(`/aircraft/${id}`, data),
};

export const purchases = {
  list:         (params) => client.get('/fuel-purchases/', { params }),
  create:       (data)   => client.post('/fuel-purchases/', data),
  currentPrice: ()       => client.get('/fuel-purchases/current-price'),
  priceTrend:   (params) => client.get('/fuel-purchases/price-trend', { params }),
  predictPrice: (params) => client.get('/fuel-purchases/predict-price', { params }),
  averagePrice: ()       => client.get('/fuel-purchases/average-price'),
};

export const flights = {
  list:     (params)    => client.get('/flights/', { params }),
  create:   (data)      => client.post('/flights/', data),
  complete: (id, data)  => client.post(`/flights/${id}/complete`, data),
  cancel:   (id)        => client.post(`/flights/${id}/cancel`),
};

export const inventory = {
  getLevels:      ()       => client.get('/fuel-transactions/inventory'),
  getTransactions:(params) => client.get('/fuel-transactions/', { params }),
};

export const usage = {
  list: (params) => client.get('/daily-usage/', { params }),
};

export const reports = {
  getTripCosts:           (params) => client.get('/reports/trip-costs', { params }),
  getMonthlyUsage:        ()       => client.get('/reports/monthly-usage'),
  getAircraftConsumption: (params) => client.get('/reports/aircraft-consumption', { params }),
  exportPdf: (params) =>
    client.get('/reports/export-pdf', {
      params,
      responseType: 'blob',
    }),
};
