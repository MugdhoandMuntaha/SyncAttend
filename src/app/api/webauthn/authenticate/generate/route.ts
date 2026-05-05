import { NextResponse } from 'next/server';
import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getRpID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll() {}
        }
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: passkeys } = await supabase.from('passkeys').select('credential_id, transports').eq('student_id', user.id);
    if (!passkeys || passkeys.length === 0) {
      return NextResponse.json({ error: 'No fingerprint registered. Please register your device in your dashboard first.' }, { status: 400 });
    }

    const allowCredentials = passkeys.map(pk => ({
      id: pk.credential_id,
      type: 'public-key' as const,
      transports: pk.transports ? JSON.parse(pk.transports) : undefined,
    }));

    const options = await generateAuthenticationOptions({
      rpID: getRpID(req),
      allowCredentials,
      userVerification: 'required',
    });

    cookieStore.set('webauthn_auth_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5,
      path: '/'
    });

    return NextResponse.json(options);
  } catch (err: any) {
    console.error('Auth generate error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
