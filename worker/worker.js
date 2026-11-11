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

// 자형 해석의 바탕 — 최규화 『한자해례 1800+』 「한자 원리」 요약 (사이트 bunhae/buho.js와 같은 내용. 저자 허락을 받아 씀)
const BUHO = `[해석 틀 — 소전 기본 부호와 방향 (최규화)]
방향: 한자는 방향에 따라 뜻이 달라진다(人과 匕는 같은 모양, 방향이 달라 다른 뜻). 해가 절대 기준이다.
 남쪽이 앞·위, 북쪽이 뒤·아래, 해가 뜨는 왼쪽이 동쪽, 오른쪽이 서쪽(背: 등진 北 쪽이 북쪽).
 東(왼쪽): 봄, 아침, 태어나다, 밝아지다, 새로운 왕조, 반역, 오랑캐
 南(위): 여름, 한낮, 성장, 열기
 西(오른쪽): 가을, 저녁, 수확, 어두워지다, 쇠퇴, 도움, 우리 편
 北(아래): 겨울, 밤, 죽음, 추위
기본 획: 점·선·면. 소전 기준 모두 1획이며 언제나 같은 뜻으로 쓰인다. 점은 소전 결합자에 보이지 않고, 점으로 보이는 것은 대개 짧은 선이다.
 선(직선)
  一 가로선: 땅, 담, 막히다(예: 국경). 위아래를 가르는 안팎의 경계 — 땅거죽, 껍질, 수면, 국경, 한계. 숫자 1.
  丨 세로선: 찢다, 가르다(예: 좌우). 좌우를 가름, 땅을 뚫어 세운 말뚝 — 뚫다, 통하다, 세우다.
 선(곡선) — 움직임·파동. 방향은 해 기준.
  ʃ(丿) 오르는 곡선: 나오다, 오르다, 솟다(예: 수증기)
  ʅ(乀) 내리는 곡선: 들어가다, 내려가다, 꺼지다(예: 물)
 면(공간) — 에워싸 가둔 것. 어느 쪽이 열렸느냐로 뜻이 갈린다.
  囗 사방이 막힘: 가두다, 에워싸다, 지키다, 성, 덩이(흙벽돌·반죽·돌덩이)
  ⊐ 왼쪽(동)이 열림(コ 파): 봄, 씨를 꺼내다, 빼다(예: 파종)
  ∪ 위(남)가 열림(凵 감): 여름, 물기가 빠져 비다, 마르다, 위가 터진 그릇(예: 증발)
  ⊏ 오른쪽(서)이 열림(匚 방): 가을, 거두어 넣다, 상자(예: 금고)
  ∩ 아래(북)가 열림(冖 멱): 겨울, 덮다, 열기가 빠지지 않게 거적을 씌우다
사선: 丨의 변형. 왼쪽 사선(/)은 평지보다 솟은 곳(솟다, 산비탈 — 厂), 오른쪽 사선(\\)은 꺼진 곳(움푹하다, 골짜기 — 乙 = 一 + \\).

[뜻(字義)]
- 조자 소재: 객관적 사실·주된 특징·누구나 그러하다고 여기는 것(日: 해가 땅 一을 경계로 맴도는 모양).
- 상징과 비유: 사물의 특징으로 빗댐(貝: 눈 目처럼 생긴 조개).
- 의미 확장: 한 글자는 같은 맥락의 여러 뜻을 함께 가진다(日: 해·때·계절·밝음·열기·붉은색). 훈은 대표 본보기일 뿐이니 훈에 한정해 해석하지 않는다.
- 형상화와 장면 연상: 고유부호나 글자를 골라 배치해 한 장면을 실제처럼 보여 준다. 한자는 동영상이다(女: 乙 몸을 펴고 나오는 태아 + 乂 탯줄을 자름 — 출산 장면).
- 유형: ① 동작(几: 몸을 숙이고 己 팔을 내려 乀 앉음, 人: 乙 + 丨 일어서며 팔이 늘어짐) ② 돌리기·뒤집기·기울이기(人은 산 사람이라 해 뜨는 동쪽을 보고, 匕는 서쪽을 보는 죽은 자, 尸는 人을 오른쪽으로 눕힘) ③ 위치(불이 아래면 태우고 옆이면 말리고 위면 이글거림: 赤·秋·光) ④ 복수(둘은 여럿·거듭 林, 셋은 사이에 낌·빽빽·몰려듦 众·雥) ⑤ 마주보기·반대(마주하면 만나고 등 돌리면 헤어짐: 廾·鬥·背·巫) ⑥ 품기·안기(表·匃) ⑦ 맴돌기(선 양쪽을 떼어 들락거리는 통로: 日·血·亼) ⑧ 생략(획 하나로 뜻이 바뀌므로 임의로 더하거나 빼지 않되, 뜻 전달에 지장 없으면 통째 생략: 斤·刀·鼎은 金, 牛·犬은 豸, 貝는 虫·金이 생략됨).
- 해석 순서 — 결설(結說) 구조: 먼저 쓴 것(왼쪽·위)이 〈결과〉(표현할 대상), 뒤가 〈설명〉(어떻다·어떻게·누가·무엇을·어디에). 鮮 = 魚(결과) + 羊(설명) "양 같은 물고기", 道 = 辵(결과 가다) + 首(설명 우두머리).
  예외: 불의 위치(赤·秋·光), 음식은 그릇에 담음(皿은 아래), 위에서 누르면 못 움직임(心이 눌린 忌·忠), 차례를 보이려 위아래에 둠(共의 廾은 아래), 頁·攴은 뒤, 力은 뒤나 아래, 阜(阝)는 왼쪽(동쪽 반역자를 막는 담), 邑(阝)은 오른쪽(왕과 백성이 사는 곳).
- 글자를 그림으로 보지 말고 고유부호에 근거해 해독한다.

[소리(字音)]
- 자음은 글자를 구별하려 붙인 한 음절이다. 사물의 고유한 소리를 주목하기도 한다(水 '쓰~', 風 '푸~', 犬 '컹', 鳥 '쪽', 天 '텅'). 다만 이것으로 성급히 결론짓지 않는다.
- 결합자는 공통 자음을 따르는 것이 일반적이다(主 → 註·駐·炷·注·柱 모두 '주').
- 고유소리와 문자소리가 꼭 일치하지는 않는다(호랑이 → 虎 '호').`;

