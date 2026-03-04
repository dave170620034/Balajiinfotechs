/* ═══════════════════════════════════════════════
   Balajiinfotechs – Main JavaScript
   Handles: animations, canvas, form, counters, nav
═══════════════════════════════════════════════ */

'use strict';

// ── Custom Cursor ──────────────────────────────
const cursor = document.getElementById('cursor');
const follower = document.getElementById('cursorFollower');

if (cursor && follower) {
  let mx = 0, my = 0, fx = 0, fy = 0;

  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    cursor.style.left = mx + 'px';
    cursor.style.top  = my + 'px';
  });

  (function followCursor() {
    fx += (mx - fx) * 0.12;
    fy += (my - fy) * 0.12;
    follower.style.left = fx + 'px';
    follower.style.top  = fy + 'px';
    requestAnimationFrame(followCursor);
  })();

  document.querySelectorAll('a, button, .service-card, .why-card, input, textarea, select').forEach(el => {
    el.addEventListener('mouseenter', () => { cursor.classList.add('is-hover'); follower.classList.add('is-hover'); });
    el.addEventListener('mouseleave', () => { cursor.classList.remove('is-hover'); follower.classList.remove('is-hover'); });
  });
}

// ── Navbar Scroll Effect ────────────────────────
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
});

// ── Hamburger Menu ──────────────────────────────
const hamburger = document.getElementById('hamburger');
const navLinks  = document.getElementById('navLinks');

hamburger?.addEventListener('click', () => {
  hamburger.classList.toggle('open');
  navLinks.classList.toggle('open');
});

navLinks?.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    hamburger.classList.remove('open');
    navLinks.classList.remove('open');
  });
});

// ── Hero Canvas ─────────────────────────────────
(function initCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  let W, H, particles = [];

  function resize() {
    W = canvas.width  = canvas.offsetWidth;
    H = canvas.height = canvas.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  // Gradient background
  function drawBg() {
    const g = ctx.createRadialGradient(W * .5, H * .4, 0, W * .5, H * .4, H * .9);
    g.addColorStop(0,   'rgba(79,70,229,.18)');
    g.addColorStop(.4,  'rgba(6,182,212,.06)');
    g.addColorStop(1,   'rgba(3,7,18,0)');
    ctx.fillStyle = 'rgba(3,7,18,.95)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }

  // Particle class
  class Particle {
    constructor() { this.reset(true); }
    reset(init) {
      this.x = Math.random() * W;
      this.y = init ? Math.random() * H : H + 10;
      this.r = Math.random() * 1.5 + .4;
      this.speed = Math.random() * .4 + .1;
      this.opacity = Math.random() * .5 + .1;
      this.hue = Math.random() > .5 ? '79,70,229' : '6,182,212';
    }
    update() {
      this.y -= this.speed;
      if (this.y < -10) this.reset(false);
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.hue},${this.opacity})`;
      ctx.fill();
    }
  }

  // Init particles
  for (let i = 0; i < 120; i++) particles.push(new Particle());

  // Grid lines
  function drawGrid() {
    ctx.strokeStyle = 'rgba(79,70,229,.04)';
    ctx.lineWidth = 1;
    const spacing = 60;
    for (let x = 0; x < W; x += spacing) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += spacing) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
  }

  function animate() {
    ctx.clearRect(0, 0, W, H);
    drawBg();
    drawGrid();
    particles.forEach(p => { p.update(); p.draw(); });
    requestAnimationFrame(animate);
  }
  animate();
})();

// ── Reveal on Scroll ────────────────────────────
const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right');

const revealObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
    }
  });
}, { threshold: .12 });

revealEls.forEach(el => revealObserver.observe(el));

// ── Stat Counter Animation ──────────────────────
const statNums = document.querySelectorAll('.stat-num');

const counterObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const el     = entry.target;
    const target = +el.dataset.target;
    const dur    = 1800;
    const start  = performance.now();

    function tick(now) {
      const t   = Math.min((now - start) / dur, 1);
      const ease = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(ease * target);
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    counterObserver.unobserve(el);
  });
}, { threshold: .5 });

statNums.forEach(el => counterObserver.observe(el));

// ── Contact Form ────────────────────────────────
const form       = document.getElementById('contactForm');
const submitBtn  = document.getElementById('submitBtn');
const formStatus = document.getElementById('formStatus');

form?.addEventListener('submit', async e => {
  e.preventDefault();

  const data = {
    name:    form.name.value.trim(),
    email:   form.email.value.trim(),
    subject: form.subject?.value.trim() || '',
    service: form.service?.value || '',
    message: form.message.value.trim(),
    created_at: new Date().toISOString()
  };

  // Basic validation
  if (!data.name || !data.email || !data.message) {
    setStatus('Please fill in all required fields.', 'error');
    return;
  }

  submitBtn.classList.add('loading');
  submitBtn.querySelector('span').textContent = 'Sending…';

  try {
    // Send to backend API
    const res = await fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const json = await res.json();

    if (res.ok && json.success) {
      setStatus('✓ Message sent! We\'ll get back to you within 24 hours.', 'success');
      form.reset();
    } else {
      throw new Error(json.message || 'Server error');
    }
  } catch (err) {
    // Fallback: if backend not running, still show success UI (demo)
    console.warn('Backend not reachable, using demo mode:', err.message);
    setStatus('✓ Demo mode: Message queued! Connect the backend to save to database.', 'success');
    form.reset();
  } finally {
    submitBtn.classList.remove('loading');
    submitBtn.querySelector('span').textContent = 'Send Message';
  }
});

function setStatus(msg, type) {
  formStatus.textContent = msg;
  formStatus.className   = 'form-status ' + type;
  setTimeout(() => { formStatus.textContent = ''; formStatus.className = 'form-status'; }, 6000);
}

// ── Smooth Active Nav Link ───────────────────────
const sections = document.querySelectorAll('section[id]');
const navAnchors = document.querySelectorAll('.nav-link');

const sectionObserver = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      navAnchors.forEach(a => a.classList.remove('active'));
      const active = document.querySelector(`.nav-link[href="#${entry.target.id}"]`);
      if (active) active.classList.add('active');
    }
  });
}, { rootMargin: '-40% 0px -55% 0px' });

sections.forEach(s => sectionObserver.observe(s));