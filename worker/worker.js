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

// 소전·전각(인장) 사진 읽기 — 전각 분석용
const SEAL_PROMPT = `이 사진은 소전(小篆)이나 전각(篆刻)으로 쓴 글자입니다. 도장 찍은 인영(印影), 도장 면(印面), 책·서예 작품의 소전일 수 있습니다.
각 글자를 지금 쓰는 해서(楷書) 한자로 읽어 주세요.

규칙:
1. 도장 면을 직접 찍은 사진이면 글자가 좌우로 뒤집혀 있으니 뒤집어서 읽습니다.
2. 인장의 읽는 순서는 보통 오른쪽 줄 위에서 아래로, 다음 왼쪽 줄입니다. 回文印처럼 다른 순서로 보이면 그 순서를 따르고 note에 적습니다.
3. 전각은 글자를 늘이고 줄이고 획을 합쳐 변형하므로, 《說文解字》 소전과 전각에서 흔히 쓰는 변형을 함께 생각해서 읽습니다.
4. 해서는 정자(번체) 유니코드로 씁니다. 벽자도 확장 한자까지 찾아 씁니다.
5. 확실하지 않으면 sure를 false로 하고, 가능성 있는 다른 글자를 alt에 넣습니다(최대 3개).
6. 글자가 아닌 테두리·무늬는 빼고, 읽을 수 없는 글자는 c를 "?"로 하고 note에 생김새를 적습니다.
7. 답은 아래 JSON 하나만 출력합니다. 설명 문장은 쓰지 않습니다.

{"direction":"vertical 또는 horizontal","columns":[[{"c":"瞑","sure":true},{"c":"想","sure":false,"alt":["相"],"note":""}]]}
columns는 줄(인장은 세로줄) 하나가 배열 하나입니다.`;

// 손글씨 읽기 — 사이트의 '손글씨로 찾기' 칸에 쓴 글자 하나
const HW_PROMPT = `이 그림은 사람이 손가락이나 펜으로 쓴 한자 한 글자입니다(흰 바탕에 검은 획).
어떤 한자인지 읽어 주세요.

규칙:
1. 필순·획 수가 틀렸거나, 획을 이어 썼거나, 비뚤게 쓴 손글씨일 수 있으니 전체 모양으로 판단합니다.
2. 정자(번체) 유니코드로 씁니다. 약자·간체로 보이면 그 정자를 c에, 쓴 모양 그대로의 글자를 alt에 넣습니다. 벽자도 확장 한자까지 찾아 씁니다.
3. 가장 가능성 높은 글자를 c에, 비슷해서 헷갈릴 만한 글자를 가능성 높은 순서로 alt에 넣습니다(최대 5개).
4. 확신하면 sure를 true, 아니면 false로 합니다. 한자로 보이지 않으면 c를 "?"로 합니다.
5. 답은 아래 JSON 하나만 출력합니다. 설명 문장은 쓰지 않습니다.

{"direction":"horizontal","columns":[[{"c":"想","sure":true,"alt":["相","恕"],"note":""}]]}`;

