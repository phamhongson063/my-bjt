# CLAUDE.md — Quy ước dự án my-bjt

Hướng dẫn cho Claude Code. Áp dụng cho mọi session.

## Code
- KHÔNG viết comment giải thích trong source code (JS/CSS/...). Code tự diễn đạt; cần thì user tự đọc hiểu.
- Hệ quả: không viết comment tiếng Việt trong code.
- Không mass-xoá comment legacy cũ trừ khi được yêu cầu.

## Cách làm việc
- KHÔNG tự chạy preview / dev server để verify — user tự test.
- Làm xong chỉ cần báo "đã đối ứng xong" kèm tóm tắt ngắn thay đổi & file đụng tới.
- KHÔNG cắt ảnh minh hoạ `books/{bookId}/images/` và KHÔNG tô màu — **user tự làm**. Trong JSON chỉ trỏ đúng path chuẩn (`books/{bookId}/images/{trang}_{n}.{jpg|png}`, để THẲNG trong `images/`, KHÔNG thư mục con theo bài) để user bỏ ảnh vào. Vẫn được crop scan `C2/` để **ĐỌC** chữ nhỏ khi soạn bài.

## UI
- Nút / điều khiển dùng ICON-ONLY (kèm `title` + `aria-label` cho a11y), KHÔNG thêm label chữ.
- Ưu tiên on-demand / ẩn bớt thứ dư thừa thay vì luôn hiển thị.
- Chọn icon có nghĩa rõ. VD: 🇻🇳 = tiếng Việt (đồng bộ flag 🇻🇳/🇯🇵 app đang dùng ở settings).
- Trạng thái bật/tắt của nút thể hiện bằng highlight (aria-expanded), không đổi sang chữ.

## Lưu ý
- Quy tắc "no comment / no label" chỉ áp cho **code & UI control**.
- Nội dung bài học hiển thị cho người học vẫn **song ngữ VI/JP**.

---

# Chuẩn soạn bài học (`books/{bookId}/*.json`)

Chuẩn này chốt theo `books/978-4866395708/L02.json` + thư viện render của `lesson.html`. Bài sau bám đúng chuẩn này.

## Thư viện nhiều sách
- `index.html` = **thư viện** (catalog), đọc `library.json` ở gốc (mỗi cuốn: `id, isbn, title, titleVi, author, publisher, cover, tagline`). Bìa sách để ở `asset/library/{isbn}.jpg`.
- Mỗi cuốn = 1 thư mục `books/{bookId}/` chứa `index.json` (lộ trình) + `L{NN}.json` (bài). `bookId` = ISBN. Cuốn hiện tại: `978-4866395708`.
- `book.html?book={bookId}` = danh sách bài của 1 cuốn; `lesson.html?book={bookId}&id=L{NN}` = bài học (thiếu `book` → mặc định `DEFAULT_BOOK_ID` = ISBN cuốn đầu).
- Firestore key per-bài qua `asset/script/core/books.js`: cuốn `DEFAULT_BOOK_ID` giữ key trần (`L01`) để không mất data cũ, cuốn khác prefix `{bookId}__L01`; doc luôn ghi kèm field `bookId`.

## Kiến trúc render (data-driven)
- `lesson.html` chỉ là khung. Toàn bộ nội dung sinh ra từ `books/{bookId}/L{NN}.json`.
- `core/app.js` → render lesson-level (title, intro, ảnh, audio) + lặp `sections[]`. Mỗi `section.type` map tới 1 plugin trong `asset/script/plugins/` qua `plugins/registry.js`.
- Thêm **loại section mới** = thêm 1 file plugin + đăng ký ở `plugins/index.js`. KHÔNG nhét logic render vào HTML/JSON.
- Helper dùng chung: `core/utils.js` (`bilingual`, `furi`, `copyJp`), `core/audio.js` (`speak` = TTS, `playSegment` = cắt đoạn audio sách). Tính năng phụ ở `features/` (toc, settings, progress, study-tracker).

## Quy trình & asset
- File: `books/{bookId}/L{NN}.json` (NN 2 chữ số). Đăng ký bài trong `books/{bookId}/index.json` (`id, order, title, titleVi, phase, chapter`). Đăng ký cuốn sách mới trong `library.json` ở gốc.
- Ảnh: `books/{bookId}/images/{trang}_{n}.{jpg|png}` — tất cả ảnh để THẲNG trong `images/` (không thư mục con theo bài); tên `{trang}_{n}` đã đủ định danh vì số trang là duy nhất trong cuốn. Ảnh chung (vd avatar `alex.jpg`) cũng nằm thẳng đây. Audio sách: `asset/audio/Track1-{NN}.mp3`.
- **Đọc nội dung trang sách → luôn lấy ảnh scan trong thư mục `C2/`**, đặt tên `p_<NN>.{jpg|png}` (NN = số trang, vd `C2/p_36.jpg`). Khi cần đọc/đối chiếu 1 trang → mở đúng `C2/p_<NN>`. Gồm cả trang phụ lục: đáp án 答え (cuối sách, ~p.186–188+), ロールカード (A=`p_168`, B=`p_172`), 敬語動詞の表 (`p_176`). Chữ nhỏ/mờ → crop + phóng to (PIL) rồi Read lại cho chính xác, KHÔNG đoán. (Phân biệt: `books/{bookId}/images/` = ảnh minh hoạ render trong app; `C2/` = ảnh scan nguồn để đọc.)
- Bám sách gốc (`新にほんご敬語トレーニング`, info ở `index.json`). **KHÔNG tự bịa** quiz / ví dụ / đáp án — chỉ số hoá đúng nội dung sách.
- Phụ lục / 付録 / trang tổng kết → **nhúng vào đúng mục liên quan**, KHÔNG dump 1 cục hay tách bài riêng. (L02: bảng `敬語動詞の表` p176 đặt ngay sau mục ⑤; `会話例` p187 đặt dưới từng tình huống roleplay.)

