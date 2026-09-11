import api from './axios';


export async function register(email, password) {
  const { data } = await api.post('/api/auth/register', { email, password });
  return data;
}

export async function login(email, password) {
  const params = new URLSearchParams();
  params.append('username', email);
  params.append('password', password);

  const { data } = await api.post('/api/auth/login', params, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return data;
}

export async function getMe() {
  const { data } = await api.get('/api/auth/me');
  return data;
}
