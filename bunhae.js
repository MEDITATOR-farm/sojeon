// ===== 글자 풀이 · 기초자 · 說文 540부수 자형 분해 =====
// 처음에는 소전만 간단히 보여주고, 대응표에서 글자를 누르면 아래 순서로 이어서 보여줌
//   1) 기초자 설명(있을 때)   2) 자형 분해(說文 구성을 따라 540부수까지, 부수마다 분해표)   3) 소전 해독(기본자형의 뜻으로 훈 짓기)
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
  const ROLE = { "": "뜻(形)", "聲": "소리(聲)", "省聲": "줄인 소리(省聲)", "亦聲": "뜻·소리(亦聲)", "省": "줄인 꼴(省)",
    "反": "뒤집은 꼴(反)", "倒": "거꾸로 한 꼴(到)", "古文": "옛 글자(古文)" };
  const isSound = (r) => /聲/.test(r || "");   // 소리 요소: 聲·省聲·亦聲 (省·反·到·古文은 뜻 요소의 꼴)

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
    if (role !== null) row.insertAdjacentHTML("beforeend", `<span class="bh-tag${isSound(role) ? " sheng" : ""}">${ROLE[role] || role}</span>`);
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

  // ===== 소전 해독: 기본자형의 뜻으로 훈 만들기 =====
  // 자형 분해를 기초자(80여 자)에 닿을 때까지 더 내려가 기본자형을 모으고, 각 기본자형의 고유한 뜻(영상 화면 글자)을
  // 재료로 늘어놓은 뒤 사용자가 골라 훈을 지음. 뜻을 엮는 일은 해독하는 사람의 몫이고, 이 칸은 재료를 모아 줌.
  const KALIAS = { "𨸏": "阜", "𠬞": "廾", "攵": "攴", "㔾": "卩", "大": "大", "亣": "亣" };
  function kIndex(ch) {
    if (KBYCH[ch] !== undefined) return KBYCH[ch];
    if (KALIAS[ch] && KBYCH[KALIAS[ch]] !== undefined) return KBYCH[KALIAS[ch]];
    if (window.BH_VAR && BH_VAR[ch] && KBYCH[BH_VAR[ch]] !== undefined) return KBYCH[BH_VAR[ch]];
    return undefined;
  }
  // 기본자형까지 내려가며 모으기: [{ch, role(최상위 구성에서의 역할), k(기초자 번호 또는 undefined), via(거쳐 온 글자)}]
  // 기본 부호(고유부호) — 기초자 80자에 없는 一·丨·丿·乀·囗·凵·冖·コ·匚 (bunhae/buho.js)
  const BU = window.BH_BUHO || { items: [] };
  const BUBYCH = {};
  BU.items.forEach((b) => { BUBYCH[b.ch] = b; });
  const BUALIAS = { "冂": "冖", "口": null };          // 冂(∩ 꼴)은 저자의 ∩(冖 덮다)로 봄
  function buho(ch) { return BUBYCH[ch] || (BUALIAS[ch] ? BUBYCH[BUALIAS[ch]] : undefined); }
  function buhoWords(b) { return [...new Set([...b.mean, ...b.key.split(/\s*,\s*/)].filter(Boolean))]; }

  function basicLeaves(ch, role, depth, seen, via) {
    const k = kIndex(ch);
    if (k !== undefined) return [{ ch, role, k, via }];
    if (buho(ch)) return [{ ch, role, k: undefined, b: buho(ch), via }];
    const e = swEntry(ch);
    if (!e || !e[3].length || depth >= 6 || seen.has(ch)) return [{ ch, role, k: undefined, via }];   // (기본 부호는 위에서 먼저 잡음)
    const next = new Set(seen); next.add(ch);
    return e[3].flatMap(([c, r]) => basicLeaves(c, depth === 0 ? r : role, depth + 1, next, depth === 0 ? "" : (via ? via + "›" : "") + ch));
  }
  function meaningWords(k) {
    const src = k.scr || k.say || "";
    return src.split(/\s*[\/,，.。]\s*|\s*\d+\.\s*|\s*=\s*/).map((x) => x.trim()).filter((x) => x && x.length <= 12);
  }
  function hunKey(ch) { return "sojeon-hun-" + ch; }
  function loadHun(ch) { try { return localStorage.getItem(hunKey(ch)) || ""; } catch (e) { return ""; } }
  function saveHun(ch, v) { try { v ? localStorage.setItem(hunKey(ch), v) : localStorage.removeItem(hunKey(ch)); } catch (e) {} }

  function decodeBlock(ch, root) {
    const box = document.createElement("div");
    box.className = "bh-decode";
    const leaves = basicLeaves(root, "", 0, new Set(), "");
    const found = leaves.filter((l) => l.k !== undefined || l.b);

    // ① 찾은 기본자형과 그 뜻
    box.insertAdjacentHTML("beforeend", `<div class="bh-h4">① 기본자형 ${leaves.length}개 중 기초자·기본 부호에서 찾은 것 ${found.length}개</div>`);
    const list = document.createElement("div");
    list.className = "bh-leaves";
    const draft = document.createElement("textarea");
    leaves.forEach((l) => {
      const card = document.createElement("div");
      card.className = "bh-leaf" + (l.k === undefined && !l.b ? " missing" : "");
      const top = document.createElement("div");
      top.className = "bh-node";
      const sb = document.createElement("span");
      sb.className = "bh-sb";
      const sl = sealEl(l.ch);
      if (sl) sb.appendChild(sl); else sb.innerHTML = '<span class="bh-note">없음</span>';
      top.appendChild(sb);
      const k = l.k !== undefined ? K[l.k] : null;
      top.insertAdjacentHTML("beforeend", `<span class="bh-nc">${l.ch}</span><span class="bh-hun">${k ? k.hun : l.b ? l.b.hun + " · 기본 부호 " + l.b.seal : (huneumOf(l.ch) || "")}</span>` +
        `<span class="bh-tag${isSound(l.role) ? " sheng" : ""}">${ROLE[l.role] || l.role || "뜻(形)"}</span>` +
        (l.via ? `<span class="bh-note">${l.via}에서</span>` : ""));
      card.appendChild(top);
      const words = k ? meaningWords(k) : l.b ? buhoWords(l.b) : [];
      const chips = document.createElement("div");
      chips.className = "bh-kw bh-pick";
      if (words.length) {
        words.forEach((w) => {
          const b = document.createElement("button");
          b.type = "button"; b.textContent = w;
          b.title = "눌러서 아래 훈에 넣기";
          b.addEventListener("click", () => {
            draft.value = (draft.value ? draft.value.replace(/\s+$/, "") + " " : "") + w;
            saveHun(ch, draft.value); draft.focus();
          });
          chips.appendChild(b);
        });
        card.appendChild(chips);
      } else {
        card.insertAdjacentHTML("beforeend", `<div class="bh-note">${k ? "영상에 뜻 낱말이 없습니다" : "기초자 목록에 없는 자형입니다" + (huneumOf(l.ch) ? " — 위는 사전의 훈음입니다" : "")}</div>`);
      }
      list.appendChild(card);
    });
    box.appendChild(list);

    // ② 재료 한눈에: 형(뜻) 요소와 성(소리) 요소로 나눠 핵심 뜻 하나씩
    const first = (l) => (l.k !== undefined ? meaningWords(K[l.k])[0] : l.b ? l.b.mean[0] : "") || (huneumOf(l.ch).split(" ")[0] || "?");
    const fx = leaves.filter((l) => !isSound(l.role)).map((l) => `${l.ch}(${first(l)})`);
    const sx = leaves.filter((l) => isSound(l.role)).map((l) => `${l.ch}(${first(l)})`);
    box.insertAdjacentHTML("beforeend", `<div class="bh-h4">② 재료 정리</div>
      <p class="bh-say bh-formula">${fx.join(" + ") || "—"}${sx.length ? ` <span class="bh-note">｜ 소리·뜻 요소</span> ${sx.join(" + ")}` : ""}</p>`);

    // ③ 훈 짓기: 위 뜻 낱말을 눌러 모으고 고쳐 씀 (이 기기에 저장)
    box.insertAdjacentHTML("beforeend", `<div class="bh-h4">③ 훈 짓기 — ${ch}</div>`);
    draft.className = "bh-hunbox";
    draft.rows = 3;
    draft.placeholder = "위의 뜻 낱말을 눌러 모은 뒤, 자연스러운 훈으로 고쳐 쓰세요.";
    draft.value = loadHun(ch);
    draft.setAttribute("aria-label", ch + "의 훈 짓기");
    draft.addEventListener("input", () => saveHun(ch, draft.value.trim()));
    box.appendChild(draft);
    const tools = document.createElement("div");
    tools.className = "bh-tools";
    const dict = huneumOf(ch);
    tools.innerHTML = `<span class="bh-note">${dict ? `사전의 훈음: <b>${dict}</b> — 지은 훈과 비교해 보세요` : "사전에 훈음이 없는 글자입니다"}</span>`;
    const copy = document.createElement("button");
    copy.type = "button"; copy.className = "rs-st"; copy.textContent = "복사";
    copy.addEventListener("click", async () => {
      try { await navigator.clipboard.writeText(`${ch}: ${draft.value}`); showToast("복사했습니다"); } catch (e) { showToast("복사하지 못했습니다"); }
    });
    const clear = document.createElement("button");
    clear.type = "button"; clear.className = "rs-st"; clear.textContent = "지우기";
    clear.addEventListener("click", () => { draft.value = ""; saveHun(ch, ""); });
    tools.append(copy, clear);
    box.appendChild(tools);
    box.insertAdjacentHTML("beforeend", '<div class="bh-src">뜻 낱말: 한자해례 「기초자81」 영상 화면, 기본 부호는 「고유부호(기본 획)」(최규화). 기본자형까지 나누는 단계는 說文 구성을 따라 자동으로 만든 것이라 틀릴 수 있습니다. 지은 훈은 이 기기에만 저장됩니다.</div>');
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

  // ===== AI 자해: 《說文》 표제자로 바로 찾을 수 없는 글자 =====
  // AI(사진 읽기와 같은 서버, mode "jahae")가 자원(字源)에 따른 구성요소를 주면, 그 구성을 임시 說文 항목으로 넣어
  // 아래의 자형 분해(說文 트리)·소전 해독(기초자)을 그대로 이어서 씀. 결과는 이 기기에 저장해 다음부터는 무료.
  const JKEY = "sojeon-jahae-";
  const XKEY = "sojeon-jx-";        // 說文 표제자 글자의 AI 자형 해석 (분해 트리는 說文 그대로 두고 해석만 덧붙임)
  function jxCached(ch) { try { return JSON.parse(localStorage.getItem(XKEY + ch) || "null"); } catch (e) { return null; } }
  const AI_SET = new Set();
  function jahaeCached(ch) { try { return JSON.parse(localStorage.getItem(JKEY + ch) || "null"); } catch (e) { return null; } }
  function applyJahae(ch, d) {
    if (!d || !d.parts || !d.parts.length || (BH_SW.idx[ch] !== undefined && !AI_SET.has(ch))) return;
    const row = [ch, -1, "", d.parts.map((p) => [p.c, p.role || ""]), ""];
    if (AI_SET.has(ch)) BH_SW.rows[BH_SW.idx[ch]] = row;
    else { BH_SW.idx[ch] = BH_SW.rows.length; BH_SW.rows.push(row); AI_SET.add(ch); }
  }
  function dropJahae(ch, known) {
    try { localStorage.removeItem((known ? XKEY : JKEY) + ch); } catch (e) { /* 저장 안 됨 */ }
    if (known) return;
    if (AI_SET.has(ch)) { delete BH_SW.idx[ch]; AI_SET.delete(ch); }
  }
  async function askJahae(ch, btn, msg, known) {
    const code = typeof phGetCode === "function" ? phGetCode() : "";
    if (!code) { msg.textContent = "AI 비밀번호가 없습니다. 위의 「사진으로 찾기」에서 비밀번호를 한 번 저장해 주세요."; return; }
    btn.disabled = true;
    msg.textContent = "AI가 자해하는 중… (10~20초)";
    try {
      const res = await fetch(PHOTO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Code": code },
        body: JSON.stringify({ mode: "jahae", char: ch, known: known || "" }),
      });
      const d = await res.json();
      if (!res.ok) { msg.textContent = "풀이하지 못했습니다: " + (d.error || res.status); return; }
      if (d.mode !== "jahae") { msg.textContent = "서버(Cloudflare 워커)가 아직 자해 기능이 없는 옛 버전입니다. 새 worker.js로 갱신해 주세요."; return; }
      if (!known && (!d.parts || !d.parts.length)) { msg.textContent = "AI가 구성요소를 내놓지 못했습니다." + (d.note ? " " + d.note : ""); return; }
      try { localStorage.setItem((known ? XKEY : JKEY) + ch, JSON.stringify(d)); } catch (e) { /* 저장 안 됨 */ }
      if (!known) applyJahae(ch, d);
      explain(ch);
    } catch (e) {
      msg.textContent = "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
    } finally { btn.disabled = false; }
  }
  function jahaeBlock(ch, d, known) {
    const box = document.createElement("div");
    box.className = "bh-basic bh-jahae";
    if (d.shuowen) box.insertAdjacentHTML("beforeend", `<p class="bh-say"><b>《說文》과의 관계</b> — ${esc(d.shuowen)}</p>`);
    const f = d.parts.map((p) => `${esc(p.c)}(${esc(p.mean || "")}${isSound(p.role) ? "·소리" : ""})`).join(" + ");
    box.insertAdjacentHTML("beforeend", `<p class="bh-say bh-formula">${esc(ch)} = ${f}</p>`);
    if (d.jx) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">한자 원리로 읽기 — 고유부호·방향·결설 구조</div><p class="bh-say">${esc(d.jx)}</p>`);
    if (d.jahae) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">통설 풀이 — 《說文》·자전</div><p class="bh-say">${esc(d.jahae)}</p>`);
    if (d.sori) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">소리</div><p class="bh-say">${esc(d.sori)}</p>`);
    if (d.hun) box.insertAdjacentHTML("beforeend", `<p class="bh-say">훈: <b>${esc(d.hun)}</b></p>`);
    if (d.note) box.insertAdjacentHTML("beforeend", `<p class="bh-say bh-note">${esc(d.note)}</p>`);
    box.insertAdjacentHTML("beforeend", `<div class="bh-src">AI(Claude)가 『한자해례 1800+』 「한자 원리」(최규화)를 해석 틀로 삼아 풀이한 것입니다${d.sure === false ? " — <b>AI도 확신하지 못한 풀이</b>" : ""}. 《說文》 원문이 아니므로 자전으로 확인해 주세요.${known ? "" : " 아래 자형 분해는 이 구성요소에서부터 《說文》을 따라 이어 갑니다."}</div>`);
    const bar = document.createElement("div");
    bar.className = "buttons";
    const again = document.createElement("button");
    again.type = "button"; again.className = "btn"; again.textContent = "다시 풀이";
    const del = document.createElement("button");
    del.type = "button"; del.className = "btn"; del.textContent = "풀이 지우기";
    const msg = document.createElement("p");
    msg.className = "hint";
    again.addEventListener("click", () => askJahae(ch, again, msg, known));
    del.addEventListener("click", () => { dropJahae(ch, !!known); explain(ch); });
    bar.append(again, del);
    box.append(bar, msg);
    return box;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  // ===== 글자 풀이 =====
  async function explain(ch) {
    const card = $("bh-card"), body = $("bh-body");
    card.hidden = false;
    body.innerHTML = '<p class="hint">說文 자료를 불러오는 중…</p>';
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    try { await loadSW(); } catch (e) { body.innerHTML = `<p class="hint">${e.message}</p>`; return; }
    body.innerHTML = "";
    if (swEntry(ch) === null || AI_SET.has(ch)) applyJahae(ch, jahaeCached(ch));   // 이 기기에 저장한 AI 자해
    const ai = AI_SET.has(ch) ? jahaeCached(ch) : null;
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
      const box = document.createElement("div");
      box.className = "bh-basic bh-jahae";
      box.insertAdjacentHTML("beforeend", '<p class="bh-say">《說文解字》 표제자에서 바로 찾지 못한 글자입니다. 說文에 이체(古文·篆文 등)로 실렸거나 《說文》 이후에 생긴 글자일 수 있습니다.</p>' +
        '<p class="bh-say"><b>AI로 자해하기</b>를 누르면 AI가 자원(字源)에 따라 구성요소를 나누고, 그 구성요소부터는 《說文》 자형 분해와 기초자 해독으로 이어서 보여 드립니다.</p>');
      const bar = document.createElement("div");
      bar.className = "buttons";
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "btn primary"; btn.textContent = "AI로 자해하기";
      const msg = document.createElement("p");
      msg.className = "hint";
      btn.addEventListener("click", () => askJahae(ch, btn, msg));
      bar.appendChild(btn);
      box.append(bar, msg);
      body.appendChild(box);
    }
    if (ai) body.appendChild(step("AI 자해 — 《說文》 표제자에 없는 글자", true, (b) => b.appendChild(jahaeBlock(ch, ai, ""))));
    const ki = KBYCH[ch] ?? (BH_VAR[ch] !== undefined ? KBYCH[BH_VAR[ch]] : undefined);
    if (ki !== undefined) body.appendChild(step(`기초자 설명 — ${K[ki].hun}`, false, (b) => b.appendChild(basicBlock(K[ki]))));
    if (e || BOOK[ch] !== undefined) {
      body.appendChild(step(ai ? "자형 분해 — AI가 나눈 구성요소부터" : "자형 분해", ki === undefined && !ai, (b) => {
        const ul = document.createElement("ul");
        ul.className = "bh-tree";
        ul.appendChild(nodeLi(BH_VAR[ch] && BH_SW.idx[ch] === undefined ? BH_VAR[ch] : ch, null, 0, new Set()));
        b.appendChild(ul);
        b.insertAdjacentHTML("beforeend", '<div class="bh-src">부수까지 나누는 단계는 《說文》의 구성(从○○聲)을 따라 자동으로 만든 것이고, 분해표는 540부수에 대한 저자의 분해입니다.</div>');
      }));
      // 마지막 단계: 기본자형의 뜻으로 훈 만들기
      const root = BH_VAR[ch] && BH_SW.idx[ch] === undefined ? BH_VAR[ch] : ch;
      body.appendChild(step("소전 해독 — 기본자형의 뜻으로 훈 만들기", false, (b) => b.appendChild(decodeBlock(ch, root))));
    }
    // 說文 표제자 글자: 기본 부호를 틀로 한 AI 자형 해석 (說文 구성을 함께 보내 그대로 따르게 함)
    if (e && !ai) {
      const known = e[3].map(([c, r]) => `${c}(${ROLE[r] || r})`).join(" + ") || "더 나누지 않음(象形·指事 등)";
      const saved = jxCached(ch);
      body.appendChild(step("AI 자형 해석 — 한자 원리로 읽기", !!saved, (b) => {
        if (saved) { b.appendChild(jahaeBlock(ch, saved, known)); return; }
        b.insertAdjacentHTML("beforeend", `<p class="bh-say">AI가 「한자 원리」(방향·고유부호·뜻·소리)를 해석 틀로 삼아, 《說文》 구성(${esc(known)})을 따라 이 소전의 획과 면을 읽어 줍니다.</p>`);
        const bar = document.createElement("div");
        bar.className = "buttons";
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn primary"; btn.textContent = "AI로 자형 해석하기";
        const msg = document.createElement("p");
        msg.className = "hint";
        btn.addEventListener("click", () => askJahae(ch, btn, msg, known));
        bar.appendChild(btn);
        b.append(bar, msg);
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
  // ===== 기본 부호 참고 칸 =====
  let buhoDrawn = false;
  function drawBuho() {
    const box = $("bh-buho-body");
    const d = BU.dir;
    let h = `<div class="bh-h4">한자와 방향</div>` + d.say.map((t) => `<p class="bh-say">${esc(t)}</p>`).join("") +
      `<table class="bh-dir"><tbody>${d.rows.map(([c, w, m]) => `<tr><th>${c}</th><td>${esc(m)}</td></tr>`).join("")}</tbody></table>` +
      `<div class="bh-h4">고유부호 (기본 획)</div><p class="bh-say">${esc(BU.intro)}</p>` +
      `<table class="bh-dir bh-bu"><thead><tr><th>부호</th><th>소전 모양</th><th>뜻</th><th>예</th></tr></thead><tbody>` +
      BU.items.map((b) => `<tr><th>${b.ch}<div class="bh-note">${esc(b.hun)}</div></th><td>${esc(b.seal)}</td><td>${esc(b.mean.join(", "))}</td><td>${esc(b.ex)}</td></tr>`).join("") +
      `</tbody></table><p class="bh-say">${esc(BU.face)}</p>`;
    box.innerHTML = h;
    BU.items.forEach((b) => {
      const det = document.createElement("details");
      det.className = "bh-step";
      det.innerHTML = `<summary>${b.ch} (${esc(b.hun)}) — ${esc(b.mean.join(", "))}</summary><div class="bh-step-body">` +
        `<p class="bh-say">${esc(b.say)}</p>` +
        b.egs.map(([c, t]) => `<p class="bh-say">예) <b>${c}</b> — ${esc(t)}</p>`).join("") +
        (b.key ? `<p class="bh-say">▶ ${esc(b.key)}</p>` : "") + (b.sw ? `<p class="bh-say bh-note">說 ${esc(b.sw)}</p>` : "") + "</div>";
      box.appendChild(det);
    });
    box.insertAdjacentHTML("beforeend", `<div class="bh-h4">참고 — 점</div><p class="bh-say">${esc(BU.dot)}</p>`);
    const sec = (title, rows) => {
      box.insertAdjacentHTML("beforeend", `<div class="bh-h4">${title}</div>`);
      rows.forEach(([t, say, egs]) => {
        const det = document.createElement("details");
        det.className = "bh-step";
        det.innerHTML = `<summary>${esc(t)}</summary><div class="bh-step-body"><p class="bh-say">${esc(say)}</p>` +
          (egs || []).map(([c, x]) => `<p class="bh-say">예) <b>${c}</b> — ${esc(x)}</p>`).join("") + "</div>";
        box.appendChild(det);
      });
    };
    if (BU.yi) sec("뜻(字義)", BU.yi);
    if (BU.eum) sec("소리(字音)", BU.eum);
    if (BU.pic) box.insertAdjacentHTML("beforeend", `<p class="bh-say">${esc(BU.pic)}</p>`);
    box.insertAdjacentHTML("beforeend", `<div class="bh-src">출처: ${esc(BU.src)}. 저자의 허락을 받아 옮겼습니다(일부는 줄여 옮김). 이 내용은 AI 자형 해석의 해석 틀로 쓰입니다.</div>`);
  }
  if ($("bh-buho")) $("bh-buho").addEventListener("toggle", () => {
    if (!$("bh-buho").open || buhoDrawn) return;
    buhoDrawn = true; drawBuho();
  });

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
  function showRad(i, scroll) {
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
      b.addEventListener("click", () => showRad(j, true));
      nav.appendChild(b);
    });
    head.appendChild(nav);
    box.appendChild(head);
    box.appendChild(chartFor(i));
    // 목록에서 글자를 누르면 위의 분해표로 바로 이동
    if (scroll) box.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function drawRadList() {
    const q = $("bh-q").value.trim(), g = $("bh-rgrid");
    g.innerHTML = "";
    const list = R.filter((r) => !q || (/^\d+$/.test(q) ? r.num === +q : /^\d{1,2}[上下]$/.test(q) ? r.juan === q : r.ch === q || r.alt === q));
    list.forEach((r) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-cand";
      b.innerHTML = `<span class="rk">${r.ch}</span><span class="ry">${pad3(r.num)}</span>`;
      b.addEventListener("click", () => showRad(r.i, true));
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
