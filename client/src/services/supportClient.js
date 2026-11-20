const API_BASE = import.meta.env.VITE_API_URL || '';
const STORAGE_KEY = 'ai_support_workflow_v1';

const SEED_TICKETS = [
  {
    id: 'tkt-101', customerName: 'Rohan Kulkarni', customerEmail: 'rohan@acme-ind.in',
    subject: 'Production API returning 502 on webhook retries',
    description: 'Our production webhook endpoint started throwing 502 errors during peak traffic after deploy. Need urgent help.',
    status: 'Open', assignee: 'Sasidhar', category: 'Cloud & API', priority: 'Urgent', slaHours: 2,
    slaDeadline: new Date(Date.now() + 30 * 60 * 1000).toISOString(), sentiment: 'Escalating',
    kbTitle: 'API Latency, Webhook Retries & Deployment Health',
    suggestedReply: 'Thanks for reporting this service issue. Our triage pipeline logged the error signature and checked upstream health/webhook delivery. Please share a sample request ID or timestamp so we can trace the exact span and close this out.',
    replies: [{ id: 'rep-1', author: 'Vijaysimha', text: 'Checked upstream gateway logs—reproducing under burst load now.', createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() }],
    createdAt: new Date(Date.now() - 90 * 60 * 1000).toISOString(), updatedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
];

function readLocal() { try { const r = localStorage.getItem(STORAGE_KEY); if (r) return JSON.parse(r); } catch {} return JSON.parse(JSON.stringify(SEED_TICKETS)); }
function writeLocal(t) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(t)); } catch {} }

export function subscribeRealtimeTickets(onUpdate) {
  try {
    const es = new EventSource(`${API_BASE}/api/stream`);
    es.onmessage = (e) => { const d = JSON.parse(e.data); if (Array.isArray(d.tickets)) { writeLocal(d.tickets); onUpdate(d.tickets, true); } };
    es.onerror = () => {};
    return () => es.close();
  } catch { return () => {}; }
}

export async function fetchTicketsHybrid() {
  try { const r = await fetch(`${API_BASE}/api/tickets`); if (r.ok) { const d = await r.json(); writeLocal(d.tickets); return { tickets: d.tickets, backendConnected: true }; } } catch {}
  return { tickets: readLocal(), backendConnected: false };
}

export async function resetTicketsHybrid() {
  try { const r = await fetch(`${API_BASE}/api/tickets/reset`, { method: 'POST' }); if (r.ok) { const d = await r.json(); writeLocal(d.tickets); return { tickets: d.tickets, backendConnected: true }; } } catch {}
  const fresh = JSON.parse(JSON.stringify(SEED_TICKETS)); writeLocal(fresh); return { tickets: fresh, backendConnected: false };
}

export async function createTicketHybrid(payload) {
  try { const r = await fetch(`${API_BASE}/api/tickets`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); if (r.ok) { const d = await r.json(); return { ticket: d.ticket, backendConnected: true }; } } catch {}
  const list = readLocal();
  const tkt = { ...payload, id: `tkt-${Date.now()}`, status: 'Open', category: 'Cloud & API', priority: 'High', slaHours: 6, slaDeadline: new Date(Date.now() + 6 * 3600 * 1000).toISOString(), sentiment: 'Neutral', kbTitle: 'Standard Runbook', suggestedReply: `Thanks for reaching out regarding "${payload.subject}". We are reviewing this now.`, replies: [], createdAt: new Date().toISOString() };
  list.unshift(tkt); writeLocal(list); return { ticket: tkt, backendConnected: false };
}

export async function updateTicketHybrid(id, updates) {
  try { const r = await fetch(`${API_BASE}/api/tickets/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updates) }); if (r.ok) { const d = await r.json(); return { ticket: d.ticket, backendConnected: true }; } } catch {}
  const list = readLocal(); const tkt = list.find((t) => t.id === id); Object.assign(tkt, updates); writeLocal(list); return { ticket: tkt, backendConnected: false };
}

export async function addReplyHybrid(id, author, text) {
  try { const r = await fetch(`${API_BASE}/api/tickets/${id}/replies`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ author, text }) }); if (r.ok) { const d = await r.json(); return { ticket: d.ticket, backendConnected: true }; } } catch {}
  const list = readLocal(); const tkt = list.find((t) => t.id === id); tkt.replies.push({ id: `rep-${Date.now()}`, author, text, createdAt: new Date().toISOString() }); writeLocal(list); return { ticket: tkt, backendConnected: false };
}

export async function deleteTicketHybrid(id) {
  try { const r = await fetch(`${API_BASE}/api/tickets/${id}`, { method: 'DELETE' }); if (r.ok) { const d = await r.json(); return { tickets: d.tickets, backendConnected: true }; } } catch {}
  const list = readLocal().filter((t) => t.id !== id); writeLocal(list); return { tickets: list, backendConnected: false };
}
