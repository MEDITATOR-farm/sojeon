// 소전 앱 — 사진 속 한자 읽기 중계 서버 (Cloudflare Worker)
//
// 하는 일: 휴대폰에서 보낸 사진을 Claude API에 넘겨 한자를 읽게 하고, 결과(JSON)만 돌려줌.
// API 키는 이 서버의 '비밀 값(Secret)'에만 저장되므로 사이트 코드나 휴대폰에는 드러나지 않음.
//
// 꼭 설정해야 하는 값 (Cloudflare 대시보드 → Worker → Settings → Variables and Secrets)
//   ANTHROPIC_API_KEY  (Secret) Claude API 키
//   ACCESS_CODE        (Secret) 앱에서 입력할 비밀번호 — 아는 사람만 쓸 수 있게 해서 요금이 새지 않게 함
// 바꿀 수 있는 값 (없으면 기본값)
//   MODEL              사용할 Claude 모델 (기본: claude-sonnet-5-5)
//   ALLOWED_ORIGIN     사이트 주소 (기본: https://meditator-farm.github.io)

const DEFAULT_MODEL = "claude-sonnet-5-5";
const DEFAULT_ORIGIN = "https://meditator-farm.github.io";
const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // Claude API의 사진 한도(5MB)보다 넉넉히 작게

const PROMPT = `이 사진은 한문 자료(운서·옥편·고서 등)의 한 쪽입니다. 사진에 적힌 한자를 읽어 주세요.

규칙:
1. MODE가 "big"이면 크게 쓴 표제자(큰 글자)만 읽고, 작은 글씨 주석(예: 又笴韻, 上同)과 한글은 모두 뺍니다. MODE가 "all"이면 한자를 모두 읽되 한글은 뺍니다.
2. 읽는 순서: 세로쓰기면 오른쪽 줄부터 위에서 아래로, 가로쓰기면 위 줄부터 왼쪽에서 오른쪽으로.
3. 인쇄된 모양 그대로의 유니코드 글자를 씁니다. 이체자·벽자도 정자로 바꾸지 말고 확장 한자(CJK Extension) 글자까지 찾아서 씁니다.
4. 확실하지 않으면 sure를 false로 하고, 가능성 있는 다른 글자를 alt에 넣습니다(최대 3개).
5. 유니코드에 없는 글자 같으면 c를 "?"로 하고 note에 생김새(예: "阝+闌")를 적습니다.
6. 답은 아래 JSON 하나만 출력합니다. 설명 문장은 쓰지 않습니다.

{"direction":"vertical 또는 horizontal","columns":[[{"c":"閈","sure":true},{"c":"舝","sure":false,"alt":["搴"],"note":""}]]}
columns는 줄(세로쓰기면 세로줄) 하나가 배열 하나입니다.`;

function cors(origin, allowed) {
  return {
    "Access-Control-Allow-Origin": origin === allowed ? origin : allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-Access-Code",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
}

function reply(obj, status, headers) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", ...headers },
  });
}

// 모델 답에서 JSON 부분만 꺼내기 (앞뒤에 다른 글이 붙어도 괜찮게)
export function extractJson(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("JSON을 찾지 못함");
  const data = JSON.parse(text.slice(start, end + 1));
  if (!Array.isArray(data.columns)) throw new Error("columns가 없음");
  data.columns = data.columns
    .filter(Array.isArray)
    .map((col) => col
      .filter((x) => x && typeof x.c === "string" && x.c.length)
      .map((x) => ({
        c: Array.from(x.c)[0] || "?",
        sure: x.sure !== false,
        alt: Array.isArray(x.alt) ? x.alt.filter((a) => typeof a === "string").map((a) => Array.from(a)[0]).slice(0, 3) : [],
        note: typeof x.note === "string" ? x.note.slice(0, 40) : "",
      })))
    .filter((col) => col.length);
  return data;
}

export default {
  async fetch(request, env) {
    const allowed = env.ALLOWED_ORIGIN || DEFAULT_ORIGIN;
    const origin = request.headers.get("Origin") || "";
    const h = cors(origin, allowed);

    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: h });
    if (request.method !== "POST") return reply({ error: "POST로 사진을 보내 주세요" }, 405, h);
    if (origin && origin !== allowed && !origin.startsWith("http://localhost")) {
      return reply({ error: "허용되지 않은 사이트입니다" }, 403, h);
    }
    if (!env.ANTHROPIC_API_KEY || !env.ACCESS_CODE) {
      return reply({ error: "서버 설정이 끝나지 않았습니다 (API 키 또는 비밀번호 없음)" }, 500, h);
    }
    if (request.headers.get("X-Access-Code") !== env.ACCESS_CODE) {
      return reply({ error: "비밀번호가 맞지 않습니다", code: "bad_code" }, 401, h);
    }

    let body;
    try { body = await request.json(); } catch { return reply({ error: "요청 형식이 잘못되었습니다" }, 400, h); }
    const image = String(body.image || "");
    const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(body.mediaType) ? body.mediaType : "image/jpeg";
    const mode = body.mode === "all" ? "all" : "big";
    if (!image || image.length * 0.75 > MAX_IMAGE_BYTES) return reply({ error: "사진이 없거나 너무 큽니다" }, 400, h);

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: env.MODEL || DEFAULT_MODEL,
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: PROMPT.replace("MODE가", `MODE는 "${mode}"입니다. MODE가`) },
          ],
        }],
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      return reply({ error: "Claude API 오류", status: res.status, detail: t.slice(0, 300) }, 502, h);
    }
    const out = await res.json();
    const text = (out.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    try {
      const data = extractJson(text);
      return reply({ ...data, mode, usage: out.usage || null }, 200, h);
    } catch (e) {
      return reply({ error: "읽은 결과를 해석하지 못했습니다", detail: text.slice(0, 300) }, 502, h);
    }
  },
};
