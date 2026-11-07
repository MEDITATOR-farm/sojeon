// 화면 요소 가져오기
const input = document.getElementById("input");
const output = document.getElementById("output");
const pairs = document.getElementById("pairs");
const stats = document.getElementById("stats");
const toast = document.getElementById("toast");

// "U+3D000" 같은 글자 → 실제 글자로 바꾸기
function codeToChar(code) {
  return String.fromCodePoint(parseInt(code.replace("U+", ""), 16));
}

// 결과 글자들을 기억해 두는 곳 (복사용)
let resultText = "";

// ===== ⭐ 내가 직접 추가하는 사용자 보강 사전 ⭐ =====
// 여기에 없는 한자를 등록하면 기본 사전보다 먼저 적용됩니다!
// 사용법: "한자": ["U+소전코드"]
const CUSTOM_SEAL_MAP = {
  // 정확한 소전 코드를 확인한 글자만 아래 형식으로 한 줄씩 추가하세요.
  // 형식 → "한자": ["U+소전코드"],
  // (주의: 코드를 모르면 추측해서 넣지 마세요. 엉뚱한 글자가 나옵니다.)
};

// ===== 훈·음(뜻과 소리) 사전 =====
// 공개 한자 사전(libhangul)을 인터넷에서 불러옵니다. 줄 모양 예: "천:天:하늘 천"
const HUNEUM = {}; // 예: HUNEUM["天"] = ["하늘 천"]
const YIN_INDEX = {}; // 음 → 한자 목록. 예: YIN_INDEX["천"] = ["天", "千", ...]

// 음 목록에 한자 하나 넣기 (같은 글자 두 번 안 넣음)
function addYin(yin, ch) {
  if (!YIN_INDEX[yin]) YIN_INDEX[yin] = [];
  if (!YIN_INDEX[yin].includes(ch)) YIN_INDEX[yin].push(ch);
}

// ===== 說文解字 원본 소전 그림 (崇羲篆體字形表) =====
// shuowen.js 의 SHUOWEN_ROWS: [해서, 원본 쪽, 칸 번호, 重文 표기]
// 그림은 원본 쪽마다 한 장(shuowen/p001.png …)에 10칸씩 묶여 있음
const SHUOWEN = {}; // 예: SHUOWEN["禱"] = [{p:1, k:54, z:""}, {p:1, k:55, z:"或"}]
const ZHONGWEN = { "或": "或體", "古": "古文", "篆": "篆文", "籀": "籀文", "奇": "奇字", "俗": "俗字" };
(function buildShuowen() {
  if (typeof SHUOWEN_ROWS === "undefined") return;
  let head = null; // 바로 앞의 정자(正篆) — 重文은 정자 밑에 함께 묶음
  SHUOWEN_ROWS.forEach(([ch, p, k, z]) => {
    const item = { ch, p, k, z };
    if (!z) {
      head = ch;
      if (!SHUOWEN[ch]) SHUOWEN[ch] = [];
      SHUOWEN[ch].unshift(item);                 // 정자는 맨 앞
    } else {
      if (head) SHUOWEN[head].push(item);        // 정자 밑에 重文으로 붙임
      if (!SHUOWEN[ch]) SHUOWEN[ch] = [item];    // 重文 글자 자체로도 찾을 수 있게
    }
  });
  if (typeof EXTRA_YIN !== "undefined") {
    Object.entries(EXTRA_YIN).forEach(([ch, y]) => y.split(" ").forEach(v => addYin(v, ch)));
  }
})();

// 說文 원본 그림 한 칸 만들기 (글자 크기(em)에 맞춰 커지고 작아짐)
function makeShuowenImage(item) {
  const el = document.createElement("span");
  el.className = "sw-glyph";
  el.style.backgroundImage = `url(shuowen/p${String(item.p).padStart(3, "0")}.png)`;
  el.style.setProperty("--x", item.k % 10);
  el.style.setProperty("--y", Math.floor(item.k / 10));
  el.setAttribute("role", "img");
  el.setAttribute("aria-label", item.ch + " 說文 소전");
  return el;
}

// 소전이 있는 글자인지 (OpenCC 사전 또는 說文 원본)
function hasSeal(ch) {
  return !!(CUSTOM_SEAL_MAP[ch] || SEAL_MAP[ch] || SHUOWEN[ch]);
}
const HUNEUM_URLS = [
  "hanja.txt", // 1순위: 내 사이트 폴더 안의 파일 (인터넷 환경과 상관없이 빠르고 확실함)
  "https://cdn.jsdelivr.net/gh/libhangul/libhangul@main/data/hanja/hanja.txt", // 2순위: 빠른 CDN 서버
  "https://raw.githubusercontent.com/libhangul/libhangul/main/data/hanja/hanja.txt",
];

