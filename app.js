/* app.js
   - SADARI interactive steps (same UX)
   - Accordion behavior
   - Q&A form + realtime basic integration (WebSocket) with fallback POST
   NOTE: Replace WS_URL and REST endpoints with your real backend.
*/

(() => {
  /* ========= SADARI ========= */
  const steps = [
    { title: 'Observasi Visual', body: 'Berdiri di depan cermin dengan lengan lurus. Amati ukuran, bentuk, dan kulit payudara. Perhatikan jika ada lekukan, kemerahan, atau perubahan warna.' },
    { title: 'Perubahan Saat Mengangkat Lengan', body: 'Angkat kedua lengan. Perhatikan apakah ada perbedaan, lekukan, atau tarikan pada kulit payudara.' },
    { title: 'Periksa Puting', body: 'Periksa apakah ada pembalikan puting baru, keluarnya cairan, atau perubahan tekstur.' },
    { title: 'Pemeriksaan Dengan Sentuhan (Berbaring)', body: 'Berbaringlah, tundukkan bahu Anda dengan sedikit tumpukan bantal. Gunakan bantalan jari untuk memeriksa seluruh jaringan payudara secara melingkar dari puting ke luar.' },
    { title: 'Periksa Ketiak & Catatan', body: 'Periksa area ketiak untuk benjolan. Catat temuan dan jika ada perubahan, konsultasikan ke dokter sesegera mungkin.' }
  ];

  const contentEl = document.getElementById('step-content');
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const progressBar = document.getElementById('progress-bar');
  const progressText = document.getElementById('progress-text');
  const helpBtn = document.getElementById('help-btn');

  let current = 0;
  function renderStep(idx){
    const s = steps[idx];
    contentEl.innerHTML = `<h4 style="margin:0 0 6px 0;font-family:'Playfair Display', serif;">${s.title}</h4><p style="margin:0;color:var(--muted)">${s.body}</p>`;
    prevBtn.disabled = idx === 0;
    nextBtn.textContent = (idx === steps.length - 1) ? 'Selesai' : 'Berikutnya ⇨';
    const pct = Math.round(((idx+1) / steps.length) * 100);
    progressBar.style.width = pct + '%';
    progressText.textContent = `Langkah ${idx+1} dari ${steps.length}`;
    contentEl.focus();
  }
  renderStep(current);
  prevBtn.addEventListener('click', () => { if (current > 0) { current--; renderStep(current); }});
  nextBtn.addEventListener('click', () => {
    if (current < steps.length - 1) { current++; renderStep(current); }
    else {
      contentEl.innerHTML = `<h4 style="margin:0 0 6px 0;font-family:'Playfair Display', serif;">Selesai</h4><p style="margin:0;color:var(--muted)">Terima kasih. Jika Anda menemukan perubahan yang mengkhawatirkan, catat dan segera konsultasikan ke tenaga medis.</p>`;
      prevBtn.disabled = false;
      nextBtn.textContent = 'Ulangi';
      current = steps.length;
    }
  });
  nextBtn.addEventListener('click', () => { if (current === steps.length) { current = 0; renderStep(current); }});
  helpBtn.addEventListener('click', () => {
    alert('Tip: Lakukan SADARI setiap bulan, idealnya beberapa hari setelah menstruasi selesai. Jika pasc-menopause, pilih tanggal yang konsisten setiap bulan.');
  });
  document.addEventListener('keydown', (e) => { if (e.key === 'ArrowLeft') prevBtn.click(); if (e.key === 'ArrowRight') nextBtn.click(); });

  /* ========= Accordion ========= */
  document.querySelectorAll('.accordion-item').forEach(item => {
    const btn = item.querySelector('.accordion-header');
    const body = item.querySelector('.accordion-body');
    function close(){ btn.setAttribute('aria-expanded','false'); body.style.maxHeight = null; body.hidden = true; body.classList.remove('open'); btn.querySelector('span').textContent = '+'; }
    function open(){ btn.setAttribute('aria-expanded','true'); body.hidden = false; body.classList.add('open'); requestAnimationFrame(()=>body.style.maxHeight = body.scrollHeight+'px'); btn.querySelector('span').textContent = '−'; }
    close();
    btn.addEventListener('click', () => {
      const expanded = btn.getAttribute('aria-expanded') === 'true';
      if (expanded) close();
      else {
        document.querySelectorAll('.accordion-item').forEach(sib => {
          if (sib !== item) {
            const h = sib.querySelector('.accordion-header');
            const b = sib.querySelector('.accordion-body');
            if (h && b) { h.setAttribute('aria-expanded','false'); b.hidden = true; b.style.maxHeight = null; b.classList.remove('open'); h.querySelector('span').textContent = '+'; }
          }
        });
        open();
      }
    });
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); btn.click(); }});
  });
  window.addEventListener('resize', () => {
    document.querySelectorAll('.accordion-body.open').forEach(b => b.style.maxHeight = b.scrollHeight + 'px');
  });

  /* ========= Q&A: WebSocket + fallback to REST ========= */
  const WS_URL = (location.hostname === 'localhost') ? 'ws://localhost:3000' : 'wss://example.com'; // <-- replace with your server
  const REST_ENDPOINT = '/api/tanya'; // fallback POST endpoint (implement on server)
  const connectBtn = document.getElementById('connect-btn');
  const qaForm = document.getElementById('qa-form');
  const chatWindow = document.getElementById('chat-window');
  const doctorDot = document.getElementById('doctor-dot');
  const doctorText = document.getElementById('doctor-text');

  let socket = null;
  let doctorConnected = false;
  let reconnectTimer = null;
  let clientId = `patient-${Math.random().toString(36).slice(2,9)}`;

  function setDoctorStatus(online){
    doctorConnected = !!online;
    doctorDot.className = online ? 'dot online' : 'dot offline';
    doctorText.textContent = online ? 'Dokter online' : 'Dokter tidak tersedia saat ini. Anda bisa mengirim pesan; dokter akan menanggapi nanti.';
  }

  function appendMessage({who='doctor', text='', name=''}) {
    const wrapper = document.createElement('div');
    wrapper.className = `msg ${who === 'patient' ? 'patient' : 'doctor'}`;
    const bubble = document.createElement('div');
    bubble.className = 'bubble';
    bubble.textContent = text;
    if (who === 'doctor' && name) {
      const meta = document.createElement('div');
      meta.style.fontSize = '0.78rem';
      meta.style.opacity = '0.85';
      meta.style.marginBottom = '6px';
      meta.textContent = name;
      wrapper.appendChild(meta);
    }
    wrapper.appendChild(bubble);
    chatWindow.appendChild(wrapper);
    chatWindow.scrollTop = chatWindow.scrollHeight;
  }

  function connectSocket() {
    if (socket) return;
    try {
      socket = new WebSocket(WS_URL + '/?role=patient&id=' + clientId);
    } catch (e) {
      console.warn('WS not available', e);
      socket = null;
      setDoctorStatus(false);
      return;
    }

    socket.addEventListener('open', () => {
      console.log('WS open');
      setDoctorStatus(false); // until server says doctor online
      // identify
      socket.send(JSON.stringify({type:'identify', role:'patient', id: clientId}));
    });

    socket.addEventListener('message', (ev) => {
      let data = {};
      try { data = JSON.parse(ev.data); } catch(e){ console.warn('invalid data', ev.data); return; }
      // message types: doctor-status, message, ack
      if (data.type === 'doctor-status') {
        setDoctorStatus(data.online);
      } else if (data.type === 'message') {
        appendMessage({who:'doctor', text:data.text, name: data.fromName || 'Dokter'});
      } else if (data.type === 'system') {
        appendMessage({who:'doctor', text:data.text || '[Info sistem]'});
      }
    });

    socket.addEventListener('close', () => {
      console.log('WS closed');
      socket = null;
      setDoctorStatus(false);
      // try to reconnect with backoff
      if (!reconnectTimer) {
        reconnectTimer = setTimeout(() => { reconnectTimer = null; connectSocket(); }, 3000);
      }
    });

    socket.addEventListener('error', (err) => {
      console.warn('WS error', err);
      // close socket if error
      try { socket.close(); } catch(e){}
    });
  }

  // initial attempt
  setTimeout(connectSocket, 600); // small delay to avoid race in some hosts

  connectBtn.addEventListener('click', (e) => {
    e.preventDefault();
    if (!socket) connectSocket();
    else {
      appendMessage({who:'doctor', text:'Sedang terhubung...' });
    }
  });

  // Form submit: send via WS if available, otherwise POST fallback
  qaForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = (document.getElementById('name').value || '').trim();
    const question = (document.getElementById('question').value || '').trim();
    if (!question) return;

    appendMessage({who:'patient', text: question, name});

    const payload = { clientId, name, question, timestamp: new Date().toISOString() };

    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify({ type:'message', payload }));
    } else {
      // fallback: POST to REST endpoint
      try {
        const res = await fetch(REST_ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Network response was not ok');
        appendMessage({who:'doctor', text: 'Pesan terkirim. Dokter akan menanggapi melalui sistem ini atau melalui kontak yang tersedia.'});
      } catch (err) {
        appendMessage({who:'doctor', text: 'Gagal mengirim pesan. Silakan coba lagi nanti.'});
      }
    }

    qaForm.reset();
  });

  // Small client-side sanitization (display only)
  // Incoming messages are treated as textContent above (no innerHTML), preventing HTML injection.

  /* ========= Helpful warnings for developers (console) ========= */
  console.log('QA client initialized. WS target:', WS_URL, 'REST fallback:', REST_ENDPOINT);
  console.log('Important: Implement backend endpoints and authentication for real doctor integration. Do not send PHI over unencrypted channels.');

})();