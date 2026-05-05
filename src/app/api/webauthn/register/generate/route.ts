import { NextResponse } from 'next/server';
import { generateRegistrationOptions } from '@simplewebauthn/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { rpName, getRpID } from '@/lib/webauthn';

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

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile } = await supabase.from('profiles').select('email, full_name').eq('id', user.id).single();
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    const { data: passkeys } = await supabase.from('passkeys').select('credential_id').eq('student_id', user.id);
    
    // Convert string base64url credential IDs to the format simplewebauthn expects
    const excludeCredentials = passkeys?.map(pk => ({
      id: pk.credential_id, // simplewebauthn allows string in v10 for isoBase64URL
      type: 'public-key' as const,
      transports: ['internal', 'hybrid', 'usb', 'nfc', 'ble'] as any[],
    })) || [];

    const options = await generateRegistrationOptions({
      rpName,
      rpID: getRpID(req),
      userName: profile.email,
      userDisplayName: profile.full_name,
      attestationType: 'none',
      excludeCredentials,
      authenticatorSelection: {
        residentKey: 'required',
        userVerification: 'required', // force biometric/PIN
        authenticatorAttachment: 'platform', // force device's own sensor
      },
    });

    // Store challenge in HTTP-only cookie
    cookieStore.set('webauthn_challenge', options.challenge, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 5, // 5 minutes
      path: '/'
    });

    return NextResponse.json(options);
  } catch (err: any) {
    console.error('Error in generate options:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