async function loadHuneum() {
  for (const url of HUNEUM_URLS) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;
      const text = await res.text();
      text.split("\n").forEach(line => {
        if (line.startsWith("#")) return;
        const [yin, hanja, meaning] = line.split(":");
        // 한 글자짜리 한자만 사용 (단어는 건너뜀)
        if (!hanja || Array.from(hanja).length !== 1 || !meaning) return;
        const m = meaning.trim();
        if (!m) return;
        if (!HUNEUM[hanja]) HUNEUM[hanja] = [];
        if (!HUNEUM[hanja].includes(m)) HUNEUM[hanja].push(m);
        if (yin && yin.trim()) addYin(yin.trim(), hanja); // 음으로 찾기용 목록
      });
      convert(); // 사전을 다 불러오면 화면을 다시 그림
      searchYin();
      return;
    } catch (e) { /* 다음 주소로 시도 */ }
  }
  console.warn("훈음 사전을 불러오지 못했습니다.");
}

// 한 글자의 훈음 글자 만들기 (여러 개면 앞의 2개만)
function huneumOf(ch) {
  const list = HUNEUM[ch];
  if (list) return list.slice(0, 2).join(", ");
  // hanja.txt에 없으면 Unihan 보충 음만이라도 보여줌 (shuowen.js 의 EXTRA_YIN)
  return (typeof EXTRA_YIN !== "undefined" && EXTRA_YIN[ch]) || "";
}

// ===== 소전 그림(SVG) 연결 =====
// 그림을 가져올 곳을 여러 군데 준비해 두고, 앞에서부터 차례로 시도합니다.
// (휴대폰 인터넷에서 깃허브 주소가 막히거나 느린 경우를 대비해 초고속 서버를 1순위로 사용)
const GLYPH_BASES = [
  "https://cdn.jsdelivr.net/gh/UltraBriefnessCinema/kaiyuan-small-seal-font@add_THX_png/glyphs/THX/", // 1순위: jsDelivr(전 세계 초고속 배달 서버)
  "https://fastly.jsdelivr.net/gh/UltraBriefnessCinema/kaiyuan-small-seal-font@add_THX_png/glyphs/THX/", // 2순위: 보조 배달 서버
  "https://raw.githubusercontent.com/UltraBriefnessCinema/kaiyuan-small-seal-font/refs/heads/add_THX_png/glyphs/THX/", // 3순위: 깃허브 원본
];
const GLYPH_TIMEOUT = 4000; // 4초 안에 안 오면 다음 곳으로 넘어감
let goodBase = 0;           // 마지막으로 성공한 곳 번호 (다음 글자는 여기부터 시도)

// 파일 이름 규칙: 유니코드 번호 그대로 + .svg  (예: U+3D0AC → 3D0AC.svg)
function glyphCandidates(code) {
  const hex = code.replace("U+", "").toUpperCase();          // 예: 3D0AC
  // 마지막으로 성공한 곳부터 시작하도록 순서를 돌려줌
  const order = GLYPH_BASES.slice(goodBase).concat(GLYPH_BASES.slice(0, goodBase));
  return order.map(base => base + hex + ".svg");
}

// 소전 그림 상자 만들기: 그림을 못 찾으면 글자(폰트)로 대신 보여줌
function makeSealImage(code) {
  const img = document.createElement("img");
  img.className = "glyph";
  img.alt = codeToChar(code);
  const urls = glyphCandidates(code);
  let i = 0;
  let timer = null;

  function tryNext() {
    clearTimeout(timer);
    i++;
    if (i < urls.length) load();                // 다음 곳에서 다시 시도
    else img.replaceWith(document.createTextNode(codeToChar(code))); // 전부 실패
  }
  function load() {
    img.src = urls[i];
    timer = setTimeout(tryNext, GLYPH_TIMEOUT); // 너무 오래 걸리면 포기하고 다음으로
  }

  img.onload = () => {
    clearTimeout(timer);
    // 성공한 곳을 기억해 두기
    const base = urls[i].slice(0, urls[i].lastIndexOf("/") + 1);
    goodBase = Math.max(0, GLYPH_BASES.indexOf(base));
  };
  img.onerror = tryNext;
  load();
  return img;
}

