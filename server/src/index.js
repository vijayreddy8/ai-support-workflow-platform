import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { listTickets, resetAndReadTickets, createSupportTicket, updateSupportTicket, addTicketReply, deleteSupportTicket } from './db/store.js';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 5003;
const clients = new Set();

function broadcastTickets(tickets) {
  const payload = `data: ${JSON.stringify({ tickets, ts: Date.now() })}\n\n`;
  for (const res of clients) res.write(payload);
}

app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'healthy', service: 'AI Customer Support & Workflow Automation API', clientsConnected: clients.size, timestamp: new Date().toISOString() }));

app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();
  clients.add(res);
  res.write(`data: ${JSON.stringify({ tickets: listTickets(), ts: Date.now() })}\n\n`);
  req.on('close', () => clients.delete(res));
});

app.get('/api/tickets', (req, res) => res.json({ tickets: listTickets() }));
app.post('/api/tickets/reset', (req, res) => { const tickets = resetAndReadTickets(); broadcastTickets(tickets); res.json({ tickets }); });
app.post('/api/tickets', (req, res) => { try { const ticket = createSupportTicket(req.body); broadcastTickets(listTickets()); res.status(201).json({ ticket }); } catch (err) { res.status(400).json({ error: err.message }); } });
app.patch('/api/tickets/:id', (req, res) => { try { const ticket = updateSupportTicket(req.params.id, req.body); broadcastTickets(listTickets()); res.json({ ticket }); } catch (err) { res.status(400).json({ error: err.message }); } });
app.post('/api/tickets/:id/replies', (req, res) => { try { const result = addTicketReply(req.params.id, req.body.author, req.body.text); broadcastTickets(listTickets()); res.status(201).json(result); } catch (err) { res.status(400).json({ error: err.message }); } });
app.delete('/api/tickets/:id', (req, res) => { try { const tickets = deleteSupportTicket(req.params.id); broadcastTickets(tickets); res.json({ tickets }); } catch (err) { res.status(400).json({ error: err.message }); } });

app.listen(PORT, () => console.log(`AI Support Workflow Backend running on http://localhost:${PORT}`));
