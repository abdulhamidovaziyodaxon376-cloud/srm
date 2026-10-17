import { NextRequest, NextResponse } from "next/server";
import { verifySession, type UserRole } from "@/lib/session";

const protectedAreas: Array<{ prefix: string; role: UserRole }> = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/teacher", role: "TEACHER" },
  { prefix: "/student", role: "STUDENT" },
];

function homeForRole(role: UserRole): string {
  return `/${role.toLowerCase()}`;
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const area = protectedAreas.find(
    ({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  const isScheduleApi = pathname === "/api/schedule";
  if (!area && !isScheduleApi) return NextResponse.next();

  const session = await verifySession(
    request.cookies.get("session")?.value,
    process.env.SESSION_SECRET,
  );

  if (!session) {
    if (isScheduleApi) {
      return NextResponse.json({ error: "Autentifikatsiya talab qilinadi." }, { status: 401 });
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const allowed = area
    ? session.role === area.role
    : session.role === "ADMIN" || session.role === "TEACHER";

  if (!allowed) {
    if (isScheduleApi) {
      return NextResponse.json({ error: "Bu amal uchun ruxsat yo'q." }, { status: 403 });
    }

    return NextResponse.redirect(new URL(homeForRole(session.role), request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/teacher/:path*", "/student/:path*", "/api/schedule"],
};