// 변환 실행
function convert() {
  output.innerHTML = "";
  pairs.innerHTML = "";
  resultText = "";

  let found = 0;
  let total = 0;
  const shown = new Set(); // 대응표에 같은 글자를 두 번 넣지 않기 위해

  // Array.from 을 쓰면 한자를 한 글자씩 정확히 나눌 수 있음
  Array.from(input.value || "").forEach((ch, i) => {
    const span = document.createElement("span");
    span.style.animationDelay = (i * 0.03) + "s";
    
    // 1순위: 내가 직접 추가한 사전(CUSTOM_SEAL_MAP)에서 찾기
    // 2순위: 없으면 기본 OpenCC 사전(SEAL_MAP)에서 찾기
    // 3순위: 그래도 없으면 說文 원본 그림(SHUOWEN) 사용
    const codes = CUSTOM_SEAL_MAP[ch] || SEAL_MAP[ch];
    const sw = SHUOWEN[ch];

    if (codes) {
      const seal = codeToChar(codes[0]); // 여러 개면 첫 번째 사용
      span.appendChild(makeSealImage(codes[0])); // 그림으로 보여주기
      resultText += seal;
      found++; total++;
    } else if (sw) {
      span.appendChild(makeShuowenImage(sw[0]));
      resultText += ch;                   // 說文 그림은 글자 코드가 없어 원래 글자로 복사
      found++; total++;
    } else {
      span.textContent = ch;          // 대응이 없으면 원래 글자 그대로
      resultText += ch;
      if (ch.trim()) { span.className = "missing"; total++; }
    }
    output.appendChild(span);

    // 글자별 대응표 만들기
    if (!ch.trim() || shown.has(ch)) return;
    shown.add(ch);
    const box = document.createElement("div");
    box.className = "pair" + (codes || sw ? "" : " none");
    box.innerHTML = codes
      ? `<div class="k">${ch}</div><div class="hun">${huneumOf(ch)}</div><div class="s"></div><div class="cp">${codes.join(", ")}</div>`
      : `<div class="k">${ch}</div><div class="hun">${huneumOf(ch)}</div><div class="s">${sw ? "" : "대응 없음"}</div><div class="cp">&nbsp;</div>`;
    if (codes) {
      const s = box.querySelector(".s");
      if (codes.length > 1) s.classList.add("multi"); // 소전 모양이 여러 개면 조금 작게
      codes.forEach(c => s.appendChild(makeSealImage(c)));
    }
    // 說文 원본 소전 (정자 + 重文)
    if (sw) {
      const row = document.createElement("div");
      row.className = "sw-row";
      sw.forEach(item => {
        const cell = document.createElement("div");
        cell.className = "sw-cell";
        cell.appendChild(makeShuowenImage(item));
        const lab = document.createElement("div");
        lab.className = "sw-lab";
        lab.textContent = item.z ? (ZHONGWEN[item.z] || item.z) + (item.ch !== ch ? " " + item.ch : "") : "說文";
        cell.appendChild(lab);
        row.appendChild(cell);
      });
      box.insertBefore(row, box.querySelector(".cp"));
    }
    pairs.appendChild(box);
  });

  stats.textContent = total ? `전체 ${total}자 중 ${found}자 변환됨` : "";
}

// 알림 띄우기
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 1800);
}

// 버튼 연결
document.getElementById("btn-convert").addEventListener("click", convert);
// 입력하는 즉시 변환
// 단, 한글을 조합하는 중(예: ㅎ→하→한)에는 기다렸다가, 글자가 완성되면 변환 → 화면 깜빡임 방지
input.addEventListener("input", (e) => {
  if (e.isComposing) return;
  convert();
});
input.addEventListener("compositionend", convert);

// 지우기 버튼: 입력칸을 비우고 바로 다시 입력할 수 있게 커서를 놓아줌
document.getElementById("btn-clear").addEventListener("click", () => {
  input.value = "";
  convert();
  input.focus();
});

// ===== 음·훈으로 해서 찾기 =====
// 한 글자(예: 천) → 음이 같은 한자 + 훈이 그 말인 한자(예: 내 → 川)
// 두 글자 이상(예: 하늘) → 훈에 그 말이 들어간 한자
const yinInput = document.getElementById("yin-input");
const yinList = document.getElementById("yin-list");
const yinCount = document.getElementById("yin-count");

function searchYin() {
  const q = (yinInput.value || "").trim();
  yinList.innerHTML = "";
  yinCount.textContent = "";
  if (!q) return;
  if (!/^[가-힣\s]+$/.test(q)) { yinCount.textContent = "한글로 음이나 뜻을 입력하세요. (예: 천, 하늘)"; return; }

  const hits = [];
  const add = ch => { if (hasSeal(ch) && !hits.includes(ch)) hits.push(ch); };
  const one = Array.from(q).length === 1;
  if (one) (YIN_INDEX[q] || []).forEach(add);
  Object.entries(HUNEUM).forEach(([ch, list]) => {
    list.forEach(m => m.split(",").forEach(part => {
      const words = part.trim().split(/\s+/);
      const hun = words.slice(0, -1).join(" ");          // "하늘 천" → "하늘"
      if (one ? words.slice(0, -1).includes(q) : hun.includes(q)) add(ch);
    }));
  });

  // 훈음 사전(hanja.txt)에 있는 익숙한 글자를 앞에, Unihan 보충 음만 있는 벽자는 뒤에
  hits.sort((a, b) => (HUNEUM[a] ? 0 : 1) - (HUNEUM[b] ? 0 : 1));

  if (!hits.length) {
    yinCount.textContent = `"${q}"에 해당하는 소전 글자가 없습니다.`;
    return;
  }
  yinCount.textContent = `${hits.length}자 · 글자를 누르면 아래에 소전이 나옵니다`;
  hits.forEach(ch => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "yin-cand";
    const hun = huneumOf(ch);
    b.innerHTML = `<span class="yk">${ch}</span><span class="yh">${hun}</span>`;
    b.addEventListener("click", () => pickChar(ch));
    yinList.appendChild(b);
  });
}

// 찾은 글자를 고르면: 해서 입력칸에 이어 붙이고(여러 글자를 차례로 고를 수 있음) 바로 소전으로 변환
function pickChar(ch) {
  if (phEditing !== null) { phReplace(ch); return; } // 사진에서 읽은 글자를 고치는 중이면 그 자리에 넣음
  input.value += ch;
  convert();
  showToast(`${ch} 추가됨`);
  document.getElementById("pairs").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
}

