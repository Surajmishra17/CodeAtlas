import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request : Request) {
    try {
        // Initialize supabase client
        const supabase = await createClient()

        // verify user is authenticated
        const {data: {user}, error: authError} = await supabase.auth.getUser()

        if(authError || !user){
            return NextResponse.json({
                success: false,
                message: "Unauthorized. Please log in"
            },{status:401})
        }

        // parse the request body
        const body = await request.json()
        const {platform_name, handle} = body;

        if(!platform_name || !handle){
            return NextResponse.json({
                success: false,
                message: "Platform name and handle are required"
            },{status: 400})
        }

        // insert or update the handle in the database
        // we use upsert so a user submits a new handle for existing platform, it updates the old one
        const {error: insertError} = await supabase
        .from("platform_handles")
        .upsert({ 
            user_id: user.id,
            platform_name: platform_name.toLowerCase(),
            handle: handle
        },{
            onConflict: 'user_id, platform_name'
        })

        if(insertError){
            return NextResponse.json({
                success: false,
                message: "Failed to save handle",
                errorDetail: insertError.message
            },{status:500})
        }

        return NextResponse.json({
            success: true,
            message: "Handle saved successfully!"
        },{status:200})

    } catch (error) {
        console.error("Save handle error:", error)
        return NextResponse.json({
            success: true,
            message: "Internal server error"
        },{status:500})
    }
}

// GET method to fetch the user saved handles
export async function GET(request: Request) {
    try {
        const supabase = await createClient()
        const{data :{user}} = await supabase.auth.getUser()

        if(!user){
            return NextResponse.json({
                success: false,
                message: "Unauthorized"
            },{status:401})
        }

        const {data: handles, error} = await supabase
        .from("platform_handles")
        .select("platform_name, handle")
        .eq("user_id", user.id)

        if(error) throw error

        return NextResponse.json({
            success: true,
            data: handles
        },{status: 200})

    } catch (error) {
        return NextResponse.json({ 
            success: false, 
            message: "Failed to fetch handles" 
        }, { status: 500 });
    }
}