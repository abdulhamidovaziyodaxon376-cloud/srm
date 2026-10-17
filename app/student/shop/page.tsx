import Image from "next/image";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/session";

type ShopPageProps = {
  searchParams: Promise<{ result?: string }>;
};

export default function StudentShopPage({ searchParams }: ShopPageProps) {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#f3f7f2] text-sm font-semibold text-[#506458]">
          Do&apos;kon yuklanmoqda...
        </main>
      }
    >
      <ShopContent searchParams={searchParams} />
    </Suspense>
  );
}

async function ShopContent({ searchParams }: ShopPageProps) {
  const session = await verifySession(
    (await cookies()).get("session")?.value,
    process.env.SESSION_SECRET,
  );

  if (!session || session.role !== "STUDENT") redirect("/login");

  const [student, items, params] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.sub },
      select: { name: true, coins: true },
    }),
    prisma.shopItem.findMany({ orderBy: { createdAt: "desc" } }),
    searchParams,
  ]);

  if (!student) redirect("/login");

  async function purchaseItem(formData: FormData) {
    "use server";

    const activeSession = await verifySession(
      (await cookies()).get("session")?.value,
      process.env.SESSION_SECRET,
    );
    if (!activeSession || activeSession.role !== "STUDENT") redirect("/login");

    const itemId = formData.get("itemId");
    if (typeof itemId !== "string" || !itemId) {
      redirect("/student/shop?result=error");
    }

    let result: "success" | "missing" | "insufficient" | "error" = "error";
    try {
      result = await prisma.$transaction(async (transaction) => {
        const item = await transaction.shopItem.findUnique({
          where: { id: itemId },
          select: { id: true, priceCoins: true },
        });
        if (!item || item.priceCoins < 0) return "missing";

        const debit = await transaction.user.updateMany({
          where: { id: activeSession.sub, coins: { gte: item.priceCoins } },
          data: { coins: { decrement: item.priceCoins } },
        });
        if (debit.count !== 1) return "insufficient";

        await transaction.purchase.create({
          data: { userId: activeSession.sub, itemId: item.id },
        });
        return "success";
      });
    } catch {
      result = "error";
    }

    if (result === "success") revalidatePath("/student/shop");
    redirect(`/student/shop?result=${result}`);
  }

  const messages: Record<string, string> = {
    success: "Xarid muvaffaqiyatli amalga oshdi.",
    missing: "Bu mahsulot endi mavjud emas.",
    insufficient: "Tangalar yetarli emas.",
    error: "Xaridni bajarib bo'lmadi. Qayta urinib ko'ring.",
  };
  const message = params.result ? messages[params.result] : undefined;

  return (
    <main className="min-h-screen bg-[#f3f7f2] text-[#17251d]">
      <header className="border-b border-[#dce5dc] bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <a href="/student" className="text-sm font-bold tracking-wide text-[#24563d]">
            O&apos;QUV MARKAZI
          </a>
          <a href="/student" className="text-sm font-semibold text-[#506458] hover:text-[#17251d]">
            O&apos;quvchi kabineti
          </a>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="flex flex-col justify-between gap-7 rounded-lg bg-[#174b35] p-7 text-white sm:flex-row sm:items-end sm:p-10">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#b8e67b]">Mukofotlar</p>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">O&apos;quvchi do&apos;koni</h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-[#d6e6da]">
              Salom, {student.name}. Yig&apos;gan tangalaringizni sovg&apos;alarga almashtiring.
            </p>
          </div>
          <div className="flex min-w-44 items-center gap-3 border-t border-white/20 pt-5 sm:border-l sm:border-t-0 sm:pl-7 sm:pt-0">
            <span aria-hidden="true" className="grid size-12 place-items-center rounded-full bg-[#b8e67b] text-xl font-black text-[#174b35]">
              C
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-[#d6e6da]">Hisobingiz</p>
              <p className="mt-0.5 text-2xl font-bold">{student.coins} <span className="text-sm font-semibold">tanga</span></p>
            </div>
          </div>
        </section>

        {message && (
          <p role="status" className="mt-6 rounded-md border border-[#cbdaca] bg-white px-4 py-3 text-sm font-medium">
            {message}
          </p>
        )}

        <section className="mt-10">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#65816f]">Tanlang va xarid qiling</p>
              <h2 className="mt-1 text-2xl font-bold">Sovrinlar</h2>
            </div>
            <span className="text-sm text-[#607268]">{items.length} ta mahsulot</span>
          </div>

          {items.length === 0 ? (
            <div className="border-y border-dashed border-[#c6d4c8] py-14 text-center">
              <h3 className="text-lg font-semibold">Hozircha mahsulotlar yo&apos;q</h3>
              <p className="mt-2 text-sm text-[#607268]">Yangi sovrinlar qo&apos;shilganda ular shu yerda ko&apos;rinadi.</p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((item) => (
                <article key={item.id} className="overflow-hidden rounded-lg border border-[#dce5dc] bg-white">
                  <div className="relative aspect-[4/3] bg-[#e8efe8]">
                    {item.image ? (
                      <Image src={item.image} alt={item.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" unoptimized className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs font-bold uppercase tracking-[0.2em] text-[#819486]">Sovrin</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="text-lg font-bold">{item.title}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-[#607268]">{item.description}</p>
                    <div className="mt-5 flex items-center justify-between gap-3 border-t border-[#e7ede7] pt-4">
                      <p className="font-bold text-[#24563d]">{item.priceCoins} tanga</p>
                      <form action={purchaseItem}>
                        <input type="hidden" name="itemId" value={item.id} />
                        <button
                          type="submit"
                          disabled={student.coins < item.priceCoins}
                          className="min-h-10 rounded-md bg-[#24563d] px-4 text-sm font-bold text-white transition-colors hover:bg-[#173e2b] disabled:cursor-not-allowed disabled:bg-[#dbe3db] disabled:text-[#7b897e]"
                        >
                          Sotib olish
                        </button>
                      </form>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}