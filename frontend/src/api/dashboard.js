import api from './axios';

export async function getSummary(since, until) {
  const params = {};
  if (since) params.since = since;
  if (until) params.until = until;
  const { data } = await api.get('/api/dashboard/summary', { params });
  return data;
}

export async function getByType(since, until) {
  const params = {};
  if (since) params.since = since;
  if (until) params.until = until;
  const { data } = await api.get('/api/dashboard/by-type', { params });
  return data;
}

export async function getProcessingReport(since, until) {
  const params = {};
  if (since) params.since = since;
  if (until) params.until = until;
  const { data } = await api.get('/api/reports/processing', { params });
  return data;
}

export async function getApprovalsReport() {
  const { data } = await api.get('/api/reports/approvals');
  return data;
}

export async function getErrorsReport(limit = 50) {
  const { data } = await api.get('/api/reports/errors', { params: { limit } });
  return data;
}
