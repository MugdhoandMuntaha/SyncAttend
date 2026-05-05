import { NextResponse } from 'next/server';
import { verifyRegistrationResponse } from '@simplewebauthn/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getExpectedOrigin, getRpID } from '@/lib/webauthn';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const cookieStore = await cookies();
    const challenge = cookieStore.get('webauthn_challenge')?.value;

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

    const verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: getExpectedOrigin(req),
      expectedRPID: getRpID(req),
    });

    if (verification.verified && verification.registrationInfo) {
      const { credential, credentialDeviceType, credentialBackedUp } = verification.registrationInfo;

      // Save passkey to database
      const { error: dbError } = await supabase.from('passkeys').insert({
        student_id: user.id,
        credential_id: credential.id,
        public_key: Buffer.from(credential.publicKey).toString('base64'),
        counter: credential.counter,
        device_type: credentialDeviceType,
        backed_up: credentialBackedUp,
        transports: JSON.stringify(credential.transports || []),
      });

      if (dbError) throw dbError;

      cookieStore.delete('webauthn_challenge');
      return NextResponse.json({ verified: true });
    }

    return NextResponse.json({ verified: false }, { status: 400 });
  } catch (err: any) {
    console.error('Registration verification error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
