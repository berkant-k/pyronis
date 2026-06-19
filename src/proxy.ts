import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import appConfig from "./lib/config.json";

export function proxy(request: NextRequest) {
  const token = request.cookies.get(appConfig.auth.storageKey)?.value;
  const { pathname } = request.nextUrl;

  if (!token && pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
