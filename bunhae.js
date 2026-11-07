// ===== 글자 풀이 · 기초자 · 說文 540부수 자형 분해 =====
// 처음에는 소전만 간단히 보여주고, 대응표에서 글자를 누르면 아래 순서로 이어서 보여줌
//   1) 기초자 설명(있을 때)   2) 자형 분해(說文 구성을 따라 540부수까지, 부수마다 분해표)
// 자료: bunhae/data.js(540부수 분해표 위치, 기초자), bunhae/shuowen-text.js(說文 구성 자료 — 처음 필요할 때 불러옴, 원문은 화면에 보여주지 않음)
// 출처·허락: THIRD_PARTY_NOTICES.md

(function () {
  if (typeof BH540 === "undefined") return;
  const $ = (id) => document.getElementById(id);
  const pad3 = (n) => String(n).padStart(3, "0");

  // 540부수: [번호, 부수, 권, 책 쪽, 너비, 높이, 묶음 번호, 묶음 안 y, 묶음 높이, 崇羲 수록 글자]
  const R = BH540.map(([num, ch, juan, page, w, h, sheet, sy, sheetH, alt], i) => ({ i, num, ch, juan, page, w, h, sheet, sy, sheetH, alt }));
  // 글자 → 540부수 번호 (책과 說文 자료의 글자가 다른 경우를 이어 줌)
  const BOOK = {};
  R.forEach((r) => { if (!(r.ch in BOOK)) BOOK[r.ch] = r.i; if (r.alt && !(r.alt in BOOK)) BOOK[r.alt] = r.i; });
  const ALIAS = { "丄": 2, "𪞶": 104, "雈": 111, "𠨍": 341, "甶": 347, "㣇": 363, "𢊁": 371, "㚔": 397, "亣": 402, "瀕": 412,
    "𡿨": 413, "𠃊": 456, "亾": 457, "戼": 531, "只": 50, "㕯": 49, "阜": 500, "廾": 62 };
  Object.entries(ALIAS).forEach(([c, n]) => { BOOK[c] = n - 1; });
  const ROLE = { "": "뜻(形)", "聲": "소리(聲)", "省聲": "줄인 소리(省聲)", "亦聲": "뜻·소리(亦聲)", "省": "줄인 꼴(省)" };

  const K = BHK80.map(([no, chars, hun, scr, say, d1, d2, ti, di, rad]) => ({ no, chars, hun, scr, say, d1, d2, ti, di, rad }));
  const KBYCH = {};
  K.forEach((k, i) => k.chars.forEach((c) => { if (!(c in KBYCH)) KBYCH[c] = i; }));

  // 說文 구성 자료는 1MB 정도라 처음 필요할 때만 불러옴
  let swReady = null;
  function loadSW() {
    if (swReady) return swReady;
    swReady = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = "bunhae/shuowen-text.js";
      s.onload = () => resolve();
      s.onerror = () => { swReady = null; reject(new Error("說文 자료를 불러오지 못했습니다")); };
      document.head.appendChild(s);
    });
    return swReady;
  }
  let RVAR = null;
  function swEntry(ch) {
    if (!window.BH_SW) return null;
    let i = BH_SW.idx[ch];
    if (i === undefined && BH_VAR[ch]) i = BH_SW.idx[BH_VAR[ch]];
    return i === undefined ? null : BH_SW.rows[i];
  }
  // 소전 그림: 說文 원본(崇羲) — 해서와 說文 표제자가 다르면 이체 관계로 찾아봄
  function sealEl(ch) {
    if (!RVAR && window.BH_VAR) { RVAR = {}; Object.entries(BH_VAR).forEach(([k, v]) => { if (!(v in RVAR)) RVAR[v] = k; }); }
    const key = [ch, window.BH_VAR && BH_VAR[ch], RVAR && RVAR[ch]].find((c) => c && SHUOWEN[c]);
    if (key) return makeShuowenImage(SHUOWEN[key][0]);
    const codes = CUSTOM_SEAL_MAP[ch] || SEAL_MAP[ch];
    return codes ? makeSealImage(codes[0]) : null;
  }

  // 책의 분해표 한 장 (여러 장을 이어 붙인 그림에서 이 부수 부분만 보여줌)
  function chartFor(i) {
    const r = R[i], f = document.createElement("figure");
    f.className = "bh-chart";
    const pos = r.sheetH > r.h ? (r.sy / (r.sheetH - r.h)) * 100 : 0;
    f.innerHTML = `<div class="bh-chart-scroll"><div class="bh-crop" role="img" aria-label="${r.ch} 자형 분해표"
      style="aspect-ratio:${r.w} / ${r.h};background-image:url(bunhae/s/${String(r.sheet).padStart(2, "0")}.webp);background-position:0 ${pos}%"></div></div>
      <figcaption>자형 분해: 최규화, 『설문해자 540부수의 자형 분해』 ${r.page}쪽 · 說文 ${r.juan} · 부수 ${pad3(r.num)} ${r.ch}</figcaption>`;
    return f;
  }
  function radButton(i, holder, open) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "rs-st bh-rbtn";
    b.textContent = `부수 ${pad3(R[i].num)} 분해표`;
    let shown = null;
    const toggle = () => {
      if (shown) { shown.remove(); shown = null; b.classList.remove("on"); return; }
      shown = chartFor(i); holder.appendChild(shown); b.classList.add("on");
    };
    b.addEventListener("click", toggle);
    if (open) toggle();
    return b;
  }

  // 자형 분해 트리: 說文 '从○○聲'을 따라 540부수에 닿을 때까지 나눔
  function nodeLi(ch, role, depth, seen) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "bh-node";
    const sb = document.createElement("span");
    sb.className = "bh-sb";
    const sl = sealEl(ch);
    if (sl) sb.appendChild(sl); else sb.innerHTML = '<span class="bh-note">없음</span>';
    row.appendChild(sb);
    row.insertAdjacentHTML("beforeend", `<span class="bh-nc">${ch}</span>`);
    if (role !== null) row.insertAdjacentHTML("beforeend", `<span class="bh-tag${role ? " sheng" : ""}">${ROLE[role] || role}</span>`);
    li.appendChild(row);
    const bi = BOOK[ch];
    if (bi !== undefined) { row.appendChild(radButton(bi, li, depth === 0)); return li; }
    const e = swEntry(ch);
    if (!e || !e[3].length || depth >= 4 || seen.has(ch)) {
      const why = !e ? "《說文》에 표제자로 없음" : !e[3].length ? "더 나누지 않음(象形 등)" : "";
      if (why) row.insertAdjacentHTML("beforeend", `<span class="bh-note">${why}</span>`);
      return li;
    }
    const ul = document.createElement("ul");
    const next = new Set(seen); next.add(ch);
    e[3].forEach(([c, r]) => ul.appendChild(nodeLi(c, r, depth + 1, next)));
    li.appendChild(ul);
    return li;
  }

  // 기초자 설명 블록
  function basicBlock(k) {
    const box = document.createElement("div");
    box.className = "bh-basic";
    if (k.ti) box.insertAdjacentHTML("beforeend", `<img class="bh-vtitle" src="${k.ti}" alt="${k.chars.join("")} 영상 제목 줄" loading="lazy">`);
    if (k.scr) {
      const kw = document.createElement("div");
      kw.className = "bh-kw";
      k.scr.split(/\s*[\/,，]\s*|\s*\d+\.\s*/).map((x) => x.trim()).filter(Boolean)
        .forEach((w) => { const s = document.createElement("span"); s.textContent = w; kw.appendChild(s); });
      box.appendChild(kw);
    }
    if (k.say) box.insertAdjacentHTML("beforeend", `<p class="bh-say">${k.say}</p>`);
    if (k.d1 || k.d2 || k.di) {
      box.insertAdjacentHTML("beforeend", '<div class="bh-h4">소전 해체 (영상)</div>');
      if (k.di) box.insertAdjacentHTML("beforeend", `<img class="bh-decimg" src="${k.di}" alt="영상의 소전 해체 그림" loading="lazy">`);
      [k.d1, k.d2].filter(Boolean).forEach((t) => box.insertAdjacentHTML("beforeend", `<p class="bh-say">${t}</p>`));
    }
    box.insertAdjacentHTML("beforeend", '<div class="bh-src">출처: 한자해례 채널 「기초자81」 영상(최규화) — 화면 글자와 자동 자막을 옮김</div>');
    return box;
  }

  // 단계별로 펼치는 칸
  function step(title, open, fill) {
    const d = document.createElement("details");
    d.className = "bh-step";
    d.open = open;
    d.innerHTML = `<summary>${title}</summary>`;
    const body = document.createElement("div");
    body.className = "bh-step-body";
    d.appendChild(body);
    let filled = false;
    const go = () => { if (!filled && d.open) { filled = true; fill(body); } };
    d.addEventListener("toggle", go);
    go();
    return d;
  }

  // ===== 글자 풀이 =====
  async function explain(ch) {
    const card = $("bh-card"), body = $("bh-body");
    card.hidden = false;
    body.innerHTML = '<p class="hint">說文 자료를 불러오는 중…</p>';
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    try { await loadSW(); } catch (e) { body.innerHTML = `<p class="hint">${e.message}</p>`; return; }
    body.innerHTML = "";
    const e = swEntry(ch);
    const head = document.createElement("div");
    head.className = "bh-head";
    const big = document.createElement("span");
    big.className = "bh-big";
    const sl = sealEl(ch);
    if (sl) big.appendChild(sl); else big.innerHTML = '<span class="bh-note">소전 없음</span>';
    const via = BH_VAR[ch] && BH_SW.idx[ch] === undefined ? ` <span class="bh-note">(說文에는 ${BH_VAR[ch]}로 수록)</span>` : "";
    head.appendChild(big);
    head.insertAdjacentHTML("beforeend", `<div><div class="bh-ch">${ch}${via}</div><div class="bh-hun">${huneumOf(ch) || ""}</div></div>`);
    body.appendChild(head);

    if (!e && BOOK[ch] === undefined) {
      body.insertAdjacentHTML("beforeend", '<p class="bh-say">《說文解字》에 실리지 않은 글자입니다. 《說文》 이후에 생긴 글자는 說文의 구성이 없어 자형 분해를 할 수 없습니다.</p>');
    }
    const ki = KBYCH[ch] ?? (BH_VAR[ch] !== undefined ? KBYCH[BH_VAR[ch]] : undefined);
    if (ki !== undefined) body.appendChild(step(`기초자 설명 — ${K[ki].hun}`, false, (b) => b.appendChild(basicBlock(K[ki]))));
    if (e || BOOK[ch] !== undefined) {
      body.appendChild(step("자형 분해", ki === undefined, (b) => {
        const ul = document.createElement("ul");
        ul.className = "bh-tree";
        ul.appendChild(nodeLi(BH_VAR[ch] && BH_SW.idx[ch] === undefined ? BH_VAR[ch] : ch, null, 0, new Set()));
        b.appendChild(ul);
        b.insertAdjacentHTML("beforeend", '<div class="bh-src">부수까지 나누는 단계는 《說文》의 구성(从○○聲)을 따라 자동으로 만든 것이고, 분해표는 540부수에 대한 저자의 분해입니다.</div>');
      }));
    }
  }
  // 대응표에서 글자를 누르면 풀이
  $("pairs").addEventListener("click", (ev) => {
    const p = ev.target.closest(".pair");
    if (!p) return;
    const ch = (p.querySelector(".k") || {}).textContent;
    if (ch && ch.trim()) explain(ch.trim());
  });

  // ===== 기초자 목록 =====
  function showBasic(i) {
    const k = K[i], box = $("bh-bdetail");
    box.innerHTML = "";
    const head = document.createElement("div");
    head.className = "bh-head";
    head.innerHTML = `<div><div class="bh-ch">${k.chars.join(" ") || "·"}</div><div class="bh-hun">${String(k.no).padStart(2, "0")} · ${k.hun}</div></div>`;
    box.appendChild(head);
    box.appendChild(basicBlock(k));
    if (k.chars.length) {
      box.appendChild(step("자형 분해", true, async (b) => {
        if (k.chars.some((c, n) => k.rad[n] === undefined && BOOK[c] === undefined)) { try { await loadSW(); } catch (e) {} }
        k.chars.forEach((ch, n) => {
          const ri = k.rad[n] !== undefined ? k.rad[n] - 1 : BOOK[ch];
          if (ri !== undefined) {
            const holder = document.createElement("div");
            const row = document.createElement("div");
            row.className = "bh-node";
            row.innerHTML = `<span class="bh-nc">${ch}</span><span class="bh-note">說文 부수 ${pad3(R[ri].num)} ${R[ri].ch}</span>`;
            holder.appendChild(row);
            holder.appendChild(chartFor(ri));
            b.appendChild(holder);
          } else {
            const ul = document.createElement("ul");
            ul.className = "bh-tree";
            ul.appendChild(nodeLi(ch, null, 0, new Set()));
            b.appendChild(ul);
          }
        });
      }));
    }
    $("bh-bgrid").querySelectorAll(".on").forEach((x) => x.classList.remove("on"));
    const it = $("bh-bgrid").children[i];
    if (it) it.classList.add("on");
    box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  let basicsDrawn = false;
  $("bh-basics").addEventListener("toggle", () => {
    if (!$("bh-basics").open || basicsDrawn) return;
    basicsDrawn = true;
    loadSW().catch(() => {});
    const g = $("bh-bgrid");
    K.forEach((k, i) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-cand";
      b.innerHTML = `<span class="rk">${k.chars.join("") || "·"}</span><span class="ry">${k.hun}</span>`;
      b.addEventListener("click", () => showBasic(i));
      g.appendChild(b);
    });
  });

  // ===== 540부수 목록 =====
  function showRad(i) {
    const r = R[i], box = $("bh-rdetail");
    box.innerHTML = "";
    const head = document.createElement("div");
    head.className = "bh-head";
    const big = document.createElement("span");
    big.className = "bh-big";
    const key = SHUOWEN[r.ch] ? r.ch : r.alt;
    if (key && SHUOWEN[key]) big.appendChild(makeShuowenImage(SHUOWEN[key][0]));
    head.appendChild(big);
    head.insertAdjacentHTML("beforeend", `<div><div class="bh-ch">${r.ch}</div><div class="bh-hun">부수 ${pad3(r.num)} · 說文 ${r.juan} · 책 ${r.page}쪽${r.alt ? ` · 崇羲에는 ${r.alt}` : ""}</div></div>`);
    const nav = document.createElement("div");
    nav.className = "bh-nav";
    [["‹", i - 1], ["›", i + 1]].forEach(([t, j]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-st"; b.textContent = t; b.disabled = j < 0 || j >= R.length;
      b.setAttribute("aria-label", t === "‹" ? "이전 부수" : "다음 부수");
      b.addEventListener("click", () => showRad(j));
      nav.appendChild(b);
    });
    head.appendChild(nav);
    box.appendChild(head);
    box.appendChild(chartFor(i));
  }
  function drawRadList() {
    const q = $("bh-q").value.trim(), g = $("bh-rgrid");
    g.innerHTML = "";
    const list = R.filter((r) => !q || (/^\d+$/.test(q) ? r.num === +q : /^\d{1,2}[上下]$/.test(q) ? r.juan === q : r.ch === q || r.alt === q));
    list.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-cand";
      b.innerHTML = `<span class="rk">${r.ch}</span><span class="ry">${pad3(r.num)}</span>`;
      b.addEventListener("click", () => showRad(r.i));
      g.appendChild(b);
    });
    if (list.length === 1) showRad(list[0].i);
  }
  let radDrawn = false;
  $("bh-rad").addEventListener("toggle", () => {
    if (!$("bh-rad").open || radDrawn) return;
    radDrawn = true;
    drawRadList();
    showRad(0);
  });
  $("bh-q").addEventListener("input", drawRadList);

  window.BH = { explain };
})();
