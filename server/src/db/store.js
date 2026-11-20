import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { analyzeTicket } from '../services/triageEngine.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, '../../data');
const DB_FILE = path.join(DATA_DIR, 'tickets.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function makeSeedTicket(id, customerName, customerEmail, subject, description, status, assignee, hoursAgo, replies = []) {
  const triage = analyzeTicket({ subject, description, customerEmail });
  const createdAt = new Date(Date.now() - hoursAgo * 3600 * 1000).toISOString();
  const slaDeadline = new Date(Date.parse(createdAt) + triage.slaHours * 3600 * 1000).toISOString();
  return {
    id, customerName, customerEmail, subject, description, status, assignee,
    category: triage.category, priority: triage.priority, slaHours: triage.slaHours,
    slaDeadline, sentiment: triage.sentiment, kbTitle: triage.kbTitle,
    suggestedReply: triage.suggestedReply, replies, createdAt, updatedAt: createdAt,
  };
}

const DEFAULT_DATA = {
  tickets: [
    makeSeedTicket('tkt-101', 'Rohan Kulkarni', 'rohan@acme-ind.in', 'Production API returning 502 on webhook retries', 'Our production webhook endpoint started throwing 502 errors during peak traffic after deploy. Need urgent help.', 'Open', 'Sasidhar', 1.5, [
      { id: 'rep-1', author: 'Vijaysimha', text: 'Checked upstream gateway logs—reproducing under burst load now.', createdAt: new Date(Date.now() - 45 * 60 * 1000).toISOString() },
    ]),
    makeSeedTicket('tkt-102', 'Meera Nair', 'meera@finledger.co.in', 'Need GST invoice for November cloud subscription', 'Payment went through via UPI yesterday, please share the GST invoice PDF/details for accounting.', 'In Progress', 'Vijaysimha', 4, []),
    makeSeedTicket('tkt-103', 'Arjun Verma', 'arjun@cloudscale.dev', 'SSO token returning 403 for new QA member', 'New developer account gets 403 forbidden when opening staging project dashboard.', 'Resolved', 'Sasidhar', 9, [
      { id: 'rep-2', author: 'Sasidhar', text: 'Updated workspace role mapping to Developer and verified login.', createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString() },
    ]),
  ],
};

function writeDB(data) { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }
export function resetAndReadTickets() { const fresh = JSON.parse(JSON.stringify(DEFAULT_DATA)); writeDB(fresh); return fresh.tickets; }
function readTickets() {
  if (!fs.existsSync(DB_FILE)) return resetAndReadTickets();
  try { const p = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8')); return Array.isArray(p.tickets) ? p.tickets : resetAndReadTickets(); }
  catch { return resetAndReadTickets(); }
}
function saveTickets(tickets) { writeDB({ tickets }); }
export function listTickets() { return readTickets(); }

export function createSupportTicket(payload) {
  const subject = (payload.subject || '').trim();
  if (!subject) throw new Error('Ticket subject is required');
  const customerName = (payload.customerName || 'Customer').trim();
  const customerEmail = (payload.customerEmail || 'support@customer.in').trim();
  const assignee = (payload.assignee || 'Sasidhar').trim();
  const triage = analyzeTicket({ subject, description: payload.description || '', customerEmail });
  const now = new Date();
  const createdAt = now.toISOString();
  const ticket = {
    id: `tkt-${Date.now()}`, customerName, customerEmail, subject,
    description: (payload.description || '').trim(), status: 'Open', assignee,
    category: payload.category || triage.category, priority: payload.priority || triage.priority,
    slaHours: triage.slaHours, slaDeadline: new Date(now.getTime() + triage.slaHours * 3600 * 1000).toISOString(),
    sentiment: triage.sentiment, kbTitle: triage.kbTitle, suggestedReply: triage.suggestedReply,
    replies: [], createdAt, updatedAt: createdAt,
  };
  const tickets = readTickets(); tickets.unshift(ticket); saveTickets(tickets);
  return ticket;
}

export function updateSupportTicket(ticketId, updates) {
  const tickets = readTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) throw new Error('Ticket not found');
  if (updates.status !== undefined) tkt.status = updates.status;
  if (updates.priority !== undefined) tkt.priority = updates.priority;
  if (updates.category !== undefined) tkt.category = updates.category;
  if (updates.assignee !== undefined) tkt.assignee = updates.assignee;
  tkt.updatedAt = new Date().toISOString();
  saveTickets(tickets);
  return tkt;
}

export function addTicketReply(ticketId, author, text) {
  const cleanText = (text || '').trim();
  if (!cleanText) throw new Error('Reply text is required');
  const tickets = readTickets();
  const tkt = tickets.find((t) => t.id === ticketId);
  if (!tkt) throw new Error('Ticket not found');
  const reply = { id: `rep-${Date.now()}`, author: (author || 'Sasidhar').trim(), text: cleanText, createdAt: new Date().toISOString() };
  tkt.replies.push(reply);
  if (tkt.status === 'Open') tkt.status = 'In Progress';
  tkt.updatedAt = new Date().toISOString();
  saveTickets(tickets);
  return { ticket: tkt, reply };
}

export function deleteSupportTicket(ticketId) {
  const tickets = readTickets();
  const idx = tickets.findIndex((t) => t.id === ticketId);
  if (idx === -1) throw new Error('Ticket not found');
  tickets.splice(idx, 1); saveTickets(tickets);
  return tickets;
}
