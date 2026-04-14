import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase/server';

export async function GET(request: Request) {
    // Get the url 
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    //Handle cancellations and errors
    const error = searchParams.get('error');
    const error_description = searchParams.get('error_description');

    if (error) {
        const errorMessage = error_description || 'Authentication was cancelled.';
        return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(errorMessage)}`);
    }

    if (code) {
        const supabase = await createClient();

        // Exchange the auth code for a valid session
        const { data: authData, error: sessionError } = await supabase.auth.exchangeCodeForSession(code);

        if (!sessionError && authData?.user) {
            const user = authData.user;

            //Generate the default username
            let username = user.user_metadata?.username;
            if (!username && user.email) {
                username = user.email.split('@')[0];
                await supabase.auth.updateUser({
                    data: { username: username }
                });
            }

            // Check for user already exists or not in table
            const { data: existingUser } = await supabase
                .from('users') 
                .select('id')
                .eq('id', user.id)
                .single();

            // If they don't exist, insert them!
            if (!existingUser) {
                await supabase
                    .from('users') 
                    .insert([
                        {
                            id: user.id, // Link it to the Supabase Auth ID
                            email: user.email,
                            username: username, // default username given 
                        }
                    ]);
            }

            //Handle Redirects 
            const forwardedHost = request.headers.get('x-forwarded-host');
            const isLocalEnv = process.env.NODE_ENV === 'development';

            if (isLocalEnv) {
                return NextResponse.redirect(`${origin}${next}`);
            } else if (forwardedHost) {
                return NextResponse.redirect(`https://${forwardedHost}${next}`);
            } else {
                return NextResponse.redirect(`${origin}${next}`);
            }
        } else {
            console.error("Auth Callback Error:", sessionError?.message);
            return NextResponse.redirect(`${origin}/signin?error=${encodeURIComponent(sessionError?.message || 'Authentication failed')}`);
        }
    }

    return NextResponse.redirect(`${origin}/signin?error=Could+not+authenticate`);
}