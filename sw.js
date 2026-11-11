// 소전 앱 오프라인 저장소 (서비스 워커)
// 파일을 고쳐 올릴 때마다 아래 버전 숫자를 하나씩 올려 주세요. → 휴대폰에 설치된 앱도 새 파일로 바뀝니다.
const VERSION = "sojeon-v18";

// 앱을 처음 열 때 미리 저장해 두는 기본 파일
const CORE = [
  "./",
  "index.html",
  "style.css",
  "script.js",
  "data.js",
  "shuowen.js",
  "bushou.js",
  "bunhae.js",
  "sealdraw.js",
  "bunhae/data.js",
  "hanja.txt",
  "manifest.webmanifest",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

// 예전 버전 저장소 지우기
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // 소전 그림(說文 원본, SVG)과 글꼴: 한 번 받으면 저장해 두고 다음부터는 인터넷 없이 사용
  const isGlyph =
    url.pathname.includes("/shuowen/") ||
    url.hostname.endsWith("jsdelivr.net") ||
    url.hostname === "raw.githubusercontent.com" ||
    url.hostname.endsWith("fonts.googleapis.com") ||
    url.hostname.endsWith("fonts.gstatic.com");
  if (isGlyph) {
    e.respondWith(
      caches.open(VERSION).then((c) =>
        c.match(req).then((hit) =>
          // <img>로 받아 둔 저장본(내용을 읽을 수 없는 opaque)은 그림 보내기(fetch)에 쓸 수 없으니 다시 받음
          (hit && !(hit.type === "opaque" && req.mode === "cors") ? hit : null) || fetch(req).then((res) => {
            if (res.ok || res.type === "opaque") c.put(req, res.clone());
            return res;
          })
        )
      )
    );
    return;
  }

  // 내 사이트의 기본 파일: 인터넷이 되면 최신 파일, 안 되면 저장해 둔 파일
  if (url.origin === self.location.origin) {
    e.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) caches.open(VERSION).then((c) => c.put(req, res.clone()));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match("index.html")))
    );
  }
});
