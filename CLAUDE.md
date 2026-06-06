# CLAUDE.md — Quy ước dự án my-bjt

Hướng dẫn cho Claude Code. Áp dụng cho mọi session.

## Code
- KHÔNG viết comment giải thích trong source code (JS/CSS/...). Code tự diễn đạt; cần thì user tự đọc hiểu.
- Hệ quả: không viết comment tiếng Việt trong code.
- Không mass-xoá comment legacy cũ trừ khi được yêu cầu.

## Cách làm việc
- KHÔNG tự chạy preview / dev server để verify — user tự test.
- Làm xong chỉ cần báo "đã đối ứng xong" kèm tóm tắt ngắn thay đổi & file đụng tới.

## UI
- Nút / điều khiển dùng ICON-ONLY (kèm `title` + `aria-label` cho a11y), KHÔNG thêm label chữ.
- Ưu tiên on-demand / ẩn bớt thứ dư thừa thay vì luôn hiển thị.
- Chọn icon có nghĩa rõ. VD: 🇻🇳 = tiếng Việt (đồng bộ flag 🇻🇳/🇯🇵 app đang dùng ở settings).
- Trạng thái bật/tắt của nút thể hiện bằng highlight (aria-expanded), không đổi sang chữ.

## Lưu ý
- Quy tắc "no comment / no label" chỉ áp cho **code & UI control**.
- Nội dung bài học hiển thị cho người học vẫn **song ngữ VI/JP**.
