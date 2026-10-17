import { connection } from "next/server";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";

function formatCardNumber(value: string): string {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/(.{4})/g, "$1 ").trim();
}

async function PaymentDetails() {
  await connection();
  const settings = await prisma.paymentSettings.findUnique({ where: { id: 1 } });

  return (
    <section
      aria-labelledby="payment-details-title"
      className="border border-[#d9e0da] bg-white p-6 shadow-[0_12px_36px_rgba(34,55,42,0.06)] sm:p-8"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#64806e]">
            Bank o&apos;tkazmasi
          </p>
          <h2 id="payment-details-title" className="mt-2 text-xl font-semibold">
            To&apos;lov rekvizitlari
          </h2>
        </div>
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[#edf4ee] text-[#315d4a]" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" className="size-5" stroke="currentColor" strokeWidth="1.7">
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <path d="M3 10h18M7 15h3" />
          </svg>
        </span>
      </div>

      {settings ? (
        <>
          <div className="mt-7 bg-[#1e4838] p-6 text-white sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs uppercase tracking-[0.14em] text-white/70">
                {settings.bankName || "O'quv markazi"}
              </span>
              <span className="text-xs font-semibold tracking-wider text-white/75">UZS</span>
            </div>
            <p className="mt-9 break-all font-mono text-xl font-medium tracking-wider sm:text-2xl">
              {formatCardNumber(settings.cardNumber)}
            </p>
            <div className="mt-7 border-t border-white/20 pt-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/65">Karta egasi</p>
              <p className="mt-1 text-sm font-semibold uppercase tracking-wide">
                {settings.cardHolder}
              </p>
            </div>
          </div>
          <p className="mt-5 text-xs leading-5 text-[#718077]">
            Karta rekvizitlari o&apos;quv markazi administratori tomonidan boshqariladi. O&apos;tkazmadan
            oldin karta egasining ismini tekshiring.
          </p>
        </>
      ) : (
        <div className="mt-7 border border-dashed border-[#cbd5cd] bg-[#f8faf8] px-5 py-8 text-center">
          <p className="text-sm font-semibold">To&apos;lov rekvizitlari hali kiritilmagan</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#718077]">
            Karta raqami va karta egasining ismini administrator sozlagach, ma&apos;lumotlar shu yerda
            ko&apos;rinadi.
          </p>
        </div>
      )}

      <div className="mt-7 border-t border-[#e4e9e4] pt-5">
        <p className="text-xs leading-5 text-[#718077]">
          Bu sahifa bank o&apos;tkazmasi uchun rekvizitlarni ko&apos;rsatadi. To&apos;lovni avtomatik qabul
          qilish uchun bank yoki to&apos;lov provayderi integratsiyasi alohida sozlanadi.
        </p>
      </div>
    </section>
  );
}

export default function StudentPayPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f3] px-4 py-10 text-[#17221d] sm:px-8 sm:py-14">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10 flex items-center justify-between border-b border-[#d9e0da] pb-5">
          <a href="/student" className="text-sm font-semibold tracking-wide text-[#315d4a]">
            O&apos;QUV MARKAZI <span className="px-2 text-[#a1aea5]">/</span> O&apos;QUVCHI
          </a>
          <span className="text-sm text-[#65736a]">To&apos;lovlar</span>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1fr_0.88fr] lg:items-start">
          <div className="pt-2">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#64806e]">
              Hisob-kitob
            </p>
            <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              O&apos;qish to&apos;lovini amalga oshiring
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-[#627067]">
              Quyidagi karta ma&apos;lumotlaridan foydalanib bank ilovangiz orqali o&apos;tkazma qiling.
              To&apos;lov izohiga ism-familiyangizni yozishni unutmang.
            </p>

            <div className="mt-9 border-l-2 border-[#75a68a] pl-5">
              <h2 className="text-sm font-semibold">To&apos;lovdan keyin</h2>
              <p className="mt-2 text-sm leading-6 text-[#627067]">
                To&apos;lov chekini administratorga yuboring. To&apos;lov tasdiqlangach, CRM hisobingizda
                holat yangilanadi.
              </p>
            </div>
          </div>

          <Suspense
            fallback={
              <section className="border border-[#d9e0da] bg-white p-6 sm:p-8">
                <p className="text-sm text-[#718077]">To&apos;lov rekvizitlari yuklanmoqda...</p>
              </section>
            }
          >
            <PaymentDetails />
          </Suspense>
        </section>
      </div>
    </main>
  );
}