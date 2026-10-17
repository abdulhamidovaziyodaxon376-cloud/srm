import { Prisma, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

type CreateResult =
  | { kind: "created"; schedule: unknown }
  | { kind: "conflict" }
  | { kind: "teacher-not-found" }
  | { kind: "room-not-found" };

export async function POST(request: NextRequest) {
  const session = await verifySession(
    request.cookies.get("session")?.value,
    process.env.SESSION_SECRET,
  );

  if (!session) {
    return NextResponse.json({ error: "Autentifikatsiya talab qilinadi." }, { status: 401 });
  }
  if (session.role !== "ADMIN" && session.role !== "TEACHER") {
    return NextResponse.json({ error: "Bu amal uchun ruxsat yo'q." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "So'rov JSON formatida bo'lishi kerak." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "So'rov ma'lumotlari noto'g'ri." }, { status: 400 });
  }

  const input = body as Record<string, unknown>;
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const teacherId = typeof input.teacherId === "string" ? input.teacherId : "";
  const roomId = typeof input.roomId === "string" ? input.roomId : "";
  const startsAt = typeof input.startsAt === "string" ? new Date(input.startsAt) : null;
  const endsAt = typeof input.endsAt === "string" ? new Date(input.endsAt) : null;

  if (
    !title ||
    !teacherId ||
    !roomId ||
    !startsAt ||
    !endsAt ||
    Number.isNaN(startsAt.getTime()) ||
    Number.isNaN(endsAt.getTime()) ||
    startsAt >= endsAt
  ) {
    return NextResponse.json(
      { error: "title, teacherId, roomId va yaroqli startsAt/endsAt talab qilinadi." },
      { status: 400 },
    );
  }

  if (session.role === "TEACHER" && session.sub !== teacherId) {
    return NextResponse.json(
      { error: "O'qituvchi faqat o'z dars jadvalini yaratishi mumkin." },
      { status: 403 },
    );
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await prisma.$transaction(
        async (transaction): Promise<CreateResult> => {
          const [teacher, room] = await Promise.all([
            transaction.user.findUnique({
              where: { id: teacherId },
              select: { role: true },
            }),
            transaction.room.findUnique({
              where: { id: roomId },
              select: { id: true },
            }),
          ]);

          if (!teacher || teacher.role !== UserRole.TEACHER) {
            return { kind: "teacher-not-found" };
          }
          if (!room) return { kind: "room-not-found" };

          const conflict = await transaction.schedule.findFirst({
            where: {
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
              OR: [{ roomId }, { teacherId }],
            },
            select: { id: true },
          });

          if (conflict) return { kind: "conflict" };

          const schedule = await transaction.schedule.create({
            data: { title, teacherId, roomId, startsAt, endsAt },
          });
          return { kind: "created", schedule };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );

      if (result.kind === "teacher-not-found") {
        return NextResponse.json({ error: "O'qituvchi topilmadi." }, { status: 404 });
      }
      if (result.kind === "room-not-found") {
        return NextResponse.json({ error: "Xona topilmadi." }, { status: 404 });
      }
      if (result.kind === "conflict") {
        return NextResponse.json(
          { error: "Bu vaqtda xona yoki o'qituvchi boshqa dars bilan band." },
          { status: 409 },
        );
      }

      return NextResponse.json({ schedule: result.schedule }, { status: 201 });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034" &&
        attempt < 2
      ) {
        continue;
      }

      return NextResponse.json({ error: "Jadvalni saqlashda xatolik yuz berdi." }, { status: 500 });
    }
  }

  return NextResponse.json(
    { error: "Jadval bir vaqtda o'zgartirildi. Qayta urinib ko'ring." },
    { status: 409 },
  );
}