## Song ngữ (quy tắc cốt lõi)
- Tiếng Nhật = nội dung học (luôn hiện). Tiếng Việt = gloss/giải thích (có thể bị toggle/ẩn).
- **Văn giải thích** → cặp `field` (VI) + `field_jp` (JP), hiển thị qua `bilingual()`, toggle theo setting "Giải thích" (vi/jp/both). Gồm: `intro/intro_jp`, `explanation/explanation_jp`, `note/note_jp`, `warning/warning_jp`, `content/content_jp`, `answerRef/answerRef_jp`.
- **Nội dung học** → JP ở `jp`/`q`/`pattern`/`answer`/`passage`/`instruction`; VI gloss đi kèm ở `vi`/`qVi`/`patternVi`/`answer_vi`/`passageVi`/`instruction_vi`.
- `exam mode` ẩn hết VI trong quiz/reading → luôn viết đủ cả 2 thứ tiếng.
- Furigana `{漢字|かな}` → `<ruby>`, **chỉ render trong ô của `verbtable`**. Chỗ khác để JP trần (text là innerHTML nên cẩn thận ký tự `<`).
- Audio: nút 🔊 (TTS) tự gắn cho mọi text — không cần khai báo. Audio sách: set `section.audio` + `audioStart`/`audioEnd` (giây) ở item/câu hỏi → ra nút 🎧 phát đúng đoạn.

## Lesson-level (bắt buộc)
```json
{
  "id": "L02", "order": 2,
  "title": "1課 訪問する", "titleVi": "Bài 1 — Thăm khách...",
  "level": "初級修了 → N3", "phase": "第2章: 場面別敬語トレーニング",
  "estimatedMinutes": 45,
  "intro": "...(VI)...", "intro_jp": "...(JP)...",
  "sections": [ ... ]
}
```

## Section — field chung
`type` (bắt buộc) + `title` (chuỗi JP, kèm emoji + ref trang, vd `"🎯 ④ 「お〜になります」 — Sonkeigo (trang 24)"`). Tuỳ chọn: `image`, `imageAlt`, `imageCaption`, `intro`+`intro_jp`, `audio`+`audioLabel`, `page` (metadata, không render).

## Catalog `section.type` (9 loại)

**tips** — khối giải thích/tổng kết.
```json
{ "type": "tips", "title": "...", "content": "...(VI)", "content_jp": "...(JP)" }
```

**grammar** — mẫu ngữ pháp + ví dụ.
```json
{ "type": "grammar", "title": "...", "items": [{
  "pattern": "お + [Vます] + ください", "patternVi": "(gloss VI, optional)",
  "explanation": "...(VI)", "explanation_jp": "...(JP)",
  "warning": "...(VI, optional)", "warning_jp": "...(JP, optional)",
  "examples": [{ "jp": "どうぞお入りください。", "vi": "Mời anh vào ạ." }]
}]}
```

**vocab** — thẻ từ vựng (section có thể có `intro`/`intro_jp`).
```json
{ "type": "vocab", "title": "...", "items": [{
  "jp": "召し上がります", "kana": "めしあがります", "vi": "Ăn/uống (sonkeigo)",
  "note": "...(VI, optional)", "note_jp": "...(JP, optional)",
  "exampleJp": "...", "exampleVi": "...",
  "image": "books/978-4866395708/images/22_1.jpg..(optional)", "audio": "..", "audioStart": 0, "audioEnd": 5
}]}
```

**verbtable** — bảng tra động từ keigo (ô hỗ trợ furigana `{漢字|かな}` và phân tách `／`).
```json
{ "type": "verbtable", "title": "...", "intro": "..", "intro_jp": "..",
  "columns": { "plain": "普通形", "sonkeigo": "尊敬語", "kenjougo": "謙譲語" },
  "rows": [{ "plain": "{行|い}きます", "plainVi": "đi",
             "sonkeigo": "いらっしゃいます", "kenjougo": "まいります／{伺|うかが}います" }],
  "note": "..(VI)", "note_jp": "..(JP)" }
```
Ô trống → `""` hiển thị `—`.

