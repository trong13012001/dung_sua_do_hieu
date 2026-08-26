---
name: verifying-changes
description: Use when about to claim a change works, is done, or is fixed in this repo — dung_sua_do_hieu has no test suite and a large pre-existing lint error baseline, so the usual "tests pass" evidence does not exist here.
---

# Verifying changes in this repo

**REQUIRED BACKGROUND:** superpowers:verification-before-completion — evidence before assertions.
This skill only supplies the repo-specific commands, because the usual evidence (a green test run) is unavailable.

## Overview

Repo có **0 test, 0 test runner**. Bằng chứng thay thế: type-check sạch, lint không tăng lỗi, build thành công, và với thay đổi truy vấn dữ liệu thì phải đọc dữ liệu thật.

## Quick reference

| Bước | Lệnh | Tiêu chí đạt |
| --- | --- | --- |
| Type check | `npx tsc --noEmit` | Không output |
| Lint | `npm run lint 2>&1 \| tail -3` | Số lỗi **không tăng** so với baseline |
| Build | `npm run build` | Next build thành công |
| Baseline lint | `git stash -q && npm run lint 2>&1 \| tail -3; git stash pop -q` | Con số để so sánh |

Repo đang có sẵn hàng chục lỗi `@typescript-eslint/no-explicit-any`. `npm run lint` **luôn** exit khác 0 — đó không phải lỗi bạn gây ra. So sánh số lỗi, đừng đuổi về 0.

## Thay đổi truy vấn Supabase

PostgREST trả tối đa **1000 dòng/request**. Build xanh không chứng minh dữ liệu đủ.

Verify bằng dữ liệu thật: viết script tạm trong scratchpad, đọc `.env` lấy
`SUPABASE_SERVICE_ROLE_KEY`, so số dòng nhận được với `Prefer: count=exact` (header
`content-range` trả tổng thật). Chạy trên bản ghi lớn nhất, không phải bản ghi mẫu.

## Thay đổi phần in nhiệt

Không có cách verify tự động. Nói thẳng với người dùng là cần in thử trên XP-80C / XP-235B.
Xem skill `changing-thermal-printing`.

## Red flags — dừng lại, chưa xong

- "Build pass rồi chắc ổn" cho một thay đổi query dữ liệu
- Sửa lint xuống 0 rồi coi đó là điều kiện xong
- Báo xong phần in mà chưa nói rõ là chưa in thử
- Verify bằng khách hàng có 3 đơn trong khi bug xảy ra ở khách có 2000 đơn
