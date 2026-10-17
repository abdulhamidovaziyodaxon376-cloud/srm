import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession } from "@/lib/session";

const roleByPassword: Record<string, UserRole> = {
  admin123: UserRole.ADMIN,
  teacher123: UserRole.TEACHER,
  student123: UserRole.STUDENT,
};

const homeByRole: Record<UserRole, string> = {
  [UserRole.ADMIN]: "/admin",
  [UserRole.TEACHER]: "/teacher",
  [UserRole.STUDENT]: "/student",
};

export async function POST(request: NextRequest) {
  let username = "";
  let password = "";

  try {
    if (request.headers.get("content-type")?.includes("application/json")) {
      const body: unknown = await request.json();
      if (body && typeof body === "object") {
        const input = body as Record<string, unknown>;
        username = typeof input.username === "string" ? input.username.trim() : "";
        password = typeof input.password === "string" ? input.password : "";
      }
    } else {
      const formData = await request.formData();
      const submittedUsername = formData.get("username");
      const submittedPassword = formData.get("password");
      username = typeof submittedUsername === "string" ? submittedUsername.trim() : "";
      password = typeof submittedPassword === "string" ? submittedPassword : "";
    }
  } catch {
    return NextResponse.json({ error: "Login ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const role = roleByPassword[password];
  if (!username || username.length > 80 || !role) {
    return NextResponse.json({ error: "Login yoki parol noto'g'ri." }, { status: 401 });
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Sessiya sozlamasi mavjud emas." }, { status: 500 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: { id: true, role: true },
    });

    if (!user || user.role !== role) {
      return NextResponse.json({ error: "Login yoki parol noto'g'ri." }, { status: 401 });
    }

    const token = await signSession({ sub: user.id, role }, secret);
    const response = NextResponse.redirect(new URL(homeByRole[role], request.url), 303);
    response.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 8 * 60 * 60,
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Kirishda xatolik yuz berdi." }, { status: 500 });
  }
}