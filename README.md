# 下班隨手作 · 上課即時翻譯

老師講中文 → 學員手機看到翻譯字幕；學員按住講英文 → 老師看到中文。用 OpenAI `gpt-realtime-translate`（WebRTC 直連），字幕透過 Firestore 廣播。

- `index.html`（放根目錄：GitHub Pages 與 Firebase Hosting 都直接用）：老師端（無參數）＋學員端（`?r=教室代碼`）
- `functions/index.js`：發短效 client secret 的 API（`/api/secret`），OpenAI 金鑰只在這裡
- `firebase.json`：Hosting + `/api/**` → Cloud Function（asia-east1）
- `.github/workflows/deploy.yml`：push main 自動部署

## GitHub Secrets / Variables
Secrets：`FIREBASE_SERVICE_ACCOUNT`（服務帳號 JSON）、`OPENAI_KEY`、`LIVE_PIN`（老師 PIN）、`LIVE_SECRET`（任意亂數，學員當日 token 用）
Variables：`FIREBASE_PROJECT`（Firebase 專案 ID，需 Blaze 方案才能用 Functions）

## Firestore
字幕廣播用 Firestore `live_rooms/{room}`（規則見 `firestore.rules`）。