// ===== 사진으로 찾기 =====
// 사진을 줄여서 중계 서버(Cloudflare Worker)로 보내면, 서버가 Claude API로 한자를 읽어 돌려줌.
// API 키는 서버에만 있고, 이 앱은 서버 주소와 비밀번호만 알고 있음. (설명: worker/README.md)
const PHOTO_API = ""; // ← Cloudflare Worker 주소를 넣으세요. 예: "https://sojeon-ocr.계정이름.workers.dev"
const PH_MAX_SIDE = 1600;   // 사진 긴 쪽을 이 크기로 줄여서 보냄 (글자는 충분히 보이고 요금·시간은 줄어듦)
const phStatus = document.getElementById("ph-status");
const phResult = document.getElementById("ph-result");
const phEdit = document.getElementById("ph-edit");
const phPreview = document.getElementById("ph-preview");
const phActions = document.getElementById("ph-actions");
const phCodeRow = document.getElementById("ph-code-row");
let phChars = [];       // 읽은 글자: [{c, sure, alt, note, col}]
let phEditing = null;   // 지금 고치고 있는 글자 번호 (없으면 null)
let phPendingFile = null;

function phGetCode() { try { return localStorage.getItem("sojeon-photo-code") || ""; } catch (e) { return ""; } }
function phSetCode(v) { try { localStorage.setItem("sojeon-photo-code", v); } catch (e) {} }

// 사진을 긴 쪽 1600px JPEG로 줄이기
function phShrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, PH_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
      const c = document.createElement("canvas");
      c.width = Math.round(img.naturalWidth * k);
      c.height = Math.round(img.naturalHeight * k);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      const dataUrl = c.toDataURL("image/jpeg", 0.88);
      resolve({ dataUrl, base64: dataUrl.split(",")[1] });
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("사진을 열 수 없습니다")); };
    img.src = url;
  });
}

async function phRead(file) {
  if (!PHOTO_API) {
    phStatus.textContent = "사진 읽기 서버가 아직 연결되지 않았습니다. (script.js의 PHOTO_API에 서버 주소를 넣어야 합니다)";
    return;
  }
  const code = phGetCode();
  if (!code) { phPendingFile = file; phCodeRow.hidden = false; phStatus.textContent = "처음 한 번만 사진 읽기 비밀번호를 입력해 주세요."; return; }
  phCodeRow.hidden = true;
  phResult.innerHTML = ""; phEdit.hidden = true; phActions.hidden = true; phEditing = null;
  phStatus.textContent = "사진을 줄이는 중…";
  let shrunk;
  try { shrunk = await phShrink(file); } catch (e) { phStatus.textContent = e.message; return; }
  phPreview.src = shrunk.dataUrl; phPreview.hidden = false;
  phStatus.textContent = "AI가 한자를 읽는 중… (10~30초 걸릴 수 있습니다)";
  let data;
  try {
    const res = await fetch(PHOTO_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Access-Code": code },
      body: JSON.stringify({ image: shrunk.base64, mediaType: "image/jpeg", mode: document.getElementById("ph-big").checked ? "big" : "all" }),
    });
    data = await res.json();
    if (!res.ok) {
      if (data.code === "bad_code") { phSetCode(""); phPendingFile = file; phCodeRow.hidden = false; }
      phStatus.textContent = "읽지 못했습니다: " + (data.error || res.status);
      return;
    }
  } catch (e) {
    phStatus.textContent = "서버에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.";
    return;
  }
  phChars = [];
  data.columns.forEach((col, ci) => col.forEach((x) => phChars.push({ ...x, col: ci })));
  phRender();
}

// 읽은 글자 목록 그리기: 확실하지 않은 글자는 빨간 테두리
function phRender() {
  phResult.innerHTML = "";
  if (!phChars.length) { phStatus.textContent = "사진에서 한자를 찾지 못했습니다. 더 밝고 가깝게 찍어 보세요."; return; }
  const unsure = phChars.filter((x) => !x.sure).length;
  phStatus.textContent = `${phChars.length}자를 읽었습니다` +
    (unsure ? ` · 빨간 테두리 ${unsure}자는 확실하지 않으니 사진과 비교해 확인해 주세요` : "") +
    " · 글자를 누르면 고칠 수 있습니다";
  let lastCol = -1, grid = null;
  phChars.forEach((x, i) => {
    if (x.col !== lastCol) {
      lastCol = x.col;
      const h = document.createElement("div");
      h.className = "rs-head";
      h.textContent = `${x.col + 1}째 줄`;
      phResult.appendChild(h);
      grid = document.createElement("div");
      grid.className = "rs-grid";
      phResult.appendChild(grid);
    }
    const b = x.c === "?" ? document.createElement("button") : rsButton({ ch: x.c });
    if (x.c === "?") {
      b.type = "button"; b.className = "rs-cand";
      b.innerHTML = `<span class="rs-thumb">?</span><span class="rk">?</span><span class="ry">${x.note || "못 읽음"}</span>`;
    }
    b.classList.add("ph-cand");
    if (!x.sure || x.c === "?") b.classList.add("unsure");
    if (!hasSeal(x.c) && x.c !== "?") b.classList.add("noseal");
    if (i === phEditing) b.classList.add("editing");
    // rsButton이 붙인 '바로 넣기' 대신 '고치기'로 동작하게 바꿈
    const nb = b.cloneNode(true);
    nb.addEventListener("click", () => phStartEdit(i));
    grid.appendChild(nb);
    nb.querySelectorAll(".rs-thumb").forEach((t) => { if (!t.children.length && t.dataset.ch) fillThumb(t); });
  });
  phActions.hidden = false;
}