// 자해(字解) — 《說文》 표제자로 바로 찾을 수 없는 글자를 구성요소로 풀이 (그림 없이 글자만 보냄)
const JAHAE_PROMPT = `한자 「CHAR」의 자해(字解)를 해 주세요. 사이트는 이 글자를 《說文解字》 표제자에서 바로 찾지 못했습니다.

순서:
1. 《說文》에 이체(重文: 古文·籒文·篆文·或體 등)나 다른 글자체로 실려 있으면 그 표제자와 관계를 shuowen에 씁니다. 예: "說文 표제자 厵(𠫐)의 篆文".
   《說文》 이후에 생긴 글자면 그렇게 씁니다. 예: "《說文》 이후 글자(《玉篇》 수록)". 모르면 빈칸.
2. 이 글자를 바로 아래 단계의 구성요소로 나눠 parts에 씁니다. 지금 해서 모양이 아니라 자원(字源)을 따릅니다.
   예: 原 → 厂 + 泉 (白·小로 나누지 않음).
   - c: 구성요소 한 글자(유니코드 정자, 가능하면 《說文》 표제자 꼴). 줄인 꼴(省)이면 원래 글자를 쓰고 role에 표시합니다.
   - role: "" (뜻), "聲" (소리), "亦聲" (뜻·소리), "省" (줄인 꼴), "省聲" (줄인 소리) 중 하나.
   - mean: 이 글자 안에서 그 요소가 맡는 뜻, 한국어로 짧게.
3. jahae: 구성요소의 뜻을 엮어 글자 뜻이 생긴 과정을 한국어 2~3문장으로 풀이합니다.
4. hun: 대표 훈과 음. 예: "근원 원".
5. 학설이 갈리면 가장 널리 받아들여지는 풀이를 쓰고, 다른 설은 note에 한 문장으로 씁니다. 확신이 없으면 sure를 false로 합니다.
   지어내지 말고, 모르는 부분은 모른다고 note에 씁니다.

답은 아래 JSON 하나만 출력합니다.
{"shuowen":"","parts":[{"c":"厂","role":"","mean":"언덕"},{"c":"泉","role":"","mean":"샘"}],"jahae":"","hun":"","sure":true,"note":""}`;

const ROLES = ["", "聲", "亦聲", "省", "省聲"];
export function extractJahae(text) {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) throw new Error("no json");
  const d = JSON.parse(m[0]);
  const str = (v, n) => String(v || "").slice(0, n);
  const parts = (Array.isArray(d.parts) ? d.parts : []).slice(0, 6).map((p) => ({
    c: Array.from(String(p.c || ""))[0] || "",
    role: ROLES.includes(p.role) ? p.role : "",
    mean: str(p.mean, 40),
  })).filter((p) => /\p{Script=Han}/u.test(p.c));
  return { shuowen: str(d.shuowen, 120), parts, jahae: str(d.jahae, 600), hun: str(d.hun, 40), sure: d.sure !== false, note: str(d.note, 300) };
}

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
export function extractJson(text, maxAlt = 3) {
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
        alt: Array.isArray(x.alt) ? x.alt.filter((a) => typeof a === "string").map((a) => Array.from(a)[0]).slice(0, maxAlt) : [],
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

    // 자해 모드: 그림 없이 글자 하나만
    if (body.mode === "jahae") {
      const ch = Array.from(String(body.char || ""))[0] || "";
      if (!/\p{Script=Han}/u.test(ch)) return reply({ error: "한자 한 글자를 보내 주세요" }, 400, h);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: env.MODEL || DEFAULT_MODEL,
          max_tokens: 1200,
          messages: [{ role: "user", content: JAHAE_PROMPT.replace("CHAR", ch) }],
        }),
      });
      if (!r.ok) return reply({ error: "Claude API 오류", status: r.status, detail: (await r.text()).slice(0, 300) }, 502, h);
      const o = await r.json();
      const t = (o.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
      try { return reply({ ...extractJahae(t), char: ch, mode: "jahae", usage: o.usage || null }, 200, h); }
      catch (e) { return reply({ error: "풀이 결과를 해석하지 못했습니다", detail: t.slice(0, 300) }, 502, h); }
    }
    const image = String(body.image || "");
    const mediaType = ["image/jpeg", "image/png", "image/webp"].includes(body.mediaType) ? body.mediaType : "image/jpeg";
    const mode = ["all", "seal", "hw"].includes(body.mode) ? body.mode : "big";
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
        max_tokens: mode === "hw" ? 400 : 4000,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType, data: image } },
            { type: "text", text: mode === "hw" ? HW_PROMPT : mode === "seal" ? SEAL_PROMPT : PROMPT.replace("MODE가", `MODE는 "${mode}"입니다. MODE가`) },
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
      const data = extractJson(text, mode === "hw" ? 5 : 3);
      return reply({ ...data, mode, usage: out.usage || null }, 200, h);
    } catch (e) {
      return reply({ error: "읽은 결과를 해석하지 못했습니다", detail: text.slice(0, 300) }, 502, h);
    }
  },
};