// 자해(字解) — 글자 하나를 구성요소와 기본 부호로 풀이 (그림 없이 글자만 보냄)
const JAHAE_PROMPT = `한자 「CHAR」의 자해(字解)와 소전 자형 해석을 해 주세요.
KNOWN

${BUHO}

순서:
1. shuowen: 《說文》과의 관계. 표제자면 "說文 표제자", 이체(古文·籒文·篆文·或體 등)로 실렸으면 그 표제자와 관계(예: "說文 표제자 厵(𠫐)의 篆文"), 《說文》 이후 글자면 그렇게(예: "《說文》 이후 글자(《玉篇》 수록)"). 모르면 빈칸.
2. parts: 바로 아래 단계의 구성요소. 지금 해서 모양이 아니라 자원(字源)을 따릅니다(예: 原 → 厂 + 泉, 白·小로 나누지 않음). 위에 《說文》 구성이 주어졌으면 그대로 따릅니다.
   - c: 구성요소 한 글자(유니코드 정자, 가능하면 《說文》 표제자 꼴). 줄인 꼴이면 원래 글자를 쓰고 role에 표시.
   - role: "" (뜻), "聲" (소리), "亦聲" (뜻·소리), "省" (줄인 꼴), "省聲" (줄인 소리) 중 하나.
   - mean: 이 글자 안에서 그 요소가 맡는 뜻, 한국어로 짧게.
3. jx: 위 해석 틀에 따른 소전 자형 해석, 한국어 3~5문장.
   - 고유부호(획·면이 열린 방향·해 기준 방위)로 소전 모양을 읽고,
   - 결설 구조(먼저 쓴 것이 결과, 뒤가 설명. 예외 규칙 확인)로 구성요소를 읽는 순서를 정하고,
   - 해당하는 유형(동작·방향·위치·복수·마주보기·품기·맴돌기·생략)을 짚어, 글자가 보여 주는 장면으로 풀이합니다.
   소전에 실제로 있는 획·면만 짚고 틀에 억지로 끼워 맞추지 않습니다. 틀로 설명되지 않는 부분은 구성요소의 뜻으로 설명합니다.
   이 항목은 위 틀(최규화)에 따른 해석이고, 4의 jahae는 통설에 따른 풀이입니다. 서로 섞지 않습니다.
4. jahae: 통설(《說文》과 일반 자전)에 따라 구성요소의 뜻을 엮어 글자 뜻이 생긴 과정을 한국어 2~3문장으로.
4-1. sori: 소리 요소가 있으면 그 소리가 어디서 왔는지(공통 자음을 따르는 같은 소리 계열 글자 몇 개 포함) 한 문장. 없으면 빈칸.
5. hun: 대표 훈과 음(예: "근원 원").
6. 학설이 갈리면 가장 널리 받아들여지는 풀이를 쓰고 다른 설은 note에 한 문장으로. 확신이 없으면 sure를 false로. 지어내지 말고 모르는 부분은 note에 모른다고 씁니다.

답은 아래 JSON 하나만 출력합니다.
{"shuowen":"","parts":[{"c":"厂","role":"","mean":"언덕"},{"c":"泉","role":"","mean":"샘"}],"jx":"","jahae":"","sori":"","hun":"","sure":true,"note":""}`;

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
  return { shuowen: str(d.shuowen, 120), parts, jx: str(d.jx, 1000), jahae: str(d.jahae, 600), sori: str(d.sori, 300), hun: str(d.hun, 40), sure: d.sure !== false, note: str(d.note, 300) };
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
      // 사이트가 아는 《說文》 구성(예: "从水工聲" → "水(뜻) + 工(소리)")이 오면 그대로 따르게 함
      const known = String(body.known || "").replace(/[`$\\]/g, "").slice(0, 200);
      const prompt = JAHAE_PROMPT.replace("CHAR", ch).replace("KNOWN", known ? `사이트가 가진 《說文》 구성: ${known}` : "");
      if (!/\p{Script=Han}/u.test(ch)) return reply({ error: "한자 한 글자를 보내 주세요" }, 400, h);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({
          model: env.MODEL || DEFAULT_MODEL,
          max_tokens: 2200,
          messages: [{ role: "user", content: prompt }],
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
