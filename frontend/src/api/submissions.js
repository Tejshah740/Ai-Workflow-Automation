import api from './axios';

export async function uploadDocument(file, submissionType = 'unknown') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('submission_type', submissionType);

  const { data } = await api.post('/api/submissions/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

export async function submitRequest(submissionType, fields) {
  const { data } = await api.post('/api/submissions/requests', {
    submission_type: submissionType,
    fields,
  });
  return data;
}

export async function listSubmissions({ status, channel, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (status) params.append('status_filter', status);
  if (channel) params.append('channel', channel);
  params.append('limit', String(limit));
  params.append('offset', String(offset));

  const { data } = await api.get(`/api/submissions?${params.toString()}`);
  return data;
}

export async function getSubmission(id) {
  const { data } = await api.get(`/api/submissions/${id}`);
  return data;
}


export async function downloadSubmission(id, originalFilename) {
  const response = await api.get(`/api/submissions/${id}/download`, {
    responseType: 'blob',
  });

  const url = window.URL.createObjectURL(response.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = originalFilename || 'download';
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function deleteSubmission(id) {
  await api.delete(`/api/submissions/${id}`);
}

export async function getAuditTrail(id) {
  const { data } = await api.get(`/api/submissions/${id}/audit`);
  return data;
}

export async function getExtraction(id) {
  const { data } = await api.get(`/api/submissions/${id}/extraction`);
  return data;
}

export async function getValidation(id) {
  const { data } = await api.get(`/api/submissions/${id}/validation`);
  return data;
}
