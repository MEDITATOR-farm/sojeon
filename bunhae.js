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
  // 교육용 1800자의 이체·본자 소전 연결 (bunhae/s1800.js) — 글자 → [소전을 찾을 글자, 표시]
  const SEALOF = {};
  (window.BH_S1800 || []).forEach((g) => g[3].forEach(([c, s, t]) => { if (s) SEALOF[c] = [s, t]; }));
  function sealEl(ch) {
    if (!RVAR && window.BH_VAR) { RVAR = {}; Object.entries(BH_VAR).forEach(([k, v]) => { if (!(v in RVAR)) RVAR[v] = k; }); }
    const key = [ch, SEALOF[ch] && SEALOF[ch][0], window.BH_VAR && BH_VAR[ch], RVAR && RVAR[ch]].find((c) => c && SHUOWEN[c]);
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
    // 책의 자세한 설명 (『한자해례 1800+』 「기초자 80」) — AI 자해의 바탕과 같은 내용
    const D = window.BH_K80DET || {};
    const det = k.chars.map((c) => D[c]).find(Boolean) || (k.hun.includes("길짐승") ? D["𠂹"] : k.hun.includes("날짐승") ? D["날짐승"] : null);
    if (det) {
      const d = document.createElement("details");
      d.className = "bh-step";
      d.open = true;
      const lines = det.text.split("\n").map((t) => {
        const e = t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]);
        return /^(구성|풀이|▶|說|\[참고\])/.test(t) ? `<p class="bh-say">${e.replace(/^(구성:|풀이:|▶|說:|\[참고\])/, "<b>$1</b>")}</p>` : `<p class="bh-say">${e}</p>`;
      }).join("");
      d.innerHTML = `<summary>자세한 설명 — 『한자해례 1800+』 기초자 80</summary><div class="bh-step-body">${lines}<div class="bh-src">출처: 최규화, 『한자해례 1800+』(도서출판 한자해례) 「기초자 80」. 저자의 허락을 받아 옮겼습니다(사진·도판은 빼고 일부는 줄여 옮김).</div></div>`;
      box.appendChild(d);
    }
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

  // 기본자형 모으기 — 기초자 80자 → 고유부호 → 540부수(저자 분해표)에서 멈추고, 그 밖의 글자는 AI가 소전을 보고 나눈 트리를 따라 내려감.
  // 《說文》의 구성 설명(从○○聲)은 쓰지 않음.
  function basicLeaves(ch, role, depth, seen, via, node) {
    const k = kIndex(ch);
    if (k !== undefined) return [{ ch, role: "", k, via }];
    if (buho(ch)) return [{ ch, role: "", k: undefined, b: buho(ch), via }];
    if (radIndex(ch) !== undefined) return [{ ch, role: "", k: undefined, r: radIndex(ch), via }];
    if (depth === 0 && !node) node = (splitCached(ch) || {}).tree;
    if (!node || !node.parts || !node.parts.length || depth >= 5) return [{ ch, role: "", k: undefined, via }];
    return node.parts.flatMap((p) => basicLeaves(p.c, "", depth + 1, seen, depth === 0 ? "" : (via ? via + "›" : "") + ch, p));
  }
  function radIndex(ch) {
    if (BOOK[ch] !== undefined) return BOOK[ch];
    if (window.BH_VAR && BH_VAR[ch] && BOOK[BH_VAR[ch]] !== undefined) return BOOK[BH_VAR[ch]];
    return undefined;
  }
  function meaningWords(k) {
    const src = k.scr || k.say || "";
    const vid = src.split(/\s*[\/,，.。]\s*|\s*\d+\.\s*|\s*=\s*/).map((x) => x.trim()).filter((x) => x && x.length <= 12);
    // 책(『한자해례 1800+』 기초자 80)의 ▶ 뜻 낱말도 함께
    const D = window.BH_K80DET || {};
    const det = k.chars.map((c) => D[c]).find(Boolean);
    const book = det ? det.text.split("\n").filter((t) => t.startsWith("▶")).join(", ").replace(/▶/g, "").split(/\s*[,/]\s*/)
      .map((x) => x.replace(/^[^:]*:\s*/, "").replace(/\(.*?\)/g, "").trim()).filter((x) => x && x.length <= 12) : [];
    return [...new Set([...vid, ...book])];
  }
  function hunKey(ch) { return "sojeon-hun-" + ch; }
  function loadHun(ch) { try { return localStorage.getItem(hunKey(ch)) || ""; } catch (e) { return ""; } }
  function saveHun(ch, v) { try { v ? localStorage.setItem(hunKey(ch), v) : localStorage.removeItem(hunKey(ch)); } catch (e) {} }

  // 저자 분해표 읽는 규칙: 갈래마다 첫 칸이 기초자 80자면 거기서 멈추고, 아니면 한 칸 오른쪽(한 단계 더 나눈 조각)으로.
  // 고유부호(동그라미)에 닿으면 그것으로. 칸 (r,c)의 윗 단계는 c-1 칸 가운데 r보다 위·같은 줄에서 가장 가까운 것.
  function chartLeaves(cells) {
    const cs = cells.slice().sort((a, b) => a.r - b.r || a.c - b.c);
    const kids = new Map(cs.map((x) => [x, []]));
    const roots = [];
    cs.forEach((x) => {
      if (x.c === 0) { roots.push(x); return; }
      const up = cs.filter((y) => y.c === x.c - 1 && y.r <= x.r).sort((a, b) => b.r - a.r)[0];
      if (up) kids.get(up).push(x); else roots.push(x);
    });
    const out = [];
    const walk = (x, path) => {
      const p = path ? path + "›" + x.ch : x.ch;
      const k = kIndex(x.ch);
      if (k !== undefined) { out.push({ ch: x.ch, k, path: p }); return; }
      if (x.circle || buho(x.ch) || !kids.get(x).length) { out.push({ ch: x.ch, k: undefined, circle: x.circle, path: p }); return; }
      kids.get(x).forEach((y) => walk(y, p));
    };
    roots.forEach((x) => walk(x, ""));
    return out;
  }

  function decodeBlock(ch, root) {
    const box = document.createElement("div");
    box.className = "bh-decode";
    // AI가 옮겨 적은 저자 분해표 칸에 읽는 규칙을 적용해, 그 540부수 자리를 기초자·고유부호로 바꿔 넣음
    const ai = jxCached(ch);
    const grids = (ai && Array.isArray(ai.grids)) ? ai.grids : [];
    const leaves = basicLeaves(root, "", 0, new Set(), "").flatMap((l) => {
      if (l.r === undefined) return [l];
      const g = grids.find((x) => x.from === l.ch) || (grids.length === 1 ? grids[0] : null);
      const got = g ? chartLeaves(g.cells) : [];
      if (!got.length) return [l];
      return got.map((f) => ({ ch: f.ch, role: "", k: kIndex(f.ch), b: f.k === undefined ? (buho(f.ch) || (f.circle ? { hun: "고유부호", seal: "", mean: [], key: "" } : undefined)) : undefined,
        via: `${l.ch} 분해표 ${f.path}(AI 판독)` }));
    });
    const found = leaves.filter((l) => l.k !== undefined || l.b || l.r !== undefined);

    // ① 찾은 기본자형과 그 뜻
    box.insertAdjacentHTML("beforeend", `<div class="bh-h4">① 기본자형 ${leaves.length}개 — 기초자·기본 부호·540부수 분해표에서 찾은 것 ${found.length}개</div>`);
    const list = document.createElement("div");
    list.className = "bh-leaves";
    const draft = document.createElement("textarea");
    leaves.forEach((l) => {
      const card = document.createElement("div");
      card.className = "bh-leaf" + (l.k === undefined && !l.b && l.r === undefined ? " missing" : "");
      const top = document.createElement("div");
      top.className = "bh-node";
      const sb = document.createElement("span");
      sb.className = "bh-sb";
      const sl = sealEl(l.ch);
      if (sl) sb.appendChild(sl); else sb.innerHTML = '<span class="bh-note">없음</span>';
      top.appendChild(sb);
      const k = l.k !== undefined ? K[l.k] : null;
      top.insertAdjacentHTML("beforeend", `<span class="bh-nc">${l.ch}</span><span class="bh-hun">${k ? k.hun : l.b ? l.b.hun + " · 기본 부호 " + l.b.seal : (huneumOf(l.ch) || "") + (l.r !== undefined ? ` · 부수 ${pad3(R[l.r].num)}` : "")}</span>` +
        ``+
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
      } else if (l.r !== undefined) {
        // 기초자가 아닌 540부수: 저자의 분해표가 기준. 표의 조각은 아래 「AI 자형 해석」이 기초자·고유부호로 읽음
        card.insertAdjacentHTML("beforeend", `<div class="bh-note">기초자 80자는 아니고 540부수입니다. 저자의 분해표에 나눈 조각이 기준이며, 아래 「AI 자형 해석」이 이 분해표를 읽어 기초자·고유부호로 풀이합니다.</div>`);
        card.appendChild(radButton(l.r, card, false));
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
    box.insertAdjacentHTML("beforeend", '<div class="bh-src">뜻 낱말: 한자해례 「기초자81」 영상 화면, 기본 부호는 「고유부호(기본 획)」(최규화). 기본자형까지 나누는 단계는 저자 분해표와 AI의 소전 판독으로 만든 것이라 틀릴 수 있습니다. 지은 훈은 이 기기에만 저장됩니다.</div>');
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

  // 서버 오류를 사람이 읽을 수 있게 — Claude API가 거절한 이유(상태 번호·설명)도 함께 보여 줌
  function apiErr(d, status) {
    let why = d.error || status;
    if (d.status) {
      const t = String(d.detail || "");
      const m = t.match(/"message"\s*:\s*"([^"]+)"/);
      const hint = d.status === 401 ? " → API 키가 틀렸거나 없습니다(워커의 ANTHROPIC_API_KEY 확인)"
        : /credit balance/i.test(t) ? " → Anthropic 계정의 크레딧(잔액)이 부족합니다. console.anthropic.com에서 충전해 주세요"
        : d.status === 429 ? " → 짧은 시간에 요청이 많았습니다. 1분쯤 뒤에 다시 눌러 주세요"
        : d.status === 529 || d.status === 503 ? " → Claude 서버가 붐빕니다. 잠시 뒤에 다시 눌러 주세요"
        : d.status === 400 ? " → 요청 형식 문제입니다. 아래 설명을 알려 주세요" : "";
      why += ` (${d.status})${hint}${m ? " — " + m[1] : t ? " — " + t.slice(0, 160) : ""}`;
    }
    return why;
  }
  // ===== AI 자해: 《說文》 표제자로 바로 찾을 수 없는 글자 =====
  // AI(사진 읽기와 같은 서버, mode "jahae")가 자원(字源)에 따른 구성요소를 주면, 그 구성을 임시 說文 항목으로 넣어
  // 아래의 자형 분해(說文 트리)·소전 해독(기초자)을 그대로 이어서 씀. 결과는 이 기기에 저장해 다음부터는 무료.
  const JKEY = "sojeon-jahae2-";   // 2: 기초자 80자 기준 해석(說文 따르지 않음). 예전 說文 기준 결과(sojeon-jahae-)는 쓰지 않음
  const XKEY = "sojeon-jx4-";      // 4: 분해표 칸 옮겨 적기(grids) + 사이트가 읽는 규칙 적용      // 3: 자형 분해도의 기본자형(기초자 80자 뜻)으로 해석
  // 자형 분해도에서 찾은 기본자형과 그 뜻 — AI에게 보내 이것만으로 해석하게 함
  // 저자 분해표 한 칸을 그림(JPEG base64)으로 잘라 AI에게 보냄
  const sheetCache = {};
  async function chartImage(i) {
    const r = R[i], src = `bunhae/s/${String(r.sheet).padStart(2, "0")}.webp`;
    sheetCache[src] = sheetCache[src] || new Promise((ok, no) => { const im = new Image(); im.onload = () => ok(im); im.onerror = no; im.src = src; });
    const im = await sheetCache[src];
    const k = Math.min(1, 1000 / r.w);
    const c = document.createElement("canvas");
    c.width = Math.round(r.w * k); c.height = Math.round(r.h * k);
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(im, 0, r.sy, r.w, r.h, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.85).split(",")[1];
  }
  async function withCharts(leaves) {
    let n = 0;
    for (const l of leaves) {
      if (l.kind === "분해표" && n < 4) { try { l.image = await chartImage(l.r); n++; } catch (e) { /* 그림 없이 보냄 */ } }
      delete l.r;
    }
    return leaves;
  }
  function rootOf(ch) { return BH_VAR[ch] && BH_SW.idx[ch] === undefined ? BH_VAR[ch] : ch; }
  function leafPayload(root) {
    return basicLeaves(root, "", 0, new Set(), "").map((l) => {
      if (l.k !== undefined) { const k = K[l.k]; return { c: l.ch, kind: "기초자", hun: k.hun, mean: k.scr || "", say: k.say || "" }; }
      if (l.b) return { c: l.ch, kind: "부호", hun: l.b.hun, mean: buhoWords(l.b).join(", ") };
      if (l.r !== undefined) return { c: l.ch, kind: "분해표", hun: huneumOf(l.ch) || "", r: l.r };
      return { c: l.ch, kind: "기타", hun: huneumOf(l.ch) || "" };
    });
  }        // 說文 표제자 글자의 AI 자형 해석 (분해 트리는 說文 그대로 두고 해석만 덧붙임)
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
  async function askJahae(ch, btn, msg, known, leaves) {
    const code = typeof phGetCode === "function" ? phGetCode() : "";
    if (!code) { msg.textContent = "AI 비밀번호가 없습니다. 위의 「사진으로 찾기」에서 비밀번호를 한 번 저장해 주세요."; return; }
    btn.disabled = true;
    msg.textContent = "AI가 해석하는 중… (10~30초)";
    try {
      const res = await fetch(PHOTO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Code": code },
        body: JSON.stringify(leaves ? { mode: "jahae", char: ch, leaves: await withCharts(leaves) } : { mode: "jahae", char: ch }),
      });
      const d = await res.json();
      if (!res.ok) { msg.textContent = "풀이하지 못했습니다: " + apiErr(d, res.status); return; }
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
    const f = d.parts.map((p) => `${esc(p.c)}(${esc(p.mean || "")}${isSound(p.role) ? "·소리" : ""})`).join(" + ");
    if (d.parts && d.parts.length) box.insertAdjacentHTML("beforeend", `<p class="bh-say bh-formula">${esc(ch)} = ${f}</p>`);
    if (d.kicho) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">기초자로 나누기</div><p class="bh-say bh-formula">${esc(d.kicho)}</p>`);
    (d.grids || []).forEach((g) => {
      // AI가 옮겨 적은 분해표 칸 — 저자 분해표와 맞는지 눈으로 확인할 수 있게
      const nr = Math.max(...g.cells.map((x) => x.r)) + 1, nc = Math.max(...g.cells.map((x) => x.c)) + 1;
      let t = `<div class="bh-h4">${esc(g.from)} 분해표를 AI가 옮겨 적은 것 <span class="rs-sub">(동그라미 = ◯, 기초자 = 굵게)</span></div><table class="bh-dir bh-grid"><tbody>`;
      for (let r = 0; r < nr; r++) {
        t += "<tr>";
        for (let c = 0; c < nc; c++) {
          const x = g.cells.find((y) => y.r === r && y.c === c);
          t += `<td>${x ? (kIndex(x.ch) !== undefined ? `<b>${esc(x.ch)}</b>` : esc(x.ch)) + (x.circle ? "◯" : "") : ""}</td>`;
        }
        t += "</tr>";
      }
      t += `</tbody></table><p class="bh-say bh-note">읽는 규칙(첫 칸부터 기초자를 찾고, 없으면 한 단계 오른쪽으로) 적용 결과: ${chartLeaves(g.cells).map((x) => esc(x.path)).join(" · ")}</p>`;
      box.insertAdjacentHTML("beforeend", t);
    });
    if (d.jx) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">자형 해석 — 기초자·고유부호·결설 구조</div><p class="bh-say">${esc(d.jx)}</p>`);
    if (d.sori) box.insertAdjacentHTML("beforeend", `<div class="bh-h4">소리</div><p class="bh-say">${esc(d.sori)}</p>`);
    if (d.hun) box.insertAdjacentHTML("beforeend", `<p class="bh-say">훈: <b>${esc(d.hun)}</b></p>`);
    if (d.note) box.insertAdjacentHTML("beforeend", `<p class="bh-say bh-note">${esc(d.note)}</p>`);
    box.insertAdjacentHTML("beforeend", `<div class="bh-src">AI(Claude)가 ${known ? "자형 분해도의 기본자형과 그 " : ""}기초자 80자 뜻, 『한자해례 1800+』 「한자 원리」(최규화)만으로 해석한 것입니다(《說文》 풀이는 따르지 않음)${d.sure === false ? " — <b>기초자로 깔끔하게 나눠지지 않아 AI도 확신하지 못한 해석</b>" : ""}. 저자의 해석과 다를 수 있으니 확인해 주세요.${known ? "" : " 아래 자형 분해는 AI가 나눈 구성요소에서부터 이어 갑니다."}</div>`);
    const bar = document.createElement("div");
    bar.className = "buttons";
    const again = document.createElement("button");
    again.type = "button"; again.className = "btn"; again.textContent = "다시 풀이";
    const del = document.createElement("button");
    del.type = "button"; del.className = "btn"; del.textContent = "풀이 지우기";
    const msg = document.createElement("p");
    msg.className = "hint";
    again.addEventListener("click", () => askJahae(ch, again, msg, known, known ? leafPayload(ch) : null));
    del.addEventListener("click", () => { dropJahae(ch, !!known); explain(ch); });
    bar.append(again, del);
    box.append(bar, msg);
    return box;
  }
  function esc(t) { return String(t).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]); }

  // ===== 글자 풀이 =====
  // ===== AI 자형 분해: 소전 그림을 보고 기초자 80자·540부수·고유부호에 닿을 때까지 나눔 (워커 mode "split") =====
  const SKEY = "sojeon-split-";
  function splitCached(ch) { try { return JSON.parse(localStorage.getItem(SKEY + ch) || "null"); } catch (e) { return null; } }
  async function sealPng(ch) {
    // 화면의 소전(說文 그림 조각 또는 글꼴 SVG)을 256×256 흰 바탕 그림으로 (script.js의 glyphPiece 사용)
    const sp = document.createElement("span");
    const el = sealEl(ch);
    if (!el || typeof glyphPiece !== "function") return "";
    sp.appendChild(el);
    const p = await glyphPiece(sp);
    if (!p.im) return "";
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, 256, 256);
    if (p.sw) g.drawImage(p.im, p.sx, p.sy, p.sw, p.sw, 16, 16, 224, 224); else g.drawImage(p.im, 16, 16, 224, 224);
    return c.toDataURL("image/png").split(",")[1];
  }
  async function askSplit(ch, btn, msg) {
    const code = typeof phGetCode === "function" ? phGetCode() : "";
    if (!code) { msg.textContent = "AI 비밀번호가 없습니다. 위의 「사진으로 찾기」에서 비밀번호를 한 번 저장해 주세요."; return; }
    btn.disabled = true;
    msg.textContent = "AI가 소전을 보고 나누는 중… (10~30초)";
    try {
      let image = "";
      try { image = await sealPng(ch); } catch (e) { /* 그림 없이 */ }
      const res = await fetch(PHOTO_API, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Access-Code": code },
        body: JSON.stringify({ mode: "split", char: ch, image }),
      });
      const d = await res.json();
      if (!res.ok) { msg.textContent = "나누지 못했습니다: " + apiErr(d, res.status); return; }
      if (d.mode !== "split") { msg.textContent = "서버(Cloudflare 워커)가 아직 자형 분해 기능이 없는 옛 버전입니다. 새 worker.js로 갱신해 주세요."; return; }
      try { localStorage.setItem(SKEY + ch, JSON.stringify(d)); } catch (e) { /* 저장 안 됨 */ }
      try { localStorage.removeItem(XKEY + ch); } catch (e) { /* 분해가 바뀌면 예전 해석은 지움 */ }
      explain(ch);
    } catch (e) {
      msg.textContent = "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
    } finally { btn.disabled = false; }
  }
  // 분해 트리의 한 줄: 기초자 80자 / 고유부호 / 540부수(분해표) / 더 나눈 글자
  function treeLi(n, depth) {
    const li = document.createElement("li");
    const row = document.createElement("div");
    row.className = "bh-node";
    const sb = document.createElement("span");
    sb.className = "bh-sb";
    const sl = sealEl(n.c);
    if (sl) sb.appendChild(sl); else sb.innerHTML = '<span class="bh-note">없음</span>';
    row.appendChild(sb);
    row.insertAdjacentHTML("beforeend", `<span class="bh-nc">${esc(n.c)}</span>`);
    li.appendChild(row);
    const k = kIndex(n.c);
    if (depth > 0 && k !== undefined) { row.insertAdjacentHTML("beforeend", `<span class="bh-tag sheng">기초자 · ${esc(K[k].hun)}</span>`); return li; }
    if (depth > 0 && buho(n.c)) { row.insertAdjacentHTML("beforeend", `<span class="bh-tag">고유부호 · ${esc(buho(n.c).mean.join(", "))}</span>`); return li; }
    const ri = radIndex(n.c);
    if (ri !== undefined) { row.appendChild(radButton(ri, li, depth === 0)); return li; }
    if (n.parts && n.parts.length) {
      const ul = document.createElement("ul");
      n.parts.forEach((p) => ul.appendChild(treeLi(p, depth + 1)));
      li.appendChild(ul);
    } else if (depth > 0) row.insertAdjacentHTML("beforeend", '<span class="bh-note">더 나누지 않음</span>');
    return li;
  }
  function splitButton(ch, label, holder) {
    const bar = document.createElement("div");
    bar.className = "buttons";
    const btn = document.createElement("button");
    btn.type = "button"; btn.className = label.startsWith("다시") ? "btn" : "btn primary"; btn.textContent = label;
    const msg = document.createElement("p");
    msg.className = "hint";
    btn.addEventListener("click", () => askSplit(ch, btn, msg));
    bar.appendChild(btn);
    holder.append(bar, msg);
  }

  // ===== 글자 풀이를 카톡으로 보내기 =====
  const SITE = "https://meditator-farm.github.io/sojeon/";
  function treeText(n, depth, out) {
    const pad = "  ".repeat(depth);
    let tag = "";
    const k = kIndex(n.c), b = buho(n.c), ri = radIndex(n.c);
    if (depth > 0 && k !== undefined) tag = ` — 기초자(${K[k].hun})`;
    else if (depth > 0 && b) tag = ` — 고유부호(${b.mean.join(", ")})`;
    else if (ri !== undefined) tag = ` — 540부수 ${pad3(R[ri].num)}(저자 분해표)`;
    out.push(`${pad}${depth ? "└ " : ""}${n.c}${tag}`);
    if (depth === 0 || (k === undefined && !b && ri === undefined)) (n.parts || []).forEach((p) => treeText(p, depth + 1, out));
    return out;
  }
  function shareText(ch) {
    const L = [];
    const so = SEALOF[ch];
    L.push(`【${ch}】 ${(huneumOf(ch) || "").split(",")[0]}`);
    if (so) L.push(`(소전: ${so[1] === "本" ? "본자" : so[1] === "古" ? "고문" : so[1] === "重" ? "重文" : "이체자"} ${so[0]}의 소전)`);
    const ki = kIndex(ch), ri = radIndex(ch), sp = splitCached(ch), jx = jxCached(ch);
    L.push("", "■ 자형 분해");
    if (ki !== undefined) L.push(`기초자 80자 — ${K[ki].hun}`);
    else if (ri !== undefined) L.push(`540부수 ${pad3(R[ri].num)} — 저자(최규화) 분해표 기준`);
    else if (sp && sp.tree) L.push(...treeText(sp.tree, 0, []));
    else L.push("(아직 나누지 않음)");
    const leaves = leafPayload(ch);
    if (leaves.length) L.push("기본자형: " + leaves.map((l) => l.c + (l.hun ? `(${l.hun})` : "")).join(" + "));
    if (jx) {
      L.push("", "■ AI 자형 해석 (기초자 80자 기준)");
      if (jx.kicho) L.push(jx.kicho);
      if (jx.jx) L.push("", jx.jx);
      if (jx.hun) L.push("", "훈: " + jx.hun);
      if (jx.note) L.push("※ " + jx.note);
    }
    const hun = (() => { try { return localStorage.getItem("sojeon-hun-" + ch) || ""; } catch (e) { return ""; } })();
    if (hun.trim()) L.push("", "■ 내가 지은 훈", hun.trim());
    L.push("", "자형 분해·해석: 기초자 80자·540부수 분해표(최규화)와 AI 판독. 자전으로 확인 바람.", SITE + "#c=" + encodeURIComponent(ch));
    return L.join("\n");
  }
  async function shareExplain(ch, withSeal, msg) {
    const text = shareText(ch);
    let files = [];
    if (withSeal) {
      try {
        const b64 = await sealPng(ch);
        if (b64) {
          const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
          files = [new File([bin], `소전_${ch}.png`, { type: "image/png" })];
        }
      } catch (e) { /* 그림 없이 */ }
    }
    // 휴대폰: 공유 창 → 카카오톡
    const data = files.length ? { files, text } : { text };
    if (navigator.share && (!files.length || (navigator.canShare && navigator.canShare({ files })))) {
      try { await navigator.share(data); return; } catch (e) { if (e && e.name === "AbortError") return; }
    }
    // PC: 복사 → 카톡 대화창에 Ctrl+V. 그림을 고르면 그림만 복사(카톡 PC는 한 번에 하나만 붙여 넣음)
    try {
      if (files.length && window.ClipboardItem) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": files[0] })]);
        msg.textContent = "소전 그림을 복사했습니다. 카톡 대화창에 Ctrl+V로 붙여 넣은 뒤, 「풀이를 카톡으로」를 눌러 글도 붙여 넣으세요.";
      } else {
        await navigator.clipboard.writeText(text);
        msg.textContent = "풀이 글을 복사했습니다. 카톡 대화창에 Ctrl+V로 붙여 넣으세요.";
      }
    } catch (e) {
      msg.textContent = "이 브라우저는 복사를 지원하지 않습니다. 아래 글을 길게 눌러 복사해 주세요.";
      const ta = document.createElement("textarea");
      ta.className = "bh-hunbox"; ta.value = text; ta.rows = 10;
      msg.after(ta);
    }
  }

  // ===== 글자 풀이 — 소전이 主, 해서는 附 =====
  // 근거: 소전 그림(《說文》 표제자 그림·이체·본자)만 씀. 《說文》 원문의 구성 설명은 쓰지 않음.
  // 기초자 80자 → 540부수(저자 분해표) → 그 밖은 AI가 소전을 보고 나눔.
  async function explain(ch) {
    const card = $("bh-card"), body = $("bh-body");
    card.hidden = false;
    body.innerHTML = '<p class="hint">자료를 불러오는 중…</p>';
    card.scrollIntoView({ behavior: "smooth", block: "start" });
    try { await loadSW(); } catch (e) { /* 이체 연결만 못 씀 */ }
    body.innerHTML = "";
    const head = document.createElement("div");
    head.className = "bh-head";
    const big = document.createElement("span");
    big.className = "bh-big";
    const sl = sealEl(ch);
    if (sl) big.appendChild(sl); else big.innerHTML = '<span class="bh-note">소전 없음</span>';
    const so = SEALOF[ch];
    const via = so ? ` <span class="bh-note">(${so[1] === "本" ? "본자" : so[1] === "古" ? "고문" : so[1] === "重" ? "重文" : "이체자"} ${esc(so[0])}의 소전)</span>`
      : (window.BH_VAR && BH_VAR[ch] && !(window.SHUOWEN && SHUOWEN[ch]) ? ` <span class="bh-note">(${esc(BH_VAR[ch])}의 소전)</span>` : "");
    head.appendChild(big);
    head.insertAdjacentHTML("beforeend", `<div><div class="bh-ch">${ch}${via}</div><div class="bh-hun">${huneumOf(ch) || ""}</div></div>`);
    body.appendChild(head);
    // 이 글자의 풀이(자형 분해·AI 해석)를 카톡으로
    {
      const bar = document.createElement("div");
      bar.className = "buttons bh-share";
      const b1 = document.createElement("button");
      b1.type = "button"; b1.className = "btn primary"; b1.textContent = "풀이를 카톡으로";
      const b2 = document.createElement("button");
      b2.type = "button"; b2.className = "btn"; b2.textContent = "소전 그림도 함께";
      const msg = document.createElement("p");
      msg.className = "hint";
      b1.addEventListener("click", () => shareExplain(ch, false, msg));
      b2.addEventListener("click", () => shareExplain(ch, true, msg));
      bar.append(b1, b2);
      body.append(bar, msg);
    }

    const ki = kIndex(ch);
    const ri = radIndex(ch);
    const sp = splitCached(ch);
    if (ki !== undefined) body.appendChild(step(`기초자 설명 — ${K[ki].hun}`, true, (b) => b.appendChild(basicBlock(K[ki]))));

    // 자형 분해
    body.appendChild(step("자형 분해", ki === undefined, (b) => {
      if (ki !== undefined) {
        b.insertAdjacentHTML("beforeend", '<p class="bh-say">기초자 80자입니다. 더 나누지 않고 기초자의 뜻을 그대로 씁니다.</p>');
        if (ri !== undefined) b.appendChild(chartFor(ri));
        return;
      }
      if (ri !== undefined) {
        const ul = document.createElement("ul");
        ul.className = "bh-tree";
        ul.appendChild(treeLi({ c: ch, parts: [] }, 0));
        b.appendChild(ul);
        b.insertAdjacentHTML("beforeend", '<div class="bh-src">540부수입니다. 저자(최규화)의 분해표가 기준이며, 아래 「AI 자형 해석」이 분해표에서 기초자를 찾아 풀이합니다.</div>');
        return;
      }
      if (sp && sp.tree) {
        const ul = document.createElement("ul");
        ul.className = "bh-tree";
        ul.appendChild(treeLi(sp.tree, 0));
        b.appendChild(ul);
        b.insertAdjacentHTML("beforeend", `<div class="bh-src">AI가 소전 그림을 보고 기초자 80자·540부수·고유부호에 닿을 때까지 나눈 것입니다${sp.sure === false ? " — <b>AI도 확신하지 못함</b>" : ""}.${sp.note ? " " + esc(sp.note) : ""} 540부수는 저자의 분해표가 기준입니다. 이 기기에 저장됩니다.</div>`);
        splitButton(ch, "다시 나누기", b);
        return;
      }
      b.insertAdjacentHTML("beforeend", '<p class="bh-say">이 글자는 기초자 80자도 540부수도 아닙니다. <b>AI로 자형 분해하기</b>를 누르면 AI가 이 글자의 소전 그림을 보고 기초자 80자·540부수·고유부호에 닿을 때까지 나눕니다. 《說文》의 구성 설명은 쓰지 않습니다.</p>');
      splitButton(ch, "AI로 자형 분해하기", b);
    }));

    // 소전 해독과 AI 자형 해석 — 기본자형을 모을 수 있을 때
    if (ki !== undefined || ri !== undefined || (sp && sp.tree)) {
      body.appendChild(step("소전 해독 — 기본자형의 뜻으로 훈 만들기", false, (b) => b.appendChild(decodeBlock(ch, ch))));
      const saved = jxCached(ch);
      body.appendChild(step("AI 자형 해석 — 자형 분해도의 기초자로 읽기", !!saved, (b) => {
        if (saved) { b.appendChild(jahaeBlock(ch, saved, "저자")); return; }
        b.insertAdjacentHTML("beforeend", `<p class="bh-say">AI가 위 <b>자형 분해에서 나온 기본자형</b>(${esc(leafPayload(ch).map((l) => l.c).join(" · "))})과 그 <b>기초자 80자 설명</b>만으로, 「한자 원리」(방향·결설 구조·유형)에 따라 소전을 해석합니다.</p>`);
        const bar = document.createElement("div");
        bar.className = "buttons";
        const btn = document.createElement("button");
        btn.type = "button"; btn.className = "btn primary"; btn.textContent = "AI로 자형 해석하기";
        const msg = document.createElement("p");
        msg.className = "hint";
        btn.addEventListener("click", () => askJahae(ch, btn, msg, "저자", leafPayload(ch)));
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
            // 540부수가 아닌 기초자: 구성은 책의 자세한 설명(구성:)을 따름 — 《說文》 구성 설명은 쓰지 않음
            b.insertAdjacentHTML("beforeend", `<p class="bh-say">${esc(ch)}는 540부수가 아닙니다. 구성은 위 「자세한 설명」의 <b>구성</b>을 보세요.</p>`);
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
  // ===== 소전 100: 자주 쓰는 부수 100개를 소전 중심으로 =====
  let s100Drawn = false;
  function drawS100() {
    const grid = $("s100-grid");
    (window.BH_S100 || []).forEach(([rank, rad, sealCh, no, n, ex, v, note]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "s100-cell";
      b.title = `${rank}위 ${rad}${v ? "(" + v + ")" : ""} — 교육용 1800자 중 ${n}자: ${ex}${note ? "\n" + note : ""}`;
      const sb = document.createElement("span");
      sb.className = "s100-seal";
      const sl = sealEl(sealCh);
      if (sl) sb.appendChild(sl);
      b.appendChild(sb);
      b.insertAdjacentHTML("beforeend", `<span class="s100-ks"><b>${rad}</b>${v ? `<small>${v}</small>` : ""}</span><span class="s100-meta">${rank} · ${n}자${note ? " *" : ""}</span>`);
      b.addEventListener("click", () => explain(sealCh));
      grid.appendChild(b);
    });
    const notes = (window.BH_S100 || []).filter((r) => r[7]).map((r) => `* ${r[1]}: ${r[7]}`);
    if (notes.length) grid.insertAdjacentHTML("afterend", `<p class="hint">${notes.join("<br>")}</p>`);
  }
  if ($("s100")) {
    $("s100").addEventListener("toggle", () => { if ($("s100").open && !s100Drawn) { s100Drawn = true; drawS100(); } });
    // 주소 끝이 #s100이면 바로 펼쳐서 보여 줌 (예: …/sojeon/#s100)
    const openByHash = () => {
      if (location.hash === "#s100") { $("s100").open = true; setTimeout(() => $("s100").scrollIntoView({ behavior: "smooth", block: "start" }), 300); }
    };
    openByHash();
    window.addEventListener("hashchange", openByHash);
    $("s100-send").addEventListener("click", () => {
      const inp = document.getElementById("input");
      inp.value = (window.BH_S100 || []).map((r) => r[2]).join("");
      document.getElementById("btn-convert").click();
      inp.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  // ===== 소전 1800: 교육용 기초한자를 부수별로, 소전 중심 =====
  function s1800Group(g) {
    const [rad, no, sealRad, items] = g;
    const det = document.createElement("details");
    det.className = "s1800-g";
    const sum = document.createElement("summary");
    const sb = document.createElement("span");
    sb.className = "bh-sb";
    const sl = sealEl(sealRad);
    if (sl) sb.appendChild(sl);
    sum.appendChild(sb);
    sum.insertAdjacentHTML("beforeend", `<span class="s1800-gname">${rad}</span><span class="s1800-gcount">${items.length}자</span>`);
    det.appendChild(sum);
    let drawn = false;
    det.addEventListener("toggle", () => {
      if (!det.open || drawn) return;
      drawn = true;
      const grid = document.createElement("div");
      grid.className = "s100-grid s1800-grid";
      items.forEach(([c, s, t]) => {
        const b = document.createElement("button");
        b.type = "button"; b.className = "s100-cell" + (t === "無" ? " s1800-none" : "");
        const box = document.createElement("span");
        box.className = "s100-seal";
        const e = sealEl(c);
        if (e) box.appendChild(e); else box.innerHTML = '<span class="bh-note">소전 없음</span>';
        b.appendChild(box);
        const mark = t ? `<i class="s1800-t">${t}${s ? " " + s : ""}</i>` : "";
        b.insertAdjacentHTML("beforeend", `<span class="s100-ks"><b>${c}</b></span><span class="s100-meta">${(huneumOf(c).split(",")[0] || "").trim()}</span>${mark}`);
        b.title = t ? ({ "重": "說文 重文", "異": "이체자", "本": "본자(옛 꼴)", "古": "고문", "字": "소전 글꼴", "無": "소전 없음" })[t] + (s ? " " + s + "의 소전" : "") : "說文 표제자";
        b.addEventListener("click", () => explain(c));
        grid.appendChild(b);
      });
      det.appendChild(grid);
    });
    return det;
  }
  let s1800Drawn = false;
  if ($("s1800")) {
    $("s1800").addEventListener("toggle", () => {
      if (!$("s1800").open || s1800Drawn) return;
      s1800Drawn = true;
      (window.BH_S1800 || []).forEach((g) => $("s1800-groups").appendChild(s1800Group(g)));
    });
    // 주소 끝이 #c=글자 이면 그 글자의 풀이를 바로 엶 (카톡으로 보낸 링크)
    const openByChar = () => {
      const m = location.hash.match(/^#c=(.+)$/);
      if (m) { try { const c = decodeURIComponent(m[1]); if (c) setTimeout(() => explain(Array.from(c)[0]), 300); } catch (e) { /* 잘못된 주소 */ } }
    };
    openByChar();
    window.addEventListener("hashchange", openByChar);
    const openByHash1800 = () => {
      if (location.hash === "#s1800") { $("s1800").open = true; setTimeout(() => $("s1800").scrollIntoView({ behavior: "smooth", block: "start" }), 300); }
    };
    openByHash1800();
    window.addEventListener("hashchange", openByHash1800);
  }

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