// 글자 하나 고치기: 다른 후보 / 직접 입력 / 위의 찾기 기능으로 고르기 / 지우기
function phStartEdit(i) {
  phEditing = i;
  const x = phChars[i];
  phEdit.hidden = false;
  phEdit.innerHTML = `<div class="ph-edit-title"><b>${x.c}</b> 고치기${x.note ? ` <span class="rs-sub">(${x.note})</span>` : ""}</div>`;
  if (x.alt && x.alt.length) {
    const row = document.createElement("div");
    row.className = "ph-alt";
    row.insertAdjacentHTML("beforeend", '<span class="rs-sub">다른 후보</span>');
    x.alt.forEach((a) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "rs-st"; b.textContent = a;
      b.addEventListener("click", () => phReplace(a));
      row.appendChild(b);
    });
    phEdit.appendChild(row);
  }
  const row2 = document.createElement("div");
  row2.className = "ph-alt";
  row2.innerHTML = '<input type="text" class="ph-type" maxlength="2" placeholder="직접"><button type="button" class="rs-st ph-ok">바꾸기</button>' +
    '<button type="button" class="rs-st ph-del">지우기</button><button type="button" class="rs-st ph-ok-sure">맞음</button><button type="button" class="rs-st ph-cancel">닫기</button>';
  row2.querySelector(".ph-ok").addEventListener("click", () => {
    const v = Array.from(row2.querySelector(".ph-type").value.trim())[0];
    if (v) phReplace(v);
  });
  row2.querySelector(".ph-del").addEventListener("click", () => { phChars.splice(i, 1); phStopEdit(); });
  row2.querySelector(".ph-ok-sure").addEventListener("click", () => { phChars[i].sure = true; phStopEdit(); });
  row2.querySelector(".ph-cancel").addEventListener("click", phStopEdit);
  phEdit.appendChild(row2);
  phEdit.insertAdjacentHTML("beforeend",
    '<p class="hint">글자를 모르면 위의 <b>음·훈</b>, 아래의 <b>손글씨</b>·<b>부수·획수</b> 찾기에서 고르세요. 고른 글자가 이 자리에 들어갑니다.</p>');
  phRender();
}
function phReplace(ch) {
  if (phEditing === null) return;
  phChars[phEditing].c = ch;
  phChars[phEditing].sure = true;
  showToast(`${ch}(으)로 고침`);
  phStopEdit();
  document.getElementById("ph-box").scrollIntoView({ behavior: "smooth", block: "start" });
}
function phStopEdit() { phEditing = null; phEdit.hidden = true; phEdit.innerHTML = ""; phRender(); }

document.getElementById("ph-apply").addEventListener("click", () => {
  const text = phChars.map((x) => x.c).filter((c) => c !== "?").join("");
  if (!text) return;
  phStopEdit();
  input.value = text;
  convert();
  document.getElementById("output").scrollIntoView({ behavior: "smooth", block: "start" });
});
document.getElementById("ph-reset").addEventListener("click", () => {
  phChars = []; phStopEdit(); phResult.innerHTML = ""; phActions.hidden = true; phPreview.hidden = true;
  phStatus.textContent = "사진을 찍으면 AI가 한자를 읽어 줍니다. 틀린 글자는 눌러서 고칠 수 있습니다.";
});
["ph-camera", "ph-file"].forEach((id) => document.getElementById(id).addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  e.target.value = "";
  if (f) phRead(f);
}));
document.getElementById("ph-code-save").addEventListener("click", () => {
  const v = document.getElementById("ph-code").value.trim();
  if (!v) return;
  phSetCode(v);
  document.getElementById("ph-code").value = "";
  phCodeRow.hidden = true;
  if (phPendingFile) { const f = phPendingFile; phPendingFile = null; phRead(f); }
});

// ===== 부수·획수로 찾기 =====
// bushou.js 의 RADICALS(214부)와 RS_CHARS([글자, 부수번호, 나머지 획수, 총획수])를 사용
const rsRadicals = document.getElementById("rs-radicals");
const rsStrokes = document.getElementById("rs-strokes");
const rsPicked = document.getElementById("rs-picked");
const rsList = document.getElementById("rs-list");
const rsCount = document.getElementById("rs-count");
const RS_BY_RAD = {};   // 부수 번호 → 글자 목록
const RS_BY_TOTAL = {}; // 총획수 → 글자 목록
if (typeof RS_CHARS !== "undefined") {
  RS_CHARS.forEach(([ch, rad, rest, total]) => {
    const item = { ch, rad, rest, total };
    (RS_BY_RAD[rad] = RS_BY_RAD[rad] || []).push(item);
    (RS_BY_TOTAL[total] = RS_BY_TOTAL[total] || []).push(item);
  });
}
let rsMode = "rad";

