import type { Email, MailDomain } from '@/types/vault';

const API_BASE = 'https://api.mail.tm';

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`mail.tm API error ${res.status}: ${text}`);
  }
  return res;
}

export async function getDomains(): Promise<MailDomain[]> {
  const res = await apiFetch('/domains');
  const data = await res.json();
  return (data['hydra:member'] || data).map((d: any) => ({
    id: d.id,
    domain: d.domain,
    isActive: d.isActive,
    isPrivate: d.isPrivate,
  }));
}

export async function createAccount(
  address: string,
  password: string
): Promise<{ id: string; address: string }> {
  const res = await apiFetch('/accounts', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });
  const data = await res.json();
  return { id: data.id, address: data.address };
}

export async function getToken(
  address: string,
  password: string
): Promise<string> {
  const res = await apiFetch('/token', {
    method: 'POST',
    body: JSON.stringify({ address, password }),
  });
  const data = await res.json();
  return data.token;
}

export async function deleteAccount(
  id: string,
  token: string
): Promise<void> {
  await apiFetch(`/accounts/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getMessages(
  token: string,
  page: number = 1
): Promise<Email[]> {
  const res = await apiFetch(`/messages?page=${page}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return (data['hydra:member'] || data).map((m: any) => ({
    id: m.id,
    from: m.from,
    to: m.to,
    subject: m.subject,
    intro: m.intro,
    seen: m.seen,
    createdAt: m.createdAt,
    hasAttachments: m.hasAttachments,
  }));
}

export async function getMessage(
  id: string,
  token: string
): Promise<Email> {
  const res = await apiFetch(`/messages/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  return {
    id: data.id,
    from: data.from,
    to: data.to,
    subject: data.subject,
    intro: data.intro,
    text: data.text,
    html: data.html,
    seen: data.seen,
    createdAt: data.createdAt,
    hasAttachments: data.hasAttachments,
  };
}

export async function deleteMessage(
  id: string,
  token: string
): Promise<void> {
  await apiFetch(`/messages/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function markAsRead(
  id: string,
  token: string
): Promise<void> {
  await apiFetch(`/messages/${id}`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/merge-patch+json',
    },
    body: JSON.stringify({ seen: true }),
  });
}

export function generateRandomAddress(domain: string): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let name = '';
  for (let i = 0; i < 10; i++) {
    name += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${name}@${domain}`;
}

export function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let pass = '';
  for (let i = 0; i < 16; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}
