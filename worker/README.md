# 사진 읽기 서버 (Cloudflare Worker)

사이트의 **사진으로 찾기**는 사진을 이 서버로 보내고, 서버가 Claude API로 한자를 읽어 돌려줍니다.
Claude API 키를 사이트(공개 저장소)에 넣으면 누구나 볼 수 있으므로, 키는 이 서버에만 숨겨 둡니다.

```
휴대폰(사이트) ──사진──▶ Cloudflare Worker (API 키 보관) ──▶ Claude API
              ◀─읽은 한자─                                ◀──
```

## 설정 방법 (Cloudflare 대시보드, 약 10분)

1. <https://dash.cloudflare.com> 에 로그인 → 왼쪽 **Workers & Pages** → **Create** → **Create Worker**
2. 이름을 `sojeon-ocr`로 정하고 **Deploy**
3. **Edit code**를 눌러 기본 코드를 모두 지우고, 이 폴더의 `worker.js` 내용을 그대로 붙여 넣은 뒤 **Deploy**
4. Worker 화면 → **Settings** → **Variables and Secrets** → **Add**
   - `ANTHROPIC_API_KEY` — 종류 **Secret**, 값: Claude API 키 (<https://console.anthropic.com>)
   - `ACCESS_CODE` — 종류 **Secret**, 값: 앱에서 입력할 비밀번호 (아무 말이나 길게)
5. Worker 주소(예: `https://sojeon-ocr.계정이름.workers.dev`)를 `script.js`의 `PHOTO_API`에 넣고 올립니다.
6. 휴대폰에서 사진을 처음 읽을 때 4번의 비밀번호를 한 번 입력하면, 그 휴대폰에 저장됩니다.

## 바꿀 수 있는 값 (Variables, 종류 Text)

| 이름 | 기본값 | 설명 |
|---|---|---|
| `MODEL` | `claude-sonnet-5-5` | 읽기에 쓸 Claude 모델 |
| `ALLOWED_ORIGIN` | `https://meditator-farm.github.io` | 이 서버를 쓸 수 있는 사이트 주소 |

## 요금과 안전

- 사진 한 장을 읽을 때마다 Claude API 사용료가 듭니다. 사진은 긴 쪽 1600px로 줄여서 보냅니다.
- **비밀번호(`ACCESS_CODE`)를 아는 사람만** 쓸 수 있습니다. 비밀번호가 새면 Cloudflare에서 값만 바꾸면 됩니다.
- Anthropic Console에서 월 사용 한도(Spend limit)를 정해 두면 요금이 예상보다 많이 나오는 일을 막을 수 있습니다.
- 사진은 읽기 위해 Anthropic(Claude API)으로 전송됩니다. 이 서버는 사진을 저장하지 않습니다.
