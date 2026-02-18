"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { saveDraft, loadDraft } from "@/lib/storage";

const emptyForm = {
  tecnico: "",
  cliente: "",
  folio: "",
  fecha: "",
  descripcion: "",
  fotosAntes: [],
  fotosDespues: [],
};

export default function ServiceReportPage() {
  const router = useRouter();
  const [form, setForm] = useState(() => {
  if (typeof window === "undefined") return emptyForm;
  const saved = loadDraft();
  return saved ?? emptyForm;
});

  useEffect(() => {
    saveDraft(form);
  }, [form]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhotos = (e, type) => {
    const files = Array.from(e.target.files).slice(0, 4);
    const mapped = files.map((file) => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(file),
    }));

    setForm({ ...form, [type]: mapped });
  };

  return (
    <main className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">
        Reporte de Servicio (Demo)
      </h1>

      <section className="grid md:grid-cols-2 gap-4">
        <input
          name="tecnico"
          placeholder="Nombre del técnico"
          className="input"
          value={form.tecnico}
          onChange={handleChange}
        />
        <input
          name="cliente"
          placeholder="Cliente"
          className="input"
          value={form.cliente}
          onChange={handleChange}
        />
        <input
          name="folio"
          placeholder="Folio"
          className="input"
          value={form.folio}
          onChange={handleChange}
        />
        <input
          type="date"
          name="fecha"
          className="input"
          value={form.fecha}
          onChange={handleChange}
        />
      </section>

      <textarea
        name="descripcion"
        placeholder="Descripción del servicio"
        className="input mt-4 h-28"
        value={form.descripcion}
        onChange={handleChange}
      />

      <section className="mt-6">
        <h3 className="font-semibold mb-2">Fotos Antes (máx 4)</h3>
        <input type="file" multiple accept="image/*"
          onChange={(e) => handlePhotos(e, "fotosAntes")}
        />
      </section>

      <section className="mt-6">
        <h3 className="font-semibold mb-2">Fotos Después (máx 4)</h3>
        <input type="file" multiple accept="image/*"
          onChange={(e) => handlePhotos(e, "fotosDespues")}
        />
      </section>

      <div className="flex justify-end mt-8">
        <button
          onClick={() => router.push("/demo/service-report/preview")}
          className="px-6 py-2 bg-slate-900 text-white rounded-lg"
        >
          Vista previa / Imprimir
        </button>
      </div>
    </main>
  );
}