**dialogue** — hội thoại bong bóng.
```json
{ "type": "dialogue", "title": "...", "scene": "...(JP, có thể chèn VI trong ngoặc)",
  "image": "..(optional)", "imageAlt": "..", "imageCaption": "..",
  "audio": "..(optional)", "audioLabel": "..",
  "lines": [{ "speaker": "アレックス", "jp": "...", "vi": "..." }],
  "vocabHighlight": ["...(optional)"], "note": "..(VI)", "note_jp": "..(JP)" }
```
Avatar suy từ `speaker`: chứa `アレックス/alex` → nhân vật chính (phải, ảnh alex); `"—"`/`""` → narrator 📖; bắt đầu `✗`/`間違い` → cảnh báo ⚠️; `妻`→👩; `部長/課長/社長`→👨‍💼; `取引/電話`→☎️; còn lại 👤. → đặt tên speaker có nghĩa.

**quiz** — trắc nghiệm.
```json
{ "type": "quiz", "title": "...", "audio": "..(optional)", "audioLabel": "..",
  "questions": [{
    "q": "入る ⇒ ?", "qVi": "(hint VI, optional)",
    "options": [{ "jp": "お入りください", "vi": "Mời vào" }, "hoặc chuỗi JP"],
    "answer": 0,
    "explanation": "..(VI)", "explanation_jp": "..(JP)",
    "audioStart": 14, "audioEnd": 19
  }]}
```
Options **tự xáo trộn khi render** → `answer` là index theo thứ tự bạn viết (renderer tự map lại). Biến thể TTS: `audioQuestion: true` + `audioJp` → nút "Nghe đoạn audio".
**例 (rei) phải ghi rõ ra**: bài có 例 → 例 là **câu hỏi đầu tiên** của quiz (`"q": "例) … ⇒ ?"` + `options` + `answer` + `explanation` trỏ đáp án mẫu, như L02/L03). **KHÔNG** nhét 例 vào `intro`. (Với `exercise` thì 例 là item `"num": "例", "example": true`.)

**reading** — đoạn văn + câu hỏi (question giống quiz).
```json
{ "type": "reading", "title": "...", "passage": "...(JP)", "passageVi": "...(VI)",
  "audio": "..(optional)", "questions": [ { ...như quiz... } ] }
```

**exercise** — bài luyện (loại phong phú nhất). Section: `instruction` (JP, từ sách) + `instruction_vi` (VI, UI ưu tiên hiện VI), `note` (chuỗi JP, optional), `layout`/`style`/`page`/`audio`/`audioLabel` (optional), `items[]`. UX: **không auto-chấm** — gõ rồi bấm `確認`; nút "💡 Xem giải thích" on-demand. `context_vi` → nút toggle 🇻🇳.
```json
// drill bảng:            { "layout": "table", "items": [{ "num": 1, "plain": "言います", "answer": "おっしゃいます", "answer_vi": ".." }] }   // num null → dòng ví dụ ※
// điền (input):          { "num": 1, "context": "...", "context_vi": "..", "answer": "...", "base": "(optional)", "answer_vi": ".." }
// chọn (choice):         { "num": "1", "context": "...A:【？】", "options": ["..",".."], "answerIndex": 1, "answer_vi": ".." }
// nhiều chỗ trống:       { "num": "2", "context": "...【①】...", "subAnswers": [{ "num": "①", "options": ["..",".."], "answerIndex": 1, "answer_vi": ".." }, { "num": "④", "answer": "..", "answer_vi": ".." }] }
// đổi style nói:         { "style": "speak", "items": [{ "num": "例", "example": true, "context": "テニスをしますか。", "audioStart": 0, "audioEnd": 14, "subAnswers": [{ "num": "敬語", "answer": "..なさいますか。", "answer_vi": ".." }, { "num": "友達", "answer": "..する？", "answer_vi": ".." }] }] }
```

**roleplay** — luyện đóng vai + 会話例 nhúng (collapsible).
```json
{ "type": "roleplay", "title": "...", "intro": "..", "intro_jp": "..",
  "scenarios": [{
    "label": "①", "title_jp": "話してみましょう ①", "title_vi": "(optional)",
    "roles": [{ "side": "A", "who_jp": "...", "who_vi": "(optional)", "ref": "p.168", "jp": "đề bài JP", "vi": "đề bài VI" }],
    "hints": [{ "jp": "ごめんください。", "vi": "(gợi ý — KHÔNG phải đáp án sách)" }],
    "model": { "track": "1-10", "audio": "asset/audio/Track1-10.mp3",
               "intro_vi": "..", "intro_jp": "..",
               "lines": [{ "sp": "A", "jp": "...", "vi": "..", "note_vi": "↳ ..(optional)" }] }
  }],
  "answerRef": "..(VI)", "answerRef_jp": "..(JP)" }
```
`model` dùng `lines[]` (hội thoại mẫu) **hoặc** `refSection_vi`/`refSection_jp` (trỏ tới mục khác). `hints` = gợi ý dùng lại mẫu đã học, không phải đáp án sách.
