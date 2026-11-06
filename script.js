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
        const [, hanja, meaning] = line.split(":");
        // 한 글자짜리 한자만 사용 (단어는 건너뜀)
        if (!hanja || Array.from(hanja).length !== 1 || !meaning) return;
        const m = meaning.trim();
        if (!m) return;
        if (!HUNEUM[hanja]) HUNEUM[hanja] = [];
        if (!HUNEUM[hanja].includes(m)) HUNEUM[hanja].push(m);
      });
      convert(); // 사전을 다 불러오면 화면을 다시 그림
      return;
    } catch (e) { /* 다음 주소로 시도 */ }
  }
  console.warn("훈음 사전을 불러오지 못했습니다.");
}

// 한 글자의 훈음 글자 만들기 (여러 개면 앞의 2개만)
function huneumOf(ch) {
  const list = HUNEUM[ch];
  return list ? list.slice(0, 2).join(", ") : "";
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
    const codes = CUSTOM_SEAL_MAP[ch] || SEAL_MAP[ch];

    if (codes) {
      const seal = codeToChar(codes[0]); // 여러 개면 첫 번째 사용
      span.appendChild(makeSealImage(codes[0])); // 그림으로 보여주기
      resultText += seal;
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
    box.className = "pair" + (codes ? "" : " none");
    box.innerHTML = codes
      ? `<div class="k">${ch}</div><div class="hun">${huneumOf(ch)}</div><div class="s"></div><div class="cp">${codes.join(", ")}</div>`
      : `<div class="k">${ch}</div><div class="hun">${huneumOf(ch)}</div><div class="s">대응 없음</div><div class="cp">&nbsp;</div>`;
    if (codes) {
      const s = box.querySelector(".s");
      if (codes.length > 1) s.classList.add("multi"); // 소전 모양이 여러 개면 조금 작게
      codes.forEach(c => s.appendChild(makeSealImage(c)));
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

// 처음 열었을 때 한 번 변환
convert();
loadHuneum(); // 훈음 사전 불러오기
