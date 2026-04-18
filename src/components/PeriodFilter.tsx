"use client";

import { useRouter, useSearchParams } from "next/navigation";

const MES_NOMBRES = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function PeriodFilter({
  periodos,
  anio,
  mes,
}: {
  periodos: { anio: number; mes: number }[];
  anio: number;
  mes: number;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const params = new URLSearchParams(searchParams.toString());
    params.set("anio", form.get("anio") as string);
    params.set("mes", form.get("mes") as string);
    params.delete("page");
    router.push(`?${params.toString()}`);
  }

  const anios = Array.from(new Set(periodos.map((p) => p.anio))).sort((a, b) => b - a);
  const mesesDisponibles = periodos.filter((p) => p.anio === anio);

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <select
        name="anio"
        defaultValue={anio}
        className="bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-foreground"
      >
        {anios.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>
      <select
        name="mes"
        defaultValue={mes}
        className="bg-background border border-border-color rounded-lg px-3 py-1.5 text-sm text-foreground"
      >
        {mesesDisponibles.map((p) => (
          <option key={p.mes} value={p.mes}>{MES_NOMBRES[p.mes]}</option>
        ))}
      </select>
      <button
        type="submit"
        className="bg-accent hover:bg-accent-hover text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
      >
        Filtrar
      </button>
    </form>
  );
}
