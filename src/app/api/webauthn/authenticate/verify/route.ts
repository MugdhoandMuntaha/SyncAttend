import { NextResponse } from 'next/server';
import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getExpectedOrigin, getRpID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const challenge = cookieStore.get('webauthn_auth_challenge')?.value;

    if (!challenge) {
      return NextResponse.json({ error: 'Session expired. Please try again.' }, { status: 400 });
    }

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

    const { data: passkey } = await supabase.from('passkeys').select('*').eq('credential_id', body.id).single();
    if (!passkey) {
      return NextResponse.json({ error: 'Fingerprint not recognized for this account.' }, { status: 400 });
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpID(req),
      credential: {
        id: passkey.credential_id,
        publicKey: Buffer.from(passkey.public_key, 'base64'),
        counter: Number(passkey.counter),
      },
    });

    if (verification.verified) {
      const { authenticationInfo } = verification;
      // Update counter
      await supabase.from('passkeys').update({
        counter: authenticationInfo.newCounter,
        last_used_at: new Date().toISOString()
      }).eq('id', passkey.id);

      cookieStore.delete('webauthn_auth_challenge');
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (err: any) {
    console.error('Auth verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
