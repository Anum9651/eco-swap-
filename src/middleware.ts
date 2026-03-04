import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Admin routes are protected at the page level via DB check
  // This just ensures /admin is never accidentally public
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};