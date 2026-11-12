// ===== 소전을 그려서 찾기 =====
// 손으로 그린 소전을 說文 소전 그림(崇羲篆體) 1만여 자와 모양으로 비교해 비슷한 글자를 보여줌.
// 모양 특징(sealdraw/feat.bin)은 소전 그림마다 미리 계산해 둔 것이고, 같은 계산을 손그림에 그대로 적용함.
// (만든 코드: 그림 특징 = 밀도 16×16 + 획 방향 4×4×4, 처음 이 칸을 펼칠 때만 3MB를 받음)

(function () {
  const box = document.getElementById("sd-box");
  if (!box || typeof SHUOWEN_ROWS === "undefined") return;
  const canvas = document.getElementById("sd-canvas");
  const ctx = canvas.getContext("2d");
  const list = document.getElementById("sd-list");
  const status = document.getElementById("sd-count");
  const N = 64, D = 16, DIM = 320, SCALE = 0.6 / 255;
  let feats = null, loading = null, strokes = [], cur = null, lastTop = [];

  function load() {
    if (feats) return Promise.resolve();
    if (loading) return loading;
    status.textContent = "소전 모양 자료를 불러오는 중… (처음 한 번만, 약 3MB)";
    loading = fetch("sealdraw/feat.bin").then((r) => {
      if (!r.ok) throw new Error();
      return r.arrayBuffer();
    }).then((b) => {
      const q = new Uint8Array(b), n = q.length / DIM;
      feats = { q, n, norm: new Float32Array(n) };
      for (let i = 0; i < n; i++) {
        let s = 0;
        for (let j = 0; j < DIM; j++) { const v = q[i * DIM + j]; s += v * v; }
        feats.norm[i] = Math.sqrt(s) || 1;
      }
      status.textContent = "소전을 그리면 비슷한 글자를 찾아 드립니다";
    }).catch(() => { loading = null; status.textContent = "자료를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요."; });
    return loading;
  }

  // ---- 특징 계산 (sealfeat.py와 같은 순서·같은 값) ----
  function areaResize(a, h, w, n) {
    const out = new Float64Array(n * n);
    for (let y = 0; y < n; y++) {
      const y0 = y * h / n, y1 = (y + 1) * h / n;
      for (let x = 0; x < n; x++) {
        const x0 = x * w / n, x1 = (x + 1) * w / n;
        let s = 0;
        for (let yy = Math.floor(y0); yy < Math.ceil(y1); yy++) {
          const wy = Math.min(yy + 1, y1) - Math.max(yy, y0);
          for (let xx = Math.floor(x0); xx < Math.ceil(x1); xx++) {
            const wx = Math.min(xx + 1, x1) - Math.max(xx, x0);
            s += a[yy * w + xx] * wy * wx;
          }
        }
        out[y * n + x] = s / ((y1 - y0) * (x1 - x0));
      }
    }
    return out;
  }
  const GK = (() => {
    const s = 2.0, r = Math.floor(3 * s + 0.5), k = [];
    let t = 0;
    for (let x = -r; x <= r; x++) { const v = Math.exp(-x * x / (2 * s * s)); k.push(v); t += v; }
    return k.map((v) => v / t);
  })();
  function blur(a, n) {
    const r = (GK.length - 1) / 2, t = new Float64Array(n * n), o = new Float64Array(n * n);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) { const xx = x + k; if (xx >= 0 && xx < n) s += a[y * n + xx] * GK[k + r]; }
      t[y * n + x] = s;
    }
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      let s = 0;
      for (let k = -r; k <= r; k++) { const yy = y + k; if (yy >= 0 && yy < n) s += t[yy * n + x] * GK[k + r]; }
      o[y * n + x] = s;
    }
    return o;
  }
  function feature(ink, h, w) {
    let y0 = h, y1 = -1, x0 = w, x1 = -1;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (ink[y * w + x] > 0.2) {
      if (y < y0) y0 = y; if (y > y1) y1 = y; if (x < x0) x0 = x; if (x > x1) x1 = x;
    }
    if (y1 < 0) return null;
    y1++; x1++;
    const bh = y1 - y0, bw = x1 - x0, side = Math.floor(Math.max(bh, bw) * 1.1) + 2;
    const sq = new Float64Array(side * side), cy = Math.floor((side - bh) / 2), cx = Math.floor((side - bw) / 2);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) sq[(cy + y) * side + cx + x] = ink[(y0 + y) * w + x0 + x];
    let a = areaResize(sq, side, side, N);
    for (let i = 0; i < a.length; i++) a[i] = a[i] > 0.15 ? 1 : 0;
    a = blur(a, N);
    const dens = areaResize(a, N, N, D);
    // np.gradient: 안쪽은 가운데 차분, 가장자리는 한쪽 차분
    const g = (y, x, dy, dx) => {
      const at = (yy, xx) => a[yy * N + xx];
      if (dy) return y === 0 ? at(1, x) - at(0, x) : y === N - 1 ? at(N - 1, x) - at(N - 2, x) : (at(y + 1, x) - at(y - 1, x)) / 2;
      return x === 0 ? at(y, 1) - at(y, 0) : x === N - 1 ? at(y, N - 1) - at(y, N - 2) : (at(y, x + 1) - at(y, x - 1)) / 2;
    };
    const hog = new Float64Array(64), cell = N / 4;
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const gy = g(y, x, 1, 0), gx = g(y, x, 0, 1);
      const mag = Math.hypot(gx, gy);
      let ang = Math.atan2(gy, gx) % Math.PI; if (ang < 0) ang += Math.PI;
      const b = Math.min(Math.floor(ang / Math.PI * 4), 3);
      hog[(Math.floor(y / cell) * 4 + Math.floor(x / cell)) * 4 + b] += mag;
    }
    const nd = Math.hypot(...dens) + 1e-9, nh = Math.hypot(...hog) + 1e-9;
    const f = new Float64Array(DIM);
    for (let i = 0; i < 256; i++) f[i] = dens[i] / nd;
    for (let i = 0; i < 64; i++) f[256 + i] = hog[i] / nh * 0.8;
    return f;
  }

  // ---- 그리기 ----
  function resize() {
    const size = Math.min(canvas.parentElement.clientWidth, 320), dpr = window.devicePixelRatio || 1;
    canvas.style.width = canvas.style.height = size + "px";
    canvas.width = canvas.height = Math.round(size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function draw() {
    const n = canvas.width / (window.devicePixelRatio || 1);
    ctx.clearRect(0, 0, n, n);
    ctx.strokeStyle = "rgba(217,178,111,.18)"; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(n / 2, 0); ctx.lineTo(n / 2, n); ctx.moveTo(0, n / 2); ctx.lineTo(n, n / 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = "#f3e9d8"; ctx.lineWidth = Math.max(4, n / 40); ctx.lineCap = ctx.lineJoin = "round";
    strokes.concat(cur ? [cur] : []).forEach((st) => {
      ctx.beginPath();
      st.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      if (st.length === 1) ctx.lineTo(st[0][0] + 0.1, st[0][1]);
      ctx.stroke();
    });
  }
  // 안내선 없이 획만 그린 그림에서 먹 농도(0~1)를 읽음
  function inkOf() {
    const size = 192, c = document.createElement("canvas");
    c.width = c.height = size;
    const k = size / (canvas.width / (window.devicePixelRatio || 1)), x = c.getContext("2d");
    x.strokeStyle = "#000"; x.lineWidth = Math.max(4, size / 40); x.lineCap = x.lineJoin = "round";
    strokes.forEach((st) => {
      x.beginPath();
      st.forEach(([px, py], i) => (i ? x.lineTo(px * k, py * k) : x.moveTo(px * k, py * k)));
      if (st.length === 1) x.lineTo(st[0][0] * k + 0.1, st[0][1] * k);
      x.stroke();
    });
    const d = x.getImageData(0, 0, size, size).data, ink = new Float64Array(size * size);
    for (let i = 0; i < ink.length; i++) ink[i] = d[i * 4 + 3] / 255;
    return { ink, size };
  }
  const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  canvas.addEventListener("pointerdown", (e) => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); cur = [pt(e)]; draw(); });
  canvas.addEventListener("pointermove", (e) => {
    if (!cur) return;
    const p = pt(e), l = cur[cur.length - 1];
    if (Math.abs(p[0] - l[0]) + Math.abs(p[1] - l[1]) < 2) return;
    cur.push(p); draw();
  });
  const end = () => { if (!cur) return; strokes.push(cur); cur = null; draw(); search(); if (!aiList.hidden || !aiStatus.hidden) aiReset(); };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);

  // ---- 찾기 ----
  async function search() {
    list.innerHTML = "";
    if (!strokes.length) { status.textContent = "소전을 그리면 비슷한 글자를 찾아 드립니다"; return; }
    await load();
    if (!feats) return;
    const { ink, size } = inkOf();
    const f = feature(ink, size, size);
    if (!f) return;
    const fn = Math.hypot(...f) || 1;
    const best = new Map(); // 글자 → [점수, 행 번호]
    for (let i = 0; i < feats.n; i++) {
      let s = 0;
      const o = i * DIM;
      for (let j = 0; j < DIM; j++) s += feats.q[o + j] * f[j];
      s = s / (feats.norm[i] * fn);
      const ch = SHUOWEN_ROWS[i][0];
      const prev = best.get(ch);
      if (!prev || prev[0] < s) best.set(ch, [s, i]);
    }
    const top = [...best.entries()].sort((a, b) => b[1][0] - a[1][0]).slice(0, 24);
    lastTop = top.map(([ch]) => ch);
    top.forEach(([ch, [, i]]) => {
      const [, p, k, z] = SHUOWEN_ROWS[i];
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-cand sd-cand";
      const t = document.createElement("span");
      t.className = "rs-thumb sd-thumb";
      t.appendChild(makeShuowenImage({ ch, p, k, z }));
      b.appendChild(t);
      const yin = (huneumOf(ch).split(",")[0] || "").trim();
      b.insertAdjacentHTML("beforeend", `<span class="rk">${ch}</span><span class="ry">${z ? (ZHONGWEN[z] || z) : yin || "&nbsp;"}</span>`);
      b.addEventListener("click", () => pickChar(ch));
      list.appendChild(b);
    });
    status.textContent = `${strokes.length}획 · 모양이 비슷한 소전 ${top.length}자 (앞쪽일수록 비슷함) · 소전 그림을 보고 맞는 글자를 누르세요`;
  }

  // ---- AI로 읽기: 그린 소전을 흰 바탕 그림으로 만들어 사진 읽기 서버(mode "sealhw")로 보냄 ----
  // 모양 비교로 찾은 상위 후보도 참고로 함께 보내 정확도를 높임. 한 번에 몇 원 정도의 API 요금이 듦.
  const aiBtn = document.getElementById("sd-ai");
  const aiStatus = document.getElementById("sd-ai-status");
  const aiList = document.getElementById("sd-ai-list");
  const codeRow = document.getElementById("sd-code-row");
  let aiSeq = 0;
  function aiReset() { aiSeq++; aiStatus.hidden = true; aiList.hidden = true; aiList.innerHTML = ""; aiBtn.disabled = false; }
  function sealImage() {
    const pts = strokes.flat();
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const N = 256, k = 200 / Math.max(x1 - x0, y1 - y0, 40);
    const ox = (N - (x1 - x0) * k) / 2 - x0 * k, oy = (N - (y1 - y0) * k) / 2 - y0 * k;
    const c = document.createElement("canvas");
    c.width = c.height = N;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, N, N);
    g.strokeStyle = "#000"; g.lineWidth = 8; g.lineCap = g.lineJoin = "round";
    strokes.forEach((st) => {
      g.beginPath();
      st.forEach(([x, y], i) => (i ? g.lineTo(x * k + ox, y * k + oy) : g.moveTo(x * k + ox, y * k + oy)));
      if (st.length === 1) g.lineTo(st[0][0] * k + ox + 0.1, st[0][1] * k + oy);
      g.stroke();
    });
    return c.toDataURL("image/png").split(",")[1];
  }
  async function aiRead() {
    if (!strokes.length) { aiStatus.hidden = false; aiStatus.textContent = "먼저 위 칸에 소전을 그려 주세요."; return; }
    const code = phGetCode();
    if (!code) { codeRow.hidden = false; aiStatus.hidden = false; aiStatus.textContent = "처음 한 번만 AI 읽기 비밀번호를 입력해 주세요. (사진 읽기와 같은 비밀번호)"; return; }
    codeRow.hidden = true;
    const seq = ++aiSeq;
    aiBtn.disabled = true; aiList.hidden = true; aiList.innerHTML = "";
    aiStatus.hidden = false; aiStatus.textContent = "AI가 그린 소전을 읽는 중… (5~15초)";
    let data;
    try {
      const res = await fetch(PHOTO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Code": code },
        body: JSON.stringify({ image: sealImage(), mediaType: "image/png", mode: "sealhw", hints: lastTop.slice(0, 12) }),
      });
      data = await res.json();
      if (seq !== aiSeq) return;
      if (!res.ok) {
        if (data.code === "bad_code") { phSetCode(""); codeRow.hidden = false; }
        aiStatus.textContent = "읽지 못했습니다: " + (data.error || res.status);
        return;
      }
    } catch (e) {
      if (seq !== aiSeq) return;
      aiStatus.textContent = "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
      return;
    } finally { if (seq === aiSeq) aiBtn.disabled = false; }
    if (data.mode && data.mode !== "sealhw") {
      aiStatus.textContent = "서버(Cloudflare 워커)가 아직 소전 그리기 읽기 기능이 없는 옛 버전입니다. 새 worker.js로 갱신해 주세요.";
      return;
    }
    const x = (data.columns[0] || [])[0];
    const cands = x ? [...new Set([x.c, ...(x.alt || [])])].filter((ch) => ch && ch !== "?") : [];
    if (!cands.length) { aiStatus.textContent = "소전으로 읽지 못했습니다. 조금 더 크고 또박또박 그려 보세요."; return; }
    aiStatus.innerHTML = `AI가 읽은 글자 <span class="rs-sub">(${x.sure ? "첫 글자가 가장 유력" : "확실하지 않음 — 소전 그림과 비교해 보세요"} · ◎는 모양 비교에도 나온 글자 · 누르면 입력됩니다)</span>`;
    cands.forEach((ch, i) => {
      const b = rsButton({ ch });
      if (i === 0 && x.sure) b.classList.add("ai-best");
      if (lastTop.includes(ch)) b.classList.add("sd-both");
      aiList.appendChild(b);
    });
    aiList.hidden = false;
  }
  aiBtn.addEventListener("click", aiRead);
  document.getElementById("sd-code-save").addEventListener("click", () => {
    const v = document.getElementById("sd-code").value.trim();
    if (!v) return;
    phSetCode(v); document.getElementById("sd-code").value = ""; codeRow.hidden = true; aiRead();
  });

  document.getElementById("sd-undo").addEventListener("click", () => { strokes.pop(); draw(); search(); aiReset(); });
  document.getElementById("sd-clear").addEventListener("click", () => { strokes = []; draw(); search(); aiReset(); });
  box.addEventListener("toggle", () => { if (box.open) { resize(); load(); } });
  window.addEventListener("resize", () => { if (box.open) resize(); });
  window.SD = { feature }; // 시험용
})();
