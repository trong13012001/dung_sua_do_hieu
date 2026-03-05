import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase-server';
import { User } from '@/lib/types';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employee, password } = body as { employee: Partial<User>; password: string };
    if (!employee?.email || !password) {
      return NextResponse.json(
        { error: 'Email và mật khẩu là bắt buộc' },
        { status: 400 }
      );
    }

    const supabase = createSupabaseAdmin();

    // 1. Create Auth user with Admin API (no session change on client)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: employee.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: employee.name },
    });
    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }
    if (!authUser.user) {
      return NextResponse.json({ error: 'Tạo tài khoản auth thất bại' }, { status: 500 });
    }

    // 2. Insert into public.users. If your users.id is UUID, use auth user's id to link auth ↔ public.users.
    const payload = {
      id: authUser.user.id,
      name: employee.name ?? '',
      email: employee.email,
      phone: employee.phone ?? null,
      address: employee.address ?? null,
      id_card: employee.id_card ?? null,
      role_id: employee.role_id ?? null,
    };
    const { data: row, error: insertError } = await supabase
      .from('users')
      .insert(payload)
      .select()
      .single();

    if (insertError) {
      // Auth user was created; optionally delete it if you want to rollback
      return NextResponse.json(
        { error: 'Tạo hồ sơ nhân viên thất bại: ' + insertError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(row as User);
  } catch (e) {
    console.error('POST /api/users/create', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Lỗi máy chủ' },
      { status: 500 }
    );
  }
}