// 화면에 보일 때만 소전 그림을 불러옴 (글자가 수백 개여도 데이터를 아끼고 느려지지 않게)
const rsObserver = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => entries.forEach((en) => {
      if (!en.isIntersecting) return;
      fillThumb(en.target);
      rsObserver.unobserve(en.target);
    }), { rootMargin: "200px" })
  : null;
function fillThumb(box) {
  const ch = box.dataset.ch;
  const codes = CUSTOM_SEAL_MAP[ch] || SEAL_MAP[ch];
  if (SHUOWEN[ch]) box.appendChild(makeShuowenImage(SHUOWEN[ch][0]));
  else if (codes) box.appendChild(makeSealImage(codes[0]));
}

// 결과 목록에 글자 버튼 하나 만들기: 소전 그림 + 해서 + 음
function rsButton(item) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "rs-cand";
  const thumb = document.createElement("span");
  thumb.className = "rs-thumb";
  thumb.dataset.ch = item.ch;
  b.appendChild(thumb);
  const yin = (huneumOf(item.ch).split(",")[0] || "").trim();
  b.insertAdjacentHTML("beforeend", `<span class="rk">${item.ch}</span><span class="ry">${yin || "&nbsp;"}</span>`);
  b.addEventListener("click", () => pickChar(item.ch));
  if (rsObserver) rsObserver.observe(thumb); else fillThumb(thumb);
  return b;
}

// 글자 묶음을 제목과 함께 목록에 넣기 (익숙한 글자 먼저)
function rsGroup(title, items, dim) {
  if (!items.length) return;
  const h = document.createElement("div");
  h.className = "rs-head" + (dim ? " dim" : "");
  h.textContent = `${title} · ${items.length}자`;
  rsList.appendChild(h);
  const g = document.createElement("div");
  g.className = "rs-grid" + (dim ? " dim" : "");
  items.slice().sort((a, b) => (HUNEUM[a.ch] ? 0 : 1) - (HUNEUM[b.ch] ? 0 : 1))
    .forEach((it) => g.appendChild(rsButton(it)));
  rsList.appendChild(g);
}

function rsClear() {
  rsStrokes.innerHTML = ""; rsList.innerHTML = ""; rsCount.textContent = ""; rsPicked.innerHTML = "";
}

// 1단계: 부수 고르기 (부수 획수별로 묶어서 보여줌)
function rsShowRadicals() {
  rsClear();
  rsRadicals.innerHTML = "";
  rsRadicals.hidden = false;
  let cur = 0, row = null;
  RADICALS.forEach(([n, ch, st, variant, count]) => {
    if (st !== cur) {
      cur = st;
      const lab = document.createElement("div");
      lab.className = "rs-stlabel";
      lab.textContent = `${st}획`;
      rsRadicals.appendChild(lab);
      row = document.createElement("div");
      row.className = "rs-row";
      rsRadicals.appendChild(row);
    }
    const b = document.createElement("button");
    b.type = "button";
    b.className = "rs-rad";
    b.title = `${n}번 부수 · 소전 ${count}자`;
    b.innerHTML = `${ch}${variant ? `<small>${variant}</small>` : ""}`;
    b.addEventListener("click", () => rsPickRadical(n));
    row.appendChild(b);
  });
  rsCount.textContent = "글자의 부수를 고르세요. 작은 글씨는 흔히 쓰는 변형(예: 水 → 氵)입니다.";
}

// 2단계: 부수를 고르면 나머지 획수 버튼을 보여줌
function rsPickRadical(n) {
  const [, ch, , variant] = RADICALS[n - 1];
  const items = RS_BY_RAD[n] || [];
  rsRadicals.hidden = true;
  rsClear();
  rsPicked.innerHTML = `<span class="rs-chip">${ch}${variant ? " " + variant : ""} 부</span>`;
  const back = document.createElement("button");
  back.type = "button"; back.className = "btn rs-back"; back.textContent = "부수 다시 고르기";
  back.addEventListener("click", rsShowRadicals);
  rsPicked.appendChild(back);

  const rests = [...new Set(items.map((i) => i.rest))].sort((a, b) => a - b);
  const all = document.createElement("button");
  all.type = "button"; all.className = "rs-st"; all.textContent = "전체";
  all.addEventListener("click", () => rsShowRest(n, null, all));
  rsStrokes.appendChild(all);
  rests.forEach((r) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "rs-st"; b.textContent = r;
    b.addEventListener("click", () => rsShowRest(n, r, b));
    rsStrokes.appendChild(b);
  });
  rsCount.textContent = `부수를 뺀 나머지 획수를 고르세요 (소전 ${items.length}자)`;
}

