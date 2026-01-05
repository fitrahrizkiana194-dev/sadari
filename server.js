/**
 * server.js — minimal example backend using Express + Socket.io
 * Purpose: demo how patient -> server -> doctor routing could work.
 *
 * WARNING:
 * - This is a minimal demo. For production you MUST implement:
 *   - Authentication & authorization (who is a doctor, who is patient)
 *   - Encryption (TLS / HTTPS / WSS)
 *   - Persistent storage (DB) for messages / audit
 *   - Compliance with local data protection / medical privacy laws
 *
 * Install:
 *   npm init -y
 *   npm install express socket.io cors
 * Run:
 *   node server.js
 *
 * Endpoints:
 *  - WebSocket at ws://localhost:3000  (Socket.io handles upgrade)
 *  - POST /api/tanya  fallback to store/send message
 *  - Simple doctor page at /doctor to simulate doctor answering in browser
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// In-memory storage (demo only)
const messages = []; // { clientId, name, question, timestamp, status }
let doctors = new Set(); // socket ids for doctor clients

// Serve static doctor demo page
app.get('/doctor', (req, res) => {
  res.sendFile(path.join(__dirname, 'doctor-demo.html'));
});

// REST fallback to receive question
app.post('/api/tanya', (req, res) => {
  const { clientId, name, question, timestamp } = req.body || {};
  if (!clientId || !question) return res.status(400).json({ error: 'clientId & question required' });
  messages.push({ clientId, name, question, timestamp: timestamp || new Date().toISOString(), status: 'pending' });
  // Notify connected doctors
  io.emit('tanya-received', { clientId, name, question, timestamp });
  return res.status(201).json({ status: 'accepted' });
});

// Simple socket handling (basic routing)
io.on('connection', (socket) => {
  console.log('socket connected', socket.id);
  socket.on('message', (raw) => {
    try {
      const data = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (data.type === 'identify') {
        socket.role = data.role;
        socket.clientId = data.id;
        if (socket.role === 'doctor') {
          doctors.add(socket.id);
          // notify all patients that doctor is available
          io.emit('doctor-status', JSON.stringify({ type: 'doctor-status', online: true }));
        }
      } else if (data.type === 'message' && socket.role === 'doctor') {
        // doctor sending message to a patient
        const { toClientId, text, fromName } = data.payload || {};
        // find sockets of patient(s) and forward
        for (let [id, s] of io.sockets.sockets) {
          if (s.clientId === toClientId) {
            s.send(JSON.stringify({ type: 'message', text, fromName: fromName || 'Dokter' }));
          }
        }
      } else if (data.type === 'message' && socket.role === 'patient') {
        // patient message -> forward to doctors (if any)
        const payload = data.payload;
        messages.push({ clientId: payload.clientId, name: payload.name, question: payload.question, timestamp: payload.timestamp, status: 'sent' });
        // Notify doctors in dashboard
        io.emit('tanya-received', JSON.stringify({ type:'tanya', payload }));
        // If at least one doctor connected, send an acknowledgement back to patient
        const ack = { type:'system', text: doctors.size ? 'Pesan terkirim ke dokter. Mohon tunggu respons.' : 'Tidak ada dokter online. Pesan disimpan dan akan ditanggapi.' };
        socket.send(JSON.stringify(ack));
      }
    } catch (err) {
      console.warn('invalid message', err);
    }
  });

  socket.on('disconnect', () => {
    if (socket.role === 'doctor') {
      doctors.delete(socket.id);
      // if no doctors left, broadcast offline
      if (doctors.size === 0) {
        io.emit('doctor-status', JSON.stringify({ type: 'doctor-status', online: false }));
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server listening on', PORT));