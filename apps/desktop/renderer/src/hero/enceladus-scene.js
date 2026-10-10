// Copied from design/enceladus-scene.js (the design board loads that file as a plain script,
// so it can't carry an export). Keep the two in sync when the scene changes.
// Enceladus scene — an icy moon cracked into plates like dried desert mud. Light from
// the ocean beneath glows through the cracks in slow waves; while the agent is working,
// thin curtains of vapor rise from vents on the cracks around the pole.
//
// Everything heavy (shading, crack network, glow) is rendered once at start; each
// frame draws 2 glow images, ~30 beams and a few hundred particles.
//
// const s = new EnceladusScene(canvas, {
//   w, h, theme: 'dark' | 'light',
//   cx, cy, R,            // sphere center and radius in CSS px
//   plates: 110,          // number of plates over the whole moon (more = smaller plates)
//   tilt: 40,             // degrees the vent region is tipped toward the viewer
//   jets: 11,             // vents = jets × 3
//   speed: 95, rate: 3,   // vapor speed (px/s, scale with R) and emission per vent (/s)
//   active: true,         // working (vapor on, brighter) or resting
//   seed: 7,              // crack layout; same seed = same moon
//   transparent: false    // true: no sky, the page shows through (e.g. the app home screen)
// });
// s.setActive(true | false)
class EnceladusScene {
  constructor(cv, o) {
    this.cv = cv;
    this.o = o = Object.assign({ plates: 110, tilt: 40, jets: 11, speed: 95, rate: 3, active: true, seed: 7 }, o);
    const dpr = this.dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    cv.width = Math.round(o.w * dpr); cv.height = Math.round(o.h * dpr);
    cv.style.width = o.w + 'px'; cv.style.height = o.h + 'px';
    this.ctx = cv.getContext('2d');
    this.dark = o.theme !== 'light';
    const a = o.tilt * Math.PI / 180;
    this.P = [0, Math.sin(a), Math.cos(a)];
    this.L = this.dark ? norm([.82, .42, -.38]) : norm([.7, .45, .4]);
    this.render();
    // vapor vents: points that sit exactly on a crack, gathered around the pole
    this.sources = [];
    const e = [0, 0], rnd = mulberry32(o.seed + 5), P = this.P;
    for (let tries = 0; tries < 20000 && this.sources.length < o.jets * 3; tries++) {
      const q = norm([P[0] + (rnd() - .5) * .9, P[1] + (rnd() - .5) * .9, P[2] + (rnd() - .5) * .9]);
      const w = norm(this.warp(q[0], q[1], q[2]));
      this.edge(this.g1, w[0], w[1], w[2], e);
      if (e[0] < .002) this.sources.push({ q, acc: Math.random(), ph: Math.random() * 6.28, w: .35 + Math.random() * .6 });
    }
    this.target = this.k = o.active ? 1 : 0;
    this.ps = []; this.t = 0; this.last = 0; this.running = false;
    for (let i = 0; i < 200; i++) this.step(1 / 60);
    this.draw();
    this.reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (this.reduce) return;
    this.loop = this.loop.bind(this);
    if ('IntersectionObserver' in window) {
      this.io = new IntersectionObserver(es => es.forEach(e => e.isIntersecting ? this.play() : this.pause()));
      this.io.observe(cv);
    } else this.play();
  }
  setActive(on) { this.target = on ? 1 : 0; if (this.reduce) { this.k = this.target; this.draw(); } }
  play() { if (this.running) return; this.running = true; this.last = 0; this.raf = requestAnimationFrame(this.loop); }
  pause() { this.running = false; cancelAnimationFrame(this.raf); }
  destroy() { this.pause(); if (this.io) this.io.disconnect(); }

