# Hayul — 하율이의 옷장

하율이 사진에 집에 있는 옷을 인형 옷입히기처럼 넘겨가며 입혀보는 앱. 두 사람만 쓰는 iPhone 홈 화면 앱이에요.

## 구성

- `app/app.html` — 앱 본체
- `tools/build.py` — `app/app.html`을 감싸서 `public/index.html`을 만들어요 (`python3 tools/build.py`)
- `public/` — 앱 화면 파일 (index.html, manifest, sw.js, icons)
- `src/worker.js`, `src/api.js` — Cloudflare Worker. `/api`로 옷·사진을 D1 데이터베이스에 저장해서 두 iPhone이 같은 옷장을 써요
- `wrangler.jsonc` — Cloudflare 배포 설정 (Worker 이름 `hayuls-closet`, D1 `hayuls-closet`은 첫 배포 때 자동으로 만들어져요)

착용 순서(아래→위): 양말 → 하의 → 신발 → 상의 → 조끼 → 외투 → 머리띠 → 머리핀 → 모자

## Cloudflare 설정

1. Workers & Pages → `hayuls-closet` → 이 저장소(main) 연결. Build command 비움, Deploy command `npx wrangler deploy`
2. Settings → Variables and Secrets → Add → 종류 **Secret**, 이름 `ALLOWED_EMAILS`, 값 = 쓸 사람 이메일들(쉼표로 구분)
3. Access 탭(또는 Settings → Domains & Routes → workers.dev)에서 Cloudflare Access 켜기 → 쓸 사람 이메일만 허용, 로그인 방법 One-time PIN, 세션 1개월
4. iPhone Safari에서 workers.dev 주소 열기 → 이메일 코드로 로그인 → 공유 → 홈 화면에 추가 → 홈 화면 앱에서 한 번 더 로그인

서버는 Access가 붙여주는 로그인 이메일이 `ALLOWED_EMAILS`에 있을 때만 데이터를 보여줘요. main에 올리면 자동으로 다시 배포되고, 앱은 열 때마다 최신 화면을 받아요.

## AI 누끼 (옷 배경 지우기)

- `public/bg/` — 아이폰 안에서 배경을 지우는 AI 모델과 실행 파일 ([@imgly/background-removal](https://github.com/imgly/background-removal-js) 1.4.5, ISNet small 모델). 처음 한 번 받아 두고 다음부터는 저장해 둔 것을 써요. 사진은 밖으로 나가지 않아요.
- 이 부분은 AGPL-3.0 라이선스예요 (`public/bg/LICENSE-imgly.md`). 가족끼리 쓰는 비공개 앱이라 문제는 없지만, 앱을 남에게 공개·배포할 때는 이 라이선스를 따라야 해요.
- 배경이 이미 투명한 PNG(다른 앱에서 누끼 딴 사진)를 올리면 다시 지우지 않고 그대로 써요.
