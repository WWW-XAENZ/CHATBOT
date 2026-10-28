const config = window.SUPABASE_CONFIG ?? {};
const baseUrl = config.url?.replace(/\/+$/, '');
const publicKey = config.anonKey;

export const isSupabaseConfigured = Boolean(baseUrl && publicKey);

async function request(path, { method = 'GET', body, token, keepalive = false } = {}) {
  if (!isSupabaseConfigured) {
    throw new Error('Supabase aún no está configurado. Completa supabase-config.js.');
  }

  const headers = {
    apikey: publicKey,
    Authorization: `Bearer ${token ?? publicKey}`,
  };
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    keepalive,
  });
  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase respondió ${response.status}: ${details || response.statusText}`);
  }
  if (response.status === 204) return null;
  const responseText = await response.text();
  return responseText ? JSON.parse(responseText) : null;
}

export function recordAnalytics(event) {
  return request('/rest/v1/chat_analytics', {
    method: 'POST',
    body: event,
    keepalive: ['visit_end', 'whatsapp_open'].includes(event.event_type),
  });
}

export function signIn(email, password) {
  return request('/auth/v1/token?grant_type=password', {
    method: 'POST',
    body: { email, password },
  });
}

export function loadAnalytics(accessToken) {
  const query = new URLSearchParams({
    select: 'session_id,event_type,occurred_at,wait_ms,duration_ms',
    order: 'occurred_at.desc',
    limit: '5000',
  });
  return request(`/rest/v1/chat_analytics?${query}`, { token: accessToken });
}

export function recordReview(review) {
  return request('/rest/v1/reviews', { method: 'POST', body: review });
}

export function loadReviews(accessToken) {
  const query = new URLSearchParams({
    select: 'rating,comment,created_at',
    order: 'created_at.desc',
    limit: '5000',
  });
  return request(`/rest/v1/reviews?${query}`, { token: accessToken });
}
