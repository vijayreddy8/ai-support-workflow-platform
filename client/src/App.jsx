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
import { Backdrop, Splash, Spot, Ring, Count, stagger, initialsOf, useNow } from './premium';

const STATUSES = ['Open', 'In Progress', 'Resolved'];
const PRIORITIES = ['Urgent', 'High', 'Medium', 'Low'];
const AGENTS = ['Sasidhar', 'Vijaysimha'];

const PRIORITY_BADGE = {
  Urgent: 'pri-Urgent',
  High: 'pri-High',
  Medium: 'pri-Medium',
  Low: 'pri-Low',
};

const SLA_COLOR = { ok: '#34d399', warn: '#fbbf24', breach: '#fb7185', done: '#34d399' };

const fmtSpan = (ms) => {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}h ${m % 60}m` : `${m}m`;
};

// Presentation-only: derives a live SLA gauge from existing createdAt / slaDeadline / status fields.
const slaInfo = (t, now) => {
  const due = Date.parse(t.slaDeadline);
  const start = Date.parse(t.createdAt);
  if (t.status === 'Resolved') return { state: 'done', remainingPct: 100, label: 'Resolved' };
  if (!Number.isFinite(due) || !Number.isFinite(start) || due <= start) return null;
  const left = due - now;
  const remainingPct = Math.max(0, Math.min(100, (left / (due - start)) * 100));
  if (left <= 0) return { state: 'breach', remainingPct: 0, label: `Breached ${fmtSpan(-left)} ago` };
  return { state: remainingPct < 25 ? 'warn' : 'ok', remainingPct, label: `${fmtSpan(left)} left` };
};

export default function App() {
  const now = useNow(30000);
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


  const resolutionPct = tickets.length ? Math.round((resolvedCount / tickets.length) * 100) : 0;
  const selSla = selectedTicket ? slaInfo(selectedTicket, now) : null;

  return (
    <>
      <Backdrop />
      <Splash icon={<Bot />} title="Helpdesk & Workflow Desk" subtitle="Automated triage · SLA timer · KB response drafts · Live stream" />
      <div className="app-shell">
        {/* Top Bar */}
        <header className="hdr">
          <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="brand-mark"><Bot className="w-6 h-6" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-extrabold">Helpdesk <span className="grad-text">& Workflow Desk</span></h1>
                <p className="text-xs sm:text-sm mut mt-0.5">Automated triage · SLA timer · KB response drafts · Live stream</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <select value={currentAgent} onChange={(e) => setCurrentAgent(e.target.value)} className="field field-sm" style={{ width: 'auto', fontWeight: 600 }}>
                {AGENTS.map((a) => <option key={a} value={a}>Desk agent: {a}</option>)}
              </select>

              <button onClick={handleReset} className="btn btn-ghost"><RotateCcw className="w-4 h-4" /> Reset</button>

              <span className="chip" style={backendConnected ? { color: '#6ee7b7', borderColor: 'rgba(16,185,129,.4)', background: 'rgba(16,185,129,.1)', padding: '.6rem 1rem', fontSize: '.8rem' } : { color: 'var(--mut)', padding: '.6rem 1rem', fontSize: '.8rem' }}>
                {backendConnected && <span className="live-dot" />}<Server className="w-4 h-4" />{backendConnected ? 'API Connected' : 'Offline Cache'}
              </span>

              <button onClick={() => setShowCreate((v) => !v)} className="btn btn-primary"><Plus className="w-4 h-4 stroke-[2.5]" /> New Ticket</button>
            </div>
          </div>
        </header>

        <div className="max-w-[1380px] mx-auto px-5 sm:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Rail: Queue Filters & Summary */}
          <aside className="lg:col-span-3 space-y-5">
            <Spot className="glass rail-card rise space-y-1.5" style={stagger(0, 90, 150)}>
              <div className="eyebrow mb-2.5">Queue Status</div>
              {['All', ...STATUSES].map((st) => {
                const count = st === 'All' ? tickets.length : tickets.filter((x) => x.status === st).length;
                const active = statusFilter === st;
                return (
                  <button key={st} onClick={() => setStatusFilter(st)} className={`queue-btn ${active ? 'on' : ''}`}>
                    <span>{st}</span>
                    <span className="cnt mono">{count}</span>
                  </button>
                );
              })}
            </Spot>

            <Spot className="glass rail-card rise" style={stagger(1, 90, 150)}>
              <div className="flex items-center justify-between mb-2">
                <div className="eyebrow">Live SLA Snapshot</div>
                <span className="live-dot" />
              </div>
              <div className="flex items-center gap-4 py-3" style={{ borderBottom: '1px solid var(--line)' }}>
                <Ring value={resolutionPct} size={74} stroke={8} colors={['#10b981', '#34d399']}><span className="text-sm font-bold mono">{resolutionPct}%</span></Ring>
                <div className="text-xs mut leading-relaxed">Resolution rate across all tickets in the queue</div>
              </div>
              <div className="snap-row">
                <span className="mut inline-flex items-center gap-2"><Inbox className="w-4 h-4" /> Active tickets</span>
                <span className="snap-num"><Count value={openCount} /></span>
              </div>
              <div className="snap-row">
                <span className="mut inline-flex items-center gap-2"><AlertTriangle className="w-4 h-4" style={{ color: '#fb7185' }} /> Urgent open</span>
                <span className="snap-num" style={{ color: '#fb7185' }}><Count value={urgentCount} /></span>
              </div>
              <div className="snap-row">
                <span className="mut inline-flex items-center gap-2"><CheckCircle2 className="w-4 h-4" style={{ color: 'var(--g2)' }} /> Resolved</span>
                <span className="snap-num" style={{ color: 'var(--g2)' }}><Count value={resolvedCount} /></span>
              </div>
            </Spot>
          </aside>

          {/* Main Workspace */}
          <section className="lg:col-span-9 space-y-5">
            {showCreate && (
              <form onSubmit={handleCreate} className="glass aura modal rounded-3xl p-6 space-y-4" style={{ borderRadius: 24 }}>
                <div className="flex items-center justify-between">
                  <h2 className="text-base sm:text-lg font-bold flex items-center gap-2"><Sparkles className="w-5 h-5 ai-spark" /> Log Customer Ticket (Auto-Triage Enabled)</h2>
                  <button type="button" onClick={() => setShowCreate(false)} className="btn btn-ghost btn-sm">Cancel</button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Customer name" className="field" />
                  <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="Customer email" className="field" />
                  <select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="field">
                    {AGENTS.map((a) => <option key={a} value={a}>Owner: {a}</option>)}
                  </select>
                </div>
                <input type="text" required value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject (e.g., 502 on production webhook or GST invoice request)..." className="field" />
                <textarea rows={2} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details, error logs, or context..." className="field" />
                <div className="flex justify-end">
                  <button type="submit" className="btn btn-primary">Submit Ticket</button>
                </div>
              </form>
            )}

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
              {/* Ticket List */}
              <div className="xl:col-span-5 space-y-4">
                <div className="relative rise" style={stagger(0, 80, 350)}>
                  <Search className="w-4 h-4 mut absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter by subject, customer, or topic..." className="field" style={{ paddingLeft: '2.6rem' }} />
                </div>

                <div className="space-y-3">
                  {visibleTickets.map((t, i) => {
                    const isSel = selectedTicket?.id === t.id;
                    const sla = slaInfo(t, now);
                    const isUrgent = t.priority === 'Urgent' && t.status !== 'Resolved';
                    return (
                      <Spot as="button" key={t.id} onClick={() => setSelectedId(t.id)} className={`glass ticket rise space-y-2 ${isSel ? 'is-active aura' : ''} ${isUrgent ? 'urgent' : ''}`} style={stagger(i, 70, 450)}>
                        <div className="flex items-center justify-between gap-2">
                          <span className={`pri pri-${t.priority in PRIORITY_BADGE ? t.priority : 'Medium'}`}>{t.priority}</span>
                          <span className="text-xs font-semibold" style={{ color: 'var(--g2)' }}>{t.category}</span>
                        </div>
                        <div className="text-[15px] font-semibold line-clamp-1" style={{ fontFamily: 'var(--display)' }}>{t.subject}</div>
                        <div className="flex items-center justify-between text-xs mut">
                          <span>{t.customerName} · {t.assignee}</span>
                          <span className="font-semibold" style={{ color: 'var(--ink)' }}>{t.status}</span>
                        </div>
                        {sla && (
                          <div className="sla-line"><i className="bar-grow" style={{ width: `${sla.state === 'done' ? 100 : sla.remainingPct}%`, background: SLA_COLOR[sla.state] }} /></div>
                        )}
                      </Spot>
                    );
                  })}
                </div>
              </div>

              {/* Ticket Detail & Thread */}
              <div className="xl:col-span-7">
                {selectedTicket ? (
                  <div key={selectedTicket.id} className="glass aura detail swap space-y-5">
                    <div className="flex items-start justify-between gap-3 pb-4" style={{ borderBottom: '1px solid var(--line)' }}>
                      <div className="min-w-0">
                        <div className="text-xs mut flex flex-wrap items-center gap-1.5">
                          <span className="mono font-bold" style={{ color: 'var(--g2)' }}>{selectedTicket.id}</span>
                          <span>·</span>
                          <span>{selectedTicket.customerName}</span>
                          <span>({selectedTicket.customerEmail})</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-bold mt-1.5 break-words">{selectedTicket.subject}</h2>
                      </div>
                      <button onClick={() => handleDelete(selectedTicket.id)} className="btn btn-danger btn-sm shrink-0">
                        <Trash2 className="w-3.5 h-3.5" /> Delete
                      </button>
                    </div>

                    <div className="desc-box text-sm">
                      {selectedTicket.description || 'No description provided.'}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="eyebrow block mb-1.5">Status</label>
                        <select value={selectedTicket.status} onChange={(e) => handleUpdate(selectedTicket.id, { status: e.target.value })} className="field field-sm">
                          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="eyebrow block mb-1.5">Priority</label>
                        <select value={selectedTicket.priority} onChange={(e) => handleUpdate(selectedTicket.id, { priority: e.target.value })} className="field field-sm">
                          {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="eyebrow block mb-1.5">Assignee</label>
                        <select value={selectedTicket.assignee} onChange={(e) => handleUpdate(selectedTicket.id, { assignee: e.target.value })} className="field field-sm">
                          {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                      <div className={`sla-tile ${selSla ? (selSla.state === 'breach' ? 'breach' : selSla.state === 'done' ? 'done' : '') : ''}`}>
                        {selSla && (
                          <Ring value={selSla.state === 'done' ? 100 : selSla.remainingPct} size={44} stroke={5} colors={[SLA_COLOR[selSla.state], SLA_COLOR[selSla.state]]}>
                            <Clock className="w-3.5 h-3.5" style={{ color: SLA_COLOR[selSla.state] }} />
                          </Ring>
                        )}
                        <div className="min-w-0">
                          <span className="text-[10px] font-semibold inline-flex items-center gap-1 mut">{!selSla && <Clock className="w-3 h-3" />} SLA Window</span>
                          <div className="text-xs font-bold">{selectedTicket.slaHours}h · {selectedTicket.sentiment}</div>
                          {selSla && <div className="text-[10px] font-semibold mt-0.5" style={{ color: SLA_COLOR[selSla.state] }}>{selSla.label}</div>}
                        </div>
                      </div>
                    </div>

                    <div className="ai-card space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs relative z-[1]">
                        <span className="font-semibold inline-flex items-center gap-1.5" style={{ color: '#a7f3d0' }}>
                          <Sparkles className="w-4 h-4 ai-spark" /> Suggested Reply · {selectedTicket.kbTitle}
                        </span>
                        <button type="button" onClick={() => setReplyText(selectedTicket.suggestedReply)} className="btn btn-primary btn-sm">
                          Insert Draft
                        </button>
                      </div>
                      <p className="text-sm leading-relaxed relative z-[1]" style={{ color: '#d6efe2' }}>{selectedTicket.suggestedReply}</p>
                    </div>

                    <div className="space-y-3 pt-4" style={{ borderTop: '1px solid var(--line)' }}>
                      <h3 className="eyebrow">
                        Conversation ({selectedTicket.replies?.length || 0})
                      </h3>
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {(selectedTicket.replies || []).map((r, ri) => (
                          <div key={r.id} className={`msg slide-left ${r.author === currentAgent ? 'mine' : ''}`} style={stagger(ri, 80, 150)}>
                            <span className="avatar" style={{ width: 32, height: 32, borderRadius: 11, fontSize: '.68rem' }}>{initialsOf(r.author)}</span>
                            <div className="bubble">
                              <div className="bubble-meta">
                                <strong style={{ color: 'var(--ink)' }}>{r.author}</strong>
                                <span>{new Date(r.createdAt).toLocaleTimeString()}</span>
                              </div>
                              <p>{r.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      <form onSubmit={handleReply} className="flex gap-2.5">
                        <input type="text" value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={`Write reply as ${currentAgent}...`} className="field flex-1" />
                        <button type="submit" className="btn btn-primary send-btn">
                          <Send className="w-4 h-4" /> Send
                        </button>
                      </form>
                    </div>
                  </div>
                ) : (
                  <div className="glass rounded-3xl p-10 text-center text-sm mut rise">
                    Select a ticket from the queue.
                  </div>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
