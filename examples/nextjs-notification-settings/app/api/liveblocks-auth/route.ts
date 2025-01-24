import { Liveblocks } from "@liveblocks/node";
import { NextRequest, NextResponse } from "next/server";
import { USER_INFO } from "../dummy-users";

/**
 * Authenticating your Liveblocks application
 * https://liveblocks.io/docs/authentication
 */

const liveblocks = new Liveblocks({
  secret: process.env.LIVEBLOCKS_SECRET_KEY!,
});

export async function POST(request: NextRequest) {
  if (!process.env.LIVEBLOCKS_SECRET_KEY) {
    return new NextResponse("Missing LIVEBLOCKS_SECRET_KEY", { status: 403 });
  }

  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get("userId");

  let userIndex = 0;

  if (userId !== null) {
    userIndex = parseInt(userId.replace("user-", ""), 10);
  } else {
    // Get the current user's unique id from your database
    userIndex = Math.floor(Math.random() * USER_INFO.length);
  }

  // Create a session for the current user (access token auth)
  const session = liveblocks.prepareSession(`user-${userIndex}`, {
    userInfo: USER_INFO[userIndex],
  });

  // Use a naming pattern to allow access to rooms with a wildcard
  session.allow(
    `liveblocks:notifications-settings-examples:*`,
    session.FULL_ACCESS
  );

  // Authorize the user and return the result
  const { status, body } = await session.authorize();

  return new NextResponse(body, { status });
}
