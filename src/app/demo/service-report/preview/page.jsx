"use client";

export default function PreviewPage() {

  const imprimir = () => window.print();

  return (
    <main className="p-10">
      <button
        onClick={imprimir}
        className="bg-black text-white px-4 py-2 rounded"
      >
        Imprimir / PDF
      </button>
    </main>
  );
}
