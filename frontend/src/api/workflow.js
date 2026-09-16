import api from './axios';

export async function getRules() {
  const { data } = await api.get('/api/workflow/rules');
  return data;
}

export async function upsertRule(submissionType, levels) {
  const { data } = await api.put(`/api/workflow/rules/${encodeURIComponent(submissionType)}`, {
    levels,
  });
  return data;
}

export async function getQueue() {
  const { data } = await api.get('/api/workflow/queue');
  return data;
}

export async function getWorkflowStatus(id) {
  const { data } = await api.get(`/api/workflow/${id}`);
  return data;
}

export async function correctFields(id, fields) {
  const { data } = await api.put(`/api/workflow/${id}/fields`, { fields });
  return data;
}

export async function resolveReview(id) {
  const { data } = await api.post(`/api/workflow/${id}/resolve`);
  return data;
}

export async function approveSubmission(id, comment) {
  const { data } = await api.post(`/api/workflow/${id}/approve`, {
    comment: comment || null,
  });
  return data;
}

export async function rejectSubmission(id, comment) {
  const { data } = await api.post(`/api/workflow/${id}/reject`, {
    comment: comment || null,
  });
  return data;
}
