import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/app/lib/supabase/admin";

export async function POST(request: Request) {
    try {
        const supabase = await createClient();
        const supabaseAdmin = getSupabaseAdmin();

        const body = await request.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
            return NextResponse.json(
                { success: false, message: "Invalid parameters" },
                { status: 400 }
            );
        }

        // --- NEW: Check if the username is already taken ---
        const { data: existingUser } = await supabaseAdmin 
            .from("users")
            .select("username")
            .eq("username", username)
            .single();

        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "Username is already taken. Please choose another." },
                { status: 409 }
            );
        }

        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }

        const user = data.user;

        if (user) {
            const { error: insertError } = await supabaseAdmin.from("users").insert({
                id: user.id,
                username,
                email
            });

            if (insertError) {
                return NextResponse.json(
                    { success: false, message: insertError.message },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            { success: true, message: "Verification email sent" },
            { status: 200 }
        );
    } catch (error) {
        console.log("Signup error", error)
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        return NextResponse.json(
            { success: false, message: "Signup failed", errorDetail: errorMessage },
            { status: 500 }
        );
    }
}