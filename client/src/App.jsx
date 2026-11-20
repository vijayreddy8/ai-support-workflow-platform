import React, { useState, useEffect } from 'react';
import { Bot, Clock, CheckCircle2, AlertTriangle, Plus, Search, Server, Send, Trash2, Sparkles, RotateCcw, Inbox } from 'lucide-react';
import {
  fetchTicketsHybrid,
  subscribeRealtimeTickets,
  resetTicketsHybrid,
  createTicketHybrid,
  updateTicketHybrid,
  addReplyHybrid,
  deleteTicketHybrid,
} from './services/supportClient';

const STATUSES = ['Open', 'In Progress', 'Resolved'];
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
const AGENTS = ['Sasidhar', 'Vijaysimha'];

const PRIORITY_BADGE = {
  Urgent: 'bg-red-100 text-red-800 border-red-300',
  High: 'bg-amber-100 text-amber-900 border-amber-300',
  Medium: 'bg-sky-100 text-sky-900 border-sky-300',
  Low: 'bg-emerald-100 text-emerald-900 border-emerald-300',
};

export default function App() {
  const [tickets, setTickets] = useState([]);
  const [selectedId, setSelectedId] = useState('tkt-101');
  const [currentAgent, setCurrentAgent] = useState('Sasidhar');
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [backendConnected, setBackendConnected] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [assignee, setAssignee] = useState('Vijaysimha');
  const [showCreate, setShowCreate] = useState(false);

  const [replyText, setReplyText] = useState('');

  useEffect(() => {
    (async () => {
      const r = await fetchTicketsHybrid();
      setTickets(r.tickets);
      setBackendConnected(r.backendConnected);
      if (r.tickets[0]) setSelectedId(r.tickets[0].id);
    })();
    const unsub = subscribeRealtimeTickets((liveTickets, connected) => {
      setTickets(liveTickets);
      setBackendConnected(connected);
    });
    return () => unsub();
  }, []);

  const selectedTicket = tickets.find((t) => t.id === selectedId) || tickets[0] || null;

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!subject.trim()) return;
    const r = await createTicketHybrid({ customerName, customerEmail, subject, description, assignee });
    if (r.ticket) {
      setSelectedId(r.ticket.id);
      setSubject(''); setDescription(''); setCustomerName(''); setCustomerEmail(''); setShowCreate(false);
    }
    setBackendConnected(r.backendConnected);
  };

  const handleUpdate = async (id, patch) => {
    const r = await updateTicketHybrid(id, patch);
    setBackendConnected(r.backendConnected);
  };

  const handleReply = async (e) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;
    const r = await addReplyHybrid(selectedTicket.id, currentAgent, replyText);
    setBackendConnected(r.backendConnected);
    setReplyText('');
  };

  const handleDelete = async (id) => {
    const r = await deleteTicketHybrid(id);
    setBackendConnected(r.backendConnected);
    if (Array.isArray(r.tickets)) {
      setTickets(r.tickets);
      setSelectedId(r.tickets[0]?.id || null);
    }
  };

  const handleReset = async () => {
    const r = await resetTicketsHybrid();
    setTickets(r.tickets);
    setBackendConnected(r.backendConnected);
    if (r.tickets[0]) setSelectedId(r.tickets[0].id);
  };

  const visibleTickets = tickets.filter((t) => {
    const okStatus = statusFilter === 'All' || t.status === statusFilter;
    const q = search.trim().toLowerCase();
    const okSearch = !q || t.subject.toLowerCase().includes(q) || t.customerName.toLowerCase().includes(q) || t.category.toLowerCase().includes(q);
    return okStatus && okSearch;
  });

  const openCount = tickets.filter((t) => t.status !== 'Resolved').length;
  const urgentCount = tickets.filter((t) => t.priority === 'Urgent' && t.status !== 'Resolved').length;
  const resolvedCount = tickets.filter((t) => t.status === 'Resolved').length;

  return (
    <div className="min-h-screen bg-[#F6F5F0] text-stone-900">
      {/* Top Bar */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20">
        <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-md bg-emerald-800 text-amber-50 flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-bold tracking-tight text-stone-900">
                Helpdesk & Workflow Desk
              </h1>
              <p className="text-[11px] text-stone-500">
                Automated triage · SLA timer · KB response drafts · Live stream
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={currentAgent}
              onChange={(e) => setCurrentAgent(e.target.value)}
              className="px-3 py-1.5 rounded-md bg-[#F6F5F0] border border-stone-300 text-xs font-medium text-stone-800"
            >
              {AGENTS.map((a) => <option key={a} value={a}>Desk agent: {a}</option>)}
            </select>

            <button
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-md bg-white hover:bg-stone-100 border border-stone-300 text-xs font-medium text-stone-700 inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>

            <span className={`text-xs px-2.5 py-1.5 rounded-md border inline-flex items-center gap-1.5 font-medium ${backendConnected ? 'bg-emerald-50 border-emerald-300 text-emerald-800' : 'bg-stone-100 border-stone-300 text-stone-600'}`}>
              <Server className="w-3.5 h-3.5" />{backendConnected ? 'API Connected' : 'Offline Cache'}
            </span>

            <button
              onClick={() => setShowCreate((v) => !v)}
              className="px-3.5 py-1.5 rounded-md bg-emerald-800 hover:bg-emerald-900 text-xs font-semibold text-white inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" /> New Ticket
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-[1380px] mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Rail: Queue Filters & Summary */}
        <aside className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Queue Status</div>
            {['All', ...STATUSES].map((st) => {
              const count = st === 'All' ? tickets.length : tickets.filter((x) => x.status === st).length;
              const active = statusFilter === st;
              return (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-md text-xs font-medium transition ${active ? 'bg-emerald-800 text-white' : 'hover:bg-stone-100 text-stone-700'}`}
                >
                  <span>{st}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] ${active ? 'bg-emerald-950/60 text-emerald-100' : 'bg-stone-100 text-stone-600'}`}>{count}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
            <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">Live SLA Snapshot</div>
            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 text-xs">
              <span className="text-stone-600 inline-flex items-center gap-1.5"><Inbox className="w-3.5 h-3.5 text-stone-500" /> Active tickets</span>
              <span className="font-bold text-stone-900">{openCount}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-stone-100 text-xs">
              <span className="text-stone-600 inline-flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5 text-red-600" /> Urgent open</span>
              <span className="font-bold text-red-700">{urgentCount}</span>
            </div>
            <div className="flex items-center justify-between py-1.5 text-xs">
              <span className="text-stone-600 inline-flex items-center gap-1.5"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" /> Resolved</span>
              <span className="font-bold text-emerald-800">{resolvedCount}</span>
            </div>
          </div>
        </aside>

        {/* Main Workspace */}
        <section className="lg:col-span-9 space-y-5">
          {showCreate && (
            <form onSubmit={handleCreate} className="bg-white border-2 border-emerald-800/30 rounded-lg p-5 space-y-3 shadow-sm">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-stone-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-800" /> Log Customer Ticket (Auto-Triage Enabled)
                </h2>
                <button type="button" onClick={() => setShowCreate(false)} className="text-xs text-stone-500 hover:text-stone-900">Cancel</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900" />
                <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email" className="px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900" />
                <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900">
                  {AGENTS.map((a) => <option key={a} value={a}>Owner: {a}</option>)}
                </select>
              </div>
              <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g., 502 on production webhook or GST invoice request)..." className="w-full px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-sm text-stone-900" />
              <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details, error logs, or context..." className="w-full px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-sm text-stone-900" />
              <div className="flex justify-end">
                <button type="submit" className="px-4 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-xs font-semibold text-white">
                  Submit Ticket
                </button>
              </div>
            </form>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            {/* Ticket List */}
            <div className="xl:col-span-5 space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by subject, customer, or topic..."
                  className="w-full pl-9 pr-3 py-2 rounded-md bg-white border border-stone-300 text-xs text-stone-900"
                />
              </div>

              <div className="space-y-2">
                {visibleTickets.map((t) => {
                  const isSel = selectedTicket?.id === t.id;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`w-full text-left p-3.5 rounded-lg border transition space-y-1.5 ${isSel ? 'bg-white border-emerald-800 ring-1 ring-emerald-800/30' : 'bg-white/80 border-stone-200 hover:bg-white'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded border font-semibold ${PRIORITY_BADGE[t.priority] || PRIORITY_BADGE.Medium}`}>
                          {t.priority}
                        </span>
                        <span className="text-[11px] font-medium text-emerald-900">{t.category}</span>
                      </div>
                      <div className="text-sm font-semibold text-stone-900 line-clamp-1">{t.subject}</div>
                      <div className="flex items-center justify-between text-[11px] text-stone-500">
                        <span>{t.customerName} · {t.assignee}</span>
                        <span className="font-medium text-stone-700">{t.status}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ticket Detail & Thread */}
            <div className="xl:col-span-7">
              {selectedTicket ? (
                <div className="bg-white border border-stone-200 rounded-lg p-5 space-y-4">
                  <div className="flex items-start justify-between gap-3 border-b border-stone-200 pb-3.5">
                    <div>
                      <div className="text-xs text-stone-500 flex flex-wrap items-center gap-1.5">
                        <span className="font-mono font-semibold text-emerald-800">{selectedTicket.id}</span>
                        <span>·</span>
                        <span>{selectedTicket.customerName}</span>
                        <span>({selectedTicket.customerEmail})</span>
                      </div>
                      <h2 className="text-lg font-bold text-stone-900 mt-1">{selectedTicket.subject}</h2>
                    </div>
                    <button onClick={() => handleDelete(selectedTicket.id)} className="text-xs text-red-700 hover:text-red-900 inline-flex items-center gap-1">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>

                  <div className="text-sm text-stone-800 bg-[#F6F5F0] p-3.5 rounded-md border border-stone-200">
                    {selectedTicket.description || 'No description provided.'}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                    <div>
                      <label className="text-stone-500 block mb-1 font-medium">Status</label>
                      <select value={selectedTicket.status} onChange={(e) => handleUpdate(selectedTicket.id, { status: e.target.value })} className="w-full px-2.5 py-1.5 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900">
                        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-stone-500 block mb-1 font-medium">Priority</label>
                      <select value={selectedTicket.priority} onChange={(e) => handleUpdate(selectedTicket.id, { priority: e.target.value })} className="w-full px-2.5 py-1.5 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900">
                        {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-stone-500 block mb-1 font-medium">Assignee</label>
                      <select value={selectedTicket.assignee} onChange={(e) => handleUpdate(selectedTicket.id, { assignee: e.target.value })} className="w-full px-2.5 py-1.5 rounded-md bg-[#F6F5F0] border border-stone-300 text-stone-900">
                        {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-md p-2 flex flex-col justify-center">
                      <span className="text-[10px] text-amber-800 font-medium inline-flex items-center gap-1"><Clock className="w-3 h-3" /> SLA Window</span>
                      <span className="text-xs font-bold text-amber-950">{selectedTicket.slaHours}h · {selectedTicket.sentiment}</span>
                    </div>
                  </div>

                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-lg p-3.5 space-y-2">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="font-semibold text-emerald-950 inline-flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-emerald-800" /> Suggested Reply · {selectedTicket.kbTitle}
                      </span>
                      <button type="button" onClick={() => setReplyText(selectedTicket.suggestedReply)} className="px-2.5 py-1 rounded bg-emerald-800 hover:bg-emerald-900 text-[11px] font-semibold text-white">
                        Insert Draft
                      </button>
                    </div>
                    <p className="text-xs text-stone-700 leading-relaxed">{selectedTicket.suggestedReply}</p>
                  </div>

                  <div className="space-y-2.5 border-t border-stone-200 pt-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
                      Conversation ({selectedTicket.replies?.length || 0})
                    </h3>
                    <div className="space-y-2 max-h-52 overflow-y-auto">
                      {(selectedTicket.replies || []).map((r) => (
                        <div key={r.id} className="p-3 rounded-md bg-[#F6F5F0] border border-stone-200 text-xs space-y-1">
                          <div className="flex justify-between text-stone-500">
                            <strong className="text-stone-900">{r.author}</strong>
                            <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                          </div>
                          <p className="text-stone-800">{r.text}</p>
                        </div>
                      ))}
                    </div>
                    <form onSubmit={handleReply} className="flex gap-2">
                      <input
                        type="text"
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        placeholder={`Write reply as ${currentAgent}...`}
                        className="flex-1 px-3 py-2 rounded-md bg-[#F6F5F0] border border-stone-300 text-xs text-stone-900"
                      />
                      <button type="submit" className="px-3.5 py-2 rounded-md bg-emerald-800 hover:bg-emerald-900 text-xs font-semibold text-white inline-flex items-center gap-1">
                        <Send className="w-3.5 h-3.5" /> Send
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div className="bg-white border border-stone-200 rounded-lg p-8 text-center text-xs text-stone-500">
                  Select a ticket from the queue.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
