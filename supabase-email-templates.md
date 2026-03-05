# Supabase email templates

Copy each block into **Supabase Dashboard → Authentication → Email Templates** for the matching type.

---

## Reset Password (Recovery)

**Where:** Authentication → Email Templates → **Reset Password**

### Subject (optional; default is fine)
```
Đặt lại mật khẩu - Dũng Sửa Đồ Hiệu
```
or in English:
```
Reset your password
```

### Message body (paste into the template editor)

```html
<h2>Reset Password</h2>
<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
<p>If you didn't request this, you can ignore this email.</p>
```

**Vietnamese version (optional):**
```html
<h2>Đặt lại mật khẩu</h2>
<p>Bạn đã yêu cầu đặt lại mật khẩu. Nhấn vào link bên dưới để tiếp tục:</p>
<p><a href="{{ .ConfirmationURL }}">Đặt lại mật khẩu</a></p>
<p>Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>
```

**Important:** The link must use `{{ .ConfirmationURL }}` exactly so Supabase can inject the verification URL. Your app's **Redirect URLs** must include your reset page (e.g. `https://your-domain.com/reset-password` and `http://localhost:3000/reset-password`).
