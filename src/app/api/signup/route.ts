import { createClient } from "@/app/lib/supabase/client";
import { NextResponse } from "next/server";

const supabase = createClient();

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { username, email, password } = body;

        if (!username || !email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Invalid parameters",
                },
                { status: 400 }
            );
        }

        // Supabase Auth Signup
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: error.message,
                },
                { status: 400 }
            );
        }

        const user = data.user;

        // Insert profile data (without password)
        if (user) {
            const { error: insertError } = await supabase.from("users").insert({
                id: user.id,
                username,
                email,
            });

            if (insertError) {
                return NextResponse.json(
                    {
                        success: false,
                        message: insertError.message,
                    },
                    { status: 500 }
                );
            }
        }

        return NextResponse.json(
            {
                success: true,
                message: "Verification email sent",
            },
            { status: 200 }
        );
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Signup failed",
            },
            { status: 500 }
        );
    }
}