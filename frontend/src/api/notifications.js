import api from './axios';

export async function listNotifications({ unreadOnly = false, limit = 20, offset = 0 } = {}) {
  const params = new URLSearchParams();
  if (unreadOnly) params.append('unread_only', 'true');
  if (limit) params.append('limit', limit);
  if (offset) params.append('offset', offset);

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const { data } = await api.get(`/api/notifications${queryStr}`);
  return data;
}

export async function markNotificationRead(notificationId) {
  const { data } = await api.post(`/api/notifications/${notificationId}/read`);
  return data;
}

export async function markAllNotificationsRead() {
  const { data } = await api.post('/api/notifications/read-all');
  return data;
}
