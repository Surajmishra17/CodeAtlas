import { createClient } from "@/app/lib/supabase/server";
import { NextResponse } from "next/server";
import { redis } from "@/app/lib/redis";
import { getUserProfileByUserId } from "@/app/lib/user-stats";

interface AboutData {
  avatar_url?: string;
  dob?: string;
  age?: string | number;
  theme?: "light" | "dark";
  visibility?: "public" | "private";
  username_changes_remaining?: number;
  bio?: string;
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Authenticate User
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Unauthorized. Please log in again." },
        { status: 401 }
      );
    }

    // 2. Parse Request Body
    const body = await request.json();
    const { username, first_name, last_name, college, about } = body;

    // 3. Fetch current profile to check username changes and get current username
    const currentProfile = await getUserProfileByUserId(user.id);
    if (!currentProfile) {
      return NextResponse.json(
        { success: false, message: "User profile not found." },
        { status: 404 }
      );
    }

    let cleanUsername = currentProfile.username || "";
    let isChangingUsername = false;

    // Check if a new/different username is provided
    if (username && typeof username === "string" && username.trim()) {
      const inputUsername = username.trim().toLowerCase();
      if (inputUsername !== cleanUsername.toLowerCase()) {
        isChangingUsername = true;
        cleanUsername = inputUsername;
      }
    } else if (!cleanUsername) {
      // If there is no existing username and none was provided, then we must require it
      return NextResponse.json(
        { success: false, message: "Username cannot be empty." },
        { status: 400 }
      );
    }

    // Validate username format only if it's changing
    if (isChangingUsername) {
      if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
        return NextResponse.json(
          {
            success: false,
            message: "Username must be 3-20 characters, containing only letters, numbers, hyphens, and underscores.",
          },
          { status: 400 }
        );
      }
    }

    let aboutData: AboutData = {};
    try {
      if (currentProfile.about) {
        aboutData = JSON.parse(currentProfile.about);
      }
    } catch (e) {
      aboutData = { bio: currentProfile.about || "" };
    }

    let remainingChanges =
      typeof aboutData.username_changes_remaining === "number"
        ? aboutData.username_changes_remaining
        : 3;

    let updatedAboutData = { ...aboutData };

    // 4. Check if username changes limit is exceeded or if new username is taken
    if (isChangingUsername) {
      if (remainingChanges <= 0) {
        return NextResponse.json(
          {
            success: false,
            message: "You have reached your limit of 3 username changes. You cannot change your username again.",
          },
          { status: 400 }
        );
      }

      // Check if the new username is already taken by another user
      const { data: existingUser, error: checkError } = await supabase
        .from("users")
        .select("id")
        .eq("username", cleanUsername)
        .neq("id", user.id)
        .maybeSingle();

      if (checkError) {
        throw checkError;
      }

      if (existingUser) {
        return NextResponse.json(
          { success: false, message: `Username "${cleanUsername}" is already taken.` },
          { status: 400 }
        );
      }

      // Decrement the remaining changes count
      remainingChanges -= 1;
      updatedAboutData.username_changes_remaining = remainingChanges;
    }

    // 5. Merge incoming about data (JSON) if it is supplied
    if (about && typeof about === "object") {
      updatedAboutData = {
        ...updatedAboutData,
        ...about,
        username_changes_remaining: remainingChanges, // Ensure remainingChanges is correctly preserved
      };
    }

    // 6. Update database
    const { error: updateError } = await supabase
      .from("users")
      .update({
        username: cleanUsername,
        first_name: first_name ? first_name.trim() : null,
        last_name: last_name ? last_name.trim() : null,
        college: college ? college.trim() : null,
        about: JSON.stringify(updatedAboutData),
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("DB Profile Update Error:", updateError);
      return NextResponse.json(
        { success: false, message: "Failed to update profile in database.", errorDetail: updateError.message },
        { status: 550 }
      );
    }

    // 7. Clear Redis Cache
    try {
      await Promise.all([
        redis.del(`user:stats:${user.id}`),
        redis.del(`public:stats:${user.id}`),
      ]);
    } catch (cacheErr) {
      console.error("Redis Cache Invalidation Failed:", cacheErr);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Profile updated successfully!",
        profile: {
          username: cleanUsername,
          first_name,
          last_name,
          college,
          about: JSON.stringify(updatedAboutData),
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Update profile API error:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Internal server error" },
      { status: 500 }
    );
  }
}
