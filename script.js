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
    b.addEventListener("click", () => {
      input.value += ch;               // 해서 입력칸에 이어 붙임 (여러 글자를 차례로 고를 수 있음)
      convert();
      showToast(`${ch} 추가됨`);
      document.getElementById("pairs").lastElementChild?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
    yinList.appendChild(b);
  });
}

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
