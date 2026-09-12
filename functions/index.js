/**
* 上課即時翻譯 — 後端（Firebase Cloud Functions v2）
* GET /api/secret?pin=老師PIN&lang=en        → 老師：client_secret + 當日 roomToken
* GET /api/secret?tok=roomToken&lang=zh      → 學員：用當日 token 換 client_secret
* 環境變數（functions/.env，由 GitHub Actions 從 Secrets 產生）：OPENAI_KEY、LIVE_PIN、LIVE_SECRET
*/
const { onRequest } = require("firebase-functions/v2/https");
const crypto = require("crypto");

const LANGS = ["es", "pt", "fr", "ja", "ru", "zh", "de", "ko", "hi", "id", "vi", "it", "en"];

function dayToken(offsetDays) {
const d = new Date(Date.now() + (offsetDays || 0) * 86400000 + 8 * 3600000); // Asia/Taipei
const day = d.toISOString().slice(0, 10).replace(/-/g, "");
return crypto.createHash("sha256").update((process.env.LIVE_SECRET || "") + "|" + day).digest("hex").slice(0, 24);
}

exports.api = onRequest({ region: "asia-east1", cors: true, secrets: [] }, async (req, res) => {
res.set("Cache-Control", "no-store");
const q = req.query || {};
const path = req.path.replace(/\/+$/, "");
if (!(path.endsWith("/secret") || q.action === "live_secret")) return res.status(404).json({ error: "unknown action" });
try {
const key = process.env.OPENAI_KEY;
if (!key) return res.status(500).json({ error: "尚未設定 OPENAI_KEY" });
const pin = process.env.LIVE_PIN || "";
const okPin = !!(q.pin && pin && q.pin === pin);
const okTok = !!(q.tok && (q.tok === dayToken(0) || q.tok === dayToken(-1)));
if (!okPin && !okTok) return res.status(403).json({ error: q.pin ? "PIN 錯誤" : "沒有授權（請重新掃老師的 QR）" });
const lang = String(q.lang || "en").toLowerCase();
if (!LANGS.includes(lang)) return res.status(400).json({ error: "不支援的語言 " + lang });
const body = {
session: {
model: "gpt-realtime-translate",
audio: {
input: { transcription: { model: "gpt-realtime-whisper" }, noise_reduction: { type: q.nr === "far" ? "far_field" : "near_field" } },
output: { language: lang },
},
},
};
const r = await fetch("https://api.openai.com/v1/realtime/translations/client_secrets", {
method: "POST", headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" }, body: JSON.stringify(body),
});
const txt = await r.text();
if (!r.ok) return res.status(502).json({ error: "OpenAI " + r.status, detail: txt.slice(0, 300) });
const j = JSON.parse(txt);
const out = { client_secret: j.value, expires_at: j.expires_at || null, lang };
if (okPin) out.roomToken = dayToken(0);
return res.json(out);
} catch (e) {
return res.status(500).json({ error: String(e.message || e) });
}
});