  proj(q, r) { const o = this.o; r = r || o.R; return [o.cx + r * q[0], o.cy - r * q[1]]; }
  // Plate centres placed ON the sphere (evenly spread, then jittered). Their Voronoi walls are
  // planes through the moon's centre, so every crack meets the surface straight on: always
  // continuous, never smeared, never a stray loop.
  sites(n, seed) {
    const rnd = mulberry32(seed), pts = [], golden = Math.PI * (3 - Math.sqrt(5)), jit = Math.sqrt(4 * Math.PI / n) * .3;
    for (let i = 0; i < n; i++) {
      const y = 1 - 2 * (i + .5) / n, r = Math.sqrt(1 - y * y), ph = i * golden;
      const p = [Math.cos(ph) * r, y, Math.sin(ph) * r], [u, v] = perp(p), a = rnd() * 6.283, d = jit * Math.sqrt(rnd());
      pts.push(norm([p[0] + d * (Math.cos(a) * u[0] + Math.sin(a) * v[0]), p[1] + d * (Math.cos(a) * u[1] + Math.sin(a) * v[1]), p[2] + d * (Math.cos(a) * u[2] + Math.sin(a) * v[2])]));
    }
    // each plate's 10 nearest neighbours: the only walls that can bound it
    const nbr = pts.map((a, i) => pts.map((b, j) => [j, dot(a, b)]).filter(x => x[0] !== i).sort((x, y) => y[1] - x[1]).slice(0, 10)
      .map(([j]) => { const b = pts[j], w = [a[0] - b[0], a[1] - b[1], a[2] - b[2]], l = Math.hypot(w[0], w[1], w[2]); return [w[0] / l, w[1] / l, w[2] / l]; }));
    return { pts, nbr, id: pts.map(() => rnd()) };
  }
  // distance from p (on the unit sphere) to the nearest crack, and the plate's id
  edge(g, px, py, pz, out) {
    let best = -2, i1 = 0;
    for (let i = 0; i < g.pts.length; i++) { const a = g.pts[i], d = a[0] * px + a[1] * py + a[2] * pz; if (d > best) { best = d; i1 = i; } }
    let e = 9;
    for (const w of g.nbr[i1]) { const d = w[0] * px + w[1] * py + w[2] * pz; if (d < e) e = d; }
    out[0] = e; out[1] = g.id[i1];
  }
  noise(x, y) {
    const h = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    const a = h(xi, yi), b = h(xi + 1, yi), c = h(xi, yi + 1), d = h(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  // gentle warp so crack walls wander like real mud cracks
  warp(nx, ny, nz) {
    return [nx + .05 * (this.noise(ny * 5 + 3, nz * 5) - .5), ny + .05 * (this.noise(nz * 5 + 7, nx * 5) - .5), nz + .05 * (this.noise(nx * 5 + 11, ny * 5) - .5)];
  }
  fbm(x, y) { let s = 0, a = .5; for (let i = 0; i < 3; i++) { s += a * this.noise(x, y); x *= 2.03; y *= 2.03; a *= .5; } return s; }
  render() {
    const o = this.o, d = this.dpr, W = this.cv.width, H = this.cv.height, dark = this.dark, L = this.L;
    const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
    this.bg = mk(); this.glowA = mk(); this.glowB = mk();
    const x = this.bg.getContext('2d');
    const sky = x.createLinearGradient(0, 0, 0, H);
    if (dark) { sky.addColorStop(0, '#0A0D11'); sky.addColorStop(1, '#10151A'); }
    else { sky.addColorStop(0, '#FBFCFD'); sky.addColorStop(1, '#EDF2F6'); }
    if (!o.transparent) { x.fillStyle = sky; x.fillRect(0, 0, W, H); }
    const x0 = Math.max(0, Math.floor((o.cx - o.R) * d)), x1 = Math.min(W, Math.ceil((o.cx + o.R) * d));
    const y0 = Math.max(0, Math.floor((o.cy - o.R) * d)), y1 = Math.min(H, Math.ceil((o.cy + o.R) * d));
    if (x1 > x0 && y1 > y0) {
      const RW = x1 - x0, RH = y1 - y0;
      const img = x.getImageData(x0, y0, RW, RH), px = img.data;
      const ga = new ImageData(RW, RH), gb = new ImageData(RW, RH), pa = ga.data, pb = gb.data;
      const g1 = this.g1 = this.sites(o.plates, o.seed);
      const w1 = .009, e = [0, 0];
      const amb = dark ? [15, 19, 24] : [200, 211, 220];
      const lt = dark ? [214, 225, 233] : [252, 253, 254];
      const rimC = dark ? [110, 160, 188] : [150, 190, 210];
      const gc = dark ? [150, 214, 236] : [15, 110, 140];
      for (let Y = y0; Y < y1; Y++) for (let X = x0; X < x1; X++) {
        const nx = (X / d - o.cx) / o.R, ny = (o.cy - Y / d) / o.R, r2 = nx * nx + ny * ny;
        if (r2 > 1) continue;
        const nz = Math.sqrt(1 - r2), i = ((Y - y0) * RW + (X - x0)) * 4;
        const [wx, wy, wz] = this.warp(nx, ny, nz);
        const wl = Math.hypot(wx, wy, wz);
        this.edge(g1, wx / wl, wy / wl, wz / wl, e);
        const main = 1 - smooth(0, w1, e[0]);
        const df = smooth(-.08, .75, nx * L[0] + ny * L[1] + nz * L[2]);
        const tex = dark ? .9 + .12 * this.fbm(nx * 4 + 7, ny * 4 + 3) : .975 + .03 * this.fbm(nx * 4 + 7, ny * 4 + 3);
        const plate = dark ? .93 + .1 * e[1] : .97 + .04 * e[1];
        const bevel = smooth(w1 * 3.2, w1 * 1.1, e[0]) * (1 - main) * df * (dark ? .07 : .03);
        const groove = main;
        const rim = Math.pow(1 - nz, 5) * (dark ? .22 : .2);
        const grain = (Math.random() - .5) * 3, edgeA = Math.min(1, (1 - Math.sqrt(r2)) * o.R * d);
        for (let c = 0; c < 3; c++) {
          let v = (amb[c] + (lt[c] - amb[c]) * df) * tex * plate;
          v = v * (1 - groove * (dark ? .75 : .45) * (.3 + .7 * df)) + 255 * bevel + rimC[c] * rim + grain;
          px[i + c] = o.transparent ? v : px[i + c] * (1 - edgeA) + v * edgeA;
        }
        if (o.transparent) px[i + 3] = edgeA * 255; // no sky to blend with: fade the edge itself
        // glow through the cracks, split into two halves that breathe out of phase (slow waves)
        const halo = 1 - smooth(0, w1 * 5, e[0]);
        let gv = (main * .55 + (dark ? halo * .06 : 0)) * (.35 + .65 * nz) * (1 - .85 * df) * edgeA;
        if (!dark) gv *= .5;
        const m = smooth(.3, .7, this.fbm(nx * 1.6 + 5, ny * 1.6 + 9 + nz));
        const A = Math.min(255, gv * 255 * m), B = Math.min(255, gv * 255 * (1 - m));
        pa[i] = pb[i] = gc[0]; pa[i + 1] = pb[i + 1] = gc[1]; pa[i + 2] = pb[i + 2] = gc[2]; pa[i + 3] = A; pb[i + 3] = B;
      }
      x.putImageData(img, x0, y0);
      this.glowA.getContext('2d').putImageData(ga, x0, y0);
      this.glowB.getContext('2d').putImageData(gb, x0, y0);
    }
    this.sprite = mk(); this.sprite.width = this.sprite.height = 64;
    const sg = this.sprite.getContext('2d'), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32), c = dark ? '226,240,248' : '120,186,208';
    rg.addColorStop(0, 'rgba(' + c + ',1)'); rg.addColorStop(.4, 'rgba(' + c + ',.35)'); rg.addColorStop(1, 'rgba(' + c + ',0)');
    sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
  }
  step(dt) {
    this.t += dt; const o = this.o, t = this.t, R = o.R;
    this.k += (this.target - this.k) * Math.min(1, dt * 1.6);
    const k = this.k;
    for (const s of this.sources) {
      const pulse = .2 + .8 * Math.pow(.5 + .5 * Math.sin(t * s.w + s.ph), 2);
      s.acc += o.rate * pulse * k * dt;
      while (s.acc >= 1) {
        s.acc--;
        const q = s.q, j = .14;
        let v = [q[0] + (Math.random() - .5) * j, q[1] + (Math.random() - .5) * j, q[2] + (Math.random() - .5) * j];
        const m = Math.hypot(v[0], v[1], v[2]), sp = o.speed * (.55 + Math.random() * .7);
        v = [v[0] / m * sp, v[1] / m * sp, v[2] / m * sp];
        const mist = Math.random() < .12;
        if (mist) { v[0] *= .45; v[1] *= .45; v[2] *= .45; }
        this.ps.push({ x: q[0] * R, y: q[1] * R, z: q[2] * R, vx: v[0], vy: v[1], vz: v[2], life: 0,
          max: mist ? 3 + Math.random() * 2 : 2 + Math.random() * 2, a: mist ? .05 + Math.random() * .05 : .25 + Math.random() * .45,
          m: mist, sz: (8 + Math.random() * 14) * Math.min(1, R / 220) }); // puffs scale with the moon: small moons get fine mist, not blobs
      }
    }
    const g = o.speed * .32, ps = this.ps;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i]; p.life += dt;
      if (p.life > p.max) { ps[i] = ps[ps.length - 1]; ps.pop(); continue; }
      const r = Math.hypot(p.x, p.y, p.z), kk = 1 - .45 * dt;
      p.vx = (p.vx - p.x / r * g * dt) * kk; p.vy = (p.vy - p.y / r * g * dt) * kk; p.vz = (p.vz - p.z / r * g * dt) * kk;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    }
  }
  draw() {
    const x = this.ctx, o = this.o, d = this.dpr, t = this.t, k = this.k;
    x.setTransform(1, 0, 0, 1, 0, 0); x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1;
    if (this.o.transparent) x.clearRect(0, 0, this.cv.width, this.cv.height);
    x.drawImage(this.bg, 0, 0);
    // ocean light through the crack network, in two slow out-of-phase waves; brighter while working
    x.globalCompositeOperation = this.dark ? 'lighter' : 'source-over';
    const base = .5 + .5 * k;
    x.globalAlpha = (.72 + .28 * (.5 + .5 * Math.sin(t * .55))) * base; x.drawImage(this.glowA, 0, 0);
    x.globalAlpha = (.72 + .28 * (.5 + .5 * Math.sin(t * .55 + 3.1))) * base; x.drawImage(this.glowB, 0, 0);
    x.globalAlpha = 1; x.setTransform(d, 0, 0, d, 0, 0); x.lineCap = 'round';
    if (k > .01) {
      // vapor curtains rising from the vents
      const bc = this.dark ? '206,232,244' : '14,92,120';
      for (const s of this.sources) {
        const pulse = (.2 + .8 * Math.pow(.5 + .5 * Math.sin(t * s.w + s.ph), 2)) * k;
        const len = o.speed * (.35 + .6 * pulse);
        const a0 = this.proj(s.q), a1 = this.proj(s.q, o.R + len);
        for (const [w, a] of (this.dark ? [[6, .045], [1, .17]] : [[6, .1], [1.3, .36]])) { // light mode needs more: pale vapor on a pale page
          const g = x.createLinearGradient(a0[0], a0[1], a1[0], a1[1]);
          g.addColorStop(0, 'rgba(' + bc + ',' + (a * pulse) + ')'); g.addColorStop(1, 'rgba(' + bc + ',0)');
          x.strokeStyle = g; x.lineWidth = w;
          x.beginPath(); x.moveTo(a0[0], a0[1]); x.lineTo(a1[0], a1[1]); x.stroke();
        }
      }
    }
    const pc = this.dark ? '226,240,248' : '14,92,120';
    for (const p of this.ps) {
      const u = p.life / p.max, a = p.a * Math.min(1, p.life * 4) * Math.pow(1 - u, 2) * (this.dark ? .5 : .75);
      if (a < .004) continue;
      const X = o.cx + p.x, Y = o.cy - p.y;
      if (p.m) { const s = p.sz * (1 + u * 1.5); x.globalAlpha = a; x.drawImage(this.sprite, X - s, Y - s, s * 2, s * 2); x.globalAlpha = 1; continue; }
      x.strokeStyle = 'rgba(' + pc + ',' + a + ')'; x.lineWidth = .7 + u * .9;
      x.beginPath(); x.moveTo(X, Y); x.lineTo(X - p.vx * .09, Y + p.vy * .09); x.stroke();
    }
    x.globalCompositeOperation = 'source-over';
  }
  loop(ts) {
    if (!this.running) return;
    const dt = this.last ? Math.min(.05, (ts - this.last) / 1000) : 1 / 60; this.last = ts;
    this.step(dt); this.draw(); this.raf = requestAnimationFrame(this.loop);
  }
}
function norm(v) { const m = Math.hypot(v[0], v[1], v[2]); return [v[0] / m, v[1] / m, v[2] / m]; }
function dot(a, b) { return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]; }
function cross(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
function perp(A) { const a = Math.abs(A[1]) < .9 ? [0, 1, 0] : [1, 0, 0], u = norm(cross(a, A)); return [u, cross(A, u)]; }
function smooth(a, b, v) { const t = Math.max(0, Math.min(1, (v - a) / (b - a))); return t * t * (3 - 2 * t); }
function mulberry32(s) { return function () { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
if (typeof window !== 'undefined') window.EnceladusScene = EnceladusScene;

export { EnceladusScene };