// 3단계: 고른 획수의 글자 + 한 획 차이(±1) 글자를 함께 보여줌
function rsShowRest(n, r, btn) {
  rsStrokes.querySelectorAll(".rs-st").forEach((b) => b.classList.toggle("on", b === btn));
  rsList.innerHTML = "";
  const items = RS_BY_RAD[n] || [];
  if (r === null) {
    const rests = [...new Set(items.map((i) => i.rest))].sort((a, b) => a - b);
    rests.forEach((x) => rsGroup(`나머지 ${x}획`, items.filter((i) => i.rest === x)));
    rsCount.textContent = `${items.length}자`;
    return;
  }
  const exact = items.filter((i) => i.rest === r);
  rsGroup(`나머지 ${r}획`, exact);
  rsGroup(`한 획 적게 (${r - 1}획)`, items.filter((i) => i.rest === r - 1), true);
  rsGroup(`한 획 많게 (${r + 1}획)`, items.filter((i) => i.rest === r + 1), true);
  rsCount.textContent = `${exact.length}자 · 획수를 다르게 세는 경우를 위해 한 획 차이 글자도 아래에 함께 보여줍니다`;
}

// 총획수로 찾기
function rsShowTotals() {
  rsClear();
  rsRadicals.hidden = true;
  const totals = Object.keys(RS_BY_TOTAL).map(Number).sort((a, b) => a - b);
  totals.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button"; b.className = "rs-st"; b.textContent = t;
    b.title = `${RS_BY_TOTAL[t].length}자`;
    b.addEventListener("click", () => {
      rsStrokes.querySelectorAll(".rs-st").forEach((x) => x.classList.toggle("on", x === b));
      rsList.innerHTML = "";
      rsGroup(`총 ${t}획`, RS_BY_TOTAL[t]);
      rsCount.textContent = `${RS_BY_TOTAL[t].length}자 · 글자가 많으면 부수로 찾는 편이 빠릅니다`;
    });
    rsStrokes.appendChild(b);
  });
  rsCount.textContent = "총획수를 고르세요";
}

document.querySelectorAll(".rs-tab").forEach((tab) => tab.addEventListener("click", () => {
  rsMode = tab.dataset.mode;
  document.querySelectorAll(".rs-tab").forEach((t) => t.classList.toggle("on", t === tab));
  if (rsMode === "rad") rsShowRadicals(); else rsShowTotals();
}));
// 처음 펼칠 때 부수 목록을 그림
document.getElementById("rs-box").addEventListener("toggle", (e) => {
  if (e.target.open && !rsRadicals.children.length && rsMode === "rad") rsShowRadicals();
});

// ===== 손글씨로 찾기 =====
// HanziLookupJS(GPL) 사용: hwr 폴더의 프로그램과 획 자료(약 2MB)는 이 칸을 처음 펼칠 때만 불러옴
const hwBox = document.getElementById("hw-box");
const hwCanvas = document.getElementById("hw-canvas");
const hwList = document.getElementById("hw-list");
const hwCount = document.getElementById("hw-count");
const hwCtx = hwCanvas.getContext("2d");
let hwStrokes = [];      // 쓴 획들: [[[x, y], [x, y], ...], ...]
let hwCurrent = null;    // 지금 쓰고 있는 획
let hwReady = false;     // 인식 자료를 다 불러왔는지
let hwLoading = false;

function hwLoad() {
  if (hwReady || hwLoading) return;
  hwLoading = true;
  hwCount.textContent = "손글씨 인식 자료를 불러오는 중… (처음 한 번만)";
  const s = document.createElement("script");
  s.src = "hwr/hanzilookup.min.js";
  s.onload = () => {
    let left = 2, ok = 0;
    const done = (success) => {
      if (success) ok++;
      if (--left) return;
      hwLoading = false;
      hwReady = ok > 0;
      hwCount.textContent = hwReady ? "획 순서대로 또박또박 쓰면 더 잘 찾습니다" : "손글씨 인식 자료를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.";
      if (hwReady && hwStrokes.length) hwLookup();
    };
    HanziLookup.init("mmah", "hwr/mmah.json", done);
    HanziLookup.init("orig", "hwr/orig.json", done);
  };
  s.onerror = () => { hwLoading = false; hwCount.textContent = "손글씨 인식 프로그램을 불러오지 못했습니다."; };
  document.head.appendChild(s);
}

// 쓰는 칸 크기를 화면에 맞추고 다시 그림 (고해상도 화면에서도 선명하게)
function hwResize() {
  const size = Math.min(hwCanvas.parentElement.clientWidth, 320);
  const dpr = window.devicePixelRatio || 1;
  hwCanvas.style.width = hwCanvas.style.height = size + "px";
  hwCanvas.width = hwCanvas.height = Math.round(size * dpr);
  hwCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  hwDraw();
}

// 바탕의 米자 안내선 + 쓴 획 그리기
function hwDraw() {
  const n = hwCanvas.width / (window.devicePixelRatio || 1);
  hwCtx.clearRect(0, 0, n, n);
  hwCtx.strokeStyle = "rgba(217,178,111,.18)";
  hwCtx.lineWidth = 1;
  hwCtx.setLineDash([4, 4]);
  hwCtx.beginPath();
  hwCtx.moveTo(n / 2, 0); hwCtx.lineTo(n / 2, n);
  hwCtx.moveTo(0, n / 2); hwCtx.lineTo(n, n / 2);
  hwCtx.moveTo(0, 0); hwCtx.lineTo(n, n);
  hwCtx.moveTo(n, 0); hwCtx.lineTo(0, n);
  hwCtx.stroke();
  hwCtx.setLineDash([]);
  hwCtx.strokeStyle = "#f3e9d8";
  hwCtx.lineWidth = Math.max(4, n / 45);
  hwCtx.lineCap = hwCtx.lineJoin = "round";
  hwStrokes.concat(hwCurrent ? [hwCurrent] : []).forEach((st) => {
    hwCtx.beginPath();
    st.forEach(([x, y], i) => (i ? hwCtx.lineTo(x, y) : hwCtx.moveTo(x, y)));
    if (st.length === 1) hwCtx.lineTo(st[0][0] + 0.1, st[0][1]);
    hwCtx.stroke();
  });
}

