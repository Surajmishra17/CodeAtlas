import { NextResponse } from "next/server"
import { createClient } from "@/app/lib/supabase/server"


export async function POST(request: Request) {
    const supabase = await createClient()
    try {
        const body = await request.json()

        const { email, password } = body

        if (!email || !password) {
            return NextResponse.json(
                {
                    success: false,
                    message: "Email and password required"
                },
                { status: 400 }
            )
        }

        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        })

        if (error) {
            return NextResponse.json(
                {
                    success: false,
                    message: error.message
                },
                { status: 401 }
            )
        }

        return NextResponse.json(
            {
                success: true,
                message: "Signin successful",
                user: data.user
            },
            { status: 200 }
        )

    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                message: "Signin failed"
            },
            { status: 500 }
        )
    }
}