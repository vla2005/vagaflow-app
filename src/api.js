const apiBaseUrl = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

export function apiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

async function readJson(response) {
  const contentType = response.headers.get('content-type') || '';
  return contentType.includes('application/json') ? response.json() : null;
}

function xsrfToken() {
  const cookie = document.cookie.split('; ').find((part) => part.startsWith('XSRF-TOKEN='));
  return cookie ? decodeURIComponent(cookie.slice('XSRF-TOKEN='.length)) : '';
}

export async function initializeCsrf() {
  const response = await fetch(apiUrl('/sanctum/csrf-cookie'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Não foi possível iniciar uma sessão segura.');
  }
}

export async function getSession() {
  await initializeCsrf();
  const response = await fetch(apiUrl('/api/session'), {
    credentials: 'include',
    headers: { Accept: 'application/json' },
  });

  if (!response.ok) {
    throw new Error('Não foi possível conectar ao servidor.');
  }

  return readJson(response);
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  if (!['GET', 'HEAD'].includes(method) && !xsrfToken()) {
    await initializeCsrf();
  }

  const response = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(!['GET', 'HEAD'].includes(method) ? { 'X-XSRF-TOKEN': xsrfToken() } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const result = await readJson(response);

  if (!response.ok) {
    const error = new Error(result?.message || 'Não foi possível concluir a solicitação.');
    error.status = response.status;
    error.fields = result?.errors || {};
    throw error;
  }

  return result;
}

export async function apiFormRequest(path, formData) {
  if (!xsrfToken()) await initializeCsrf();

  const response = await fetch(apiUrl(path), {
    method: 'POST',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-XSRF-TOKEN': xsrfToken(),
    },
    body: formData,
  });

  const result = await readJson(response);

  if (!response.ok) {
    const error = new Error(result?.message || 'Não foi possível enviar o arquivo.');
    error.status = response.status;
    error.fields = result?.errors || {};
    throw error;
  }

  return result;
}