function hwPoint(e) {
  const r = hwCanvas.getBoundingClientRect();
  return [Math.round(e.clientX - r.left), Math.round(e.clientY - r.top)];
}
hwCanvas.addEventListener("pointerdown", (e) => {
  e.preventDefault();
  hwCanvas.setPointerCapture(e.pointerId);
  hwCurrent = [hwPoint(e)];
  hwDraw();
});
hwCanvas.addEventListener("pointermove", (e) => {
  if (!hwCurrent) return;
  const p = hwPoint(e), last = hwCurrent[hwCurrent.length - 1];
  if (Math.abs(p[0] - last[0]) + Math.abs(p[1] - last[1]) < 2) return; // 너무 촘촘한 점은 건너뜀
  hwCurrent.push(p);
  hwDraw();
});
function hwEnd() {
  if (!hwCurrent) return;
  hwStrokes.push(hwCurrent);
  hwCurrent = null;
  hwDraw();
  hwLookup();
}
hwCanvas.addEventListener("pointerup", hwEnd);
hwCanvas.addEventListener("pointercancel", hwEnd);

// 쓴 획으로 글자 찾기: 두 가지 자료로 찾아 점수 높은 순으로 합치고, 소전이 있는 글자만 보여줌
function hwLookup() {
  hwList.innerHTML = "";
  if (!hwStrokes.length) { hwCount.textContent = "획 순서대로 또박또박 쓰면 더 잘 찾습니다"; return; }
  if (!hwReady) { hwLoad(); return; }
  const analyzed = new HanziLookup.AnalyzedCharacter(hwStrokes);
  const best = new Map();
  let pending = 0;
  const collect = (matches) => {
    // 두 자료의 점수 크기가 달라서 점수 대신 순위로 합침 (양쪽에서 모두 앞쪽이면 더 위로)
    matches.forEach((m, rank) => best.set(m.character, (best.get(m.character) || 0) + 1 / (rank + 1)));
    if (--pending) return;
    const hits = [...best.entries()].sort((a, b) => b[1] - a[1]).map(([ch]) => ch).filter(hasSeal).slice(0, 16);
    hwList.innerHTML = "";
    hits.forEach((ch) => hwList.appendChild(rsButton({ ch })));
    hwCount.textContent = hits.length
      ? `${hwStrokes.length}획 · 비슷한 글자 ${hits.length}개 (앞쪽일수록 비슷함)`
      : `${hwStrokes.length}획 · 소전이 있는 비슷한 글자를 찾지 못했습니다. 이어서 써 보세요`;
  };
  ["mmah", "orig"].forEach((name) => {
    if (!HanziLookup.data[name]) return;
    pending++;
    new HanziLookup.Matcher(name).match(analyzed, 30, collect);
  });
}

document.getElementById("hw-undo").addEventListener("click", () => { hwStrokes.pop(); hwDraw(); hwLookup(); });
document.getElementById("hw-clear").addEventListener("click", () => { hwStrokes = []; hwDraw(); hwLookup(); });
hwBox.addEventListener("toggle", () => { if (hwBox.open) { hwResize(); hwLoad(); } });
window.addEventListener("resize", () => { if (hwBox.open) hwResize(); });

yinInput.addEventListener("input", (e) => {
  if (e.isComposing) return;
  searchYin();
});
yinInput.addEventListener("compositionend", searchYin);

// ===== 휴대폰 앱으로 설치하기 (PWA) =====
// 오프라인 저장소 등록: 한 번 열어 본 글자는 인터넷이 없어도 다시 볼 수 있음
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}
const installBtn = document.getElementById("btn-install");
let installEvent = null;
// 안드로이드(크롬·삼성 인터넷): 설치 가능하면 버튼을 보여줌
window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installEvent = e;
  installBtn.hidden = false;
});
installBtn.addEventListener("click", async () => {
  if (!installEvent) return;
  installEvent.prompt();
  await installEvent.userChoice;
  installEvent = null;
  installBtn.hidden = true;
});
window.addEventListener("appinstalled", () => { installBtn.hidden = true; showToast("앱이 설치되었습니다"); });
// 아이폰(사파리)은 설치 버튼이 없으므로 안내문을 보여줌 (이미 앱으로 실행 중이면 숨김)
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone;
if (isIOS && !isStandalone) document.getElementById("ios-hint").hidden = false;

// 처음 열었을 때 한 번 변환
convert();
loadHuneum(); // 훈음 사전 불러오기
