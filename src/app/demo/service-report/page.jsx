"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import "./print.css";

// Inicialización de Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const limpiarCitas = (texto) => {
  if (typeof texto !== 'string') return texto;
  return texto.replace(/\[[cC][iI][tT][eE]:\s*\d+(?:,\s*\d+)*\]/g, '').trim();
};

const checklistAire = [
  "Verificación visual del estado físico del equipo", "Pruebas de funcionamiento previas",
  "Activación de alarmas", "Conexión a tierra física", "Limpieza de gabinete",
  "Mantenimiento a condensador", "Retiro de material residual", "Alineación de serpentín",
  "Lavado FOAM CLEANER", "PAN CLEAN en charola", "Mantenimiento a compresor",
  "Mantenimiento a ventilador", "Mantenimiento a evaporador", "Válvula de expansión",
  "Carga de gas", "Sistema de arranque", "Sensor de temperatura", "Calibración de control",
  "Consumo de amperaje", "Reemplazo de filtros", "Motores extractores",
  "Motores inyectores", "Bandas y aspiradores", "Puesta en marcha", "Pruebas de esfuerzo"
];

const emptyForm = {
  cliente: "", direccion: "", contrato: "", partida: "", servicio: "",
  folio: "Cargando...", fecha: "", checklist: {},
  fotosAntes: [], fotosDurante: [], fotosDespues: [], fotosEtiqueta: [],
  equipos: [{ equipo: "", marca: "", modelo: "", serie: "" }]
};

export default function ServiceReportPage() {
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchLastFolio = async () => {
      const { data } = await supabase
        .from('reportes_servicio')
        .select('folio')
        .order('created_at', { ascending: false })
        .limit(1);

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastFolioStr = data[0].folio;
        const lastNumber = parseInt(lastFolioStr.split('-').pop());
        if (!isNaN(lastNumber)) nextNumber = lastNumber + 1;
      }

      setForm(prev => ({
        ...prev,
        folio: `MHOS-SSM-EL-${String(nextNumber).padStart(4, "0")}`,
        fecha: new Date().toLocaleDateString()
      }));
    };
    fetchLastFolio();
  }, []);

  const handleInput = (field, value) => setForm(prev => ({ ...prev, [field]: value }));
  const handleChecklist = (item) => setForm(prev => ({ ...prev, checklist: { ...prev.checklist, [item]: !prev.checklist?.[item] } }));
  const addEquipo = () => setForm(prev => ({ ...prev, equipos: [...prev.equipos, { equipo: "", marca: "", modelo: "", serie: "" }] }));
  
  const updateEquipo = (i, field, value) => {
    const copy = [...form.equipos];
    copy[i][field] = value;
    setForm({ ...form, equipos: copy });
  };
  
  const removeEquipo = (i) => setForm(prev => ({ ...prev, equipos: prev.equipos.filter((_, idx) => idx !== i) }));

  const handleFotos = (files, tipo) => {
    const nuevas = Array.from(files);
    setForm(prev => ({ 
      ...prev, 
      [tipo]: tipo === "fotosEtiqueta" ? [nuevas[0]] : [...(prev[tipo] || []), ...nuevas] 
    }));
  };
  
  const removeFoto = (tipo, index) => setForm(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, i) => i !== index) }));

  const uploadImages = async (files, folder) => {
    const urls = [];
    for (const file of files) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${file.name.split('.').pop()}`;
      const filePath = `${form.folio}/${folder}/${fileName}`;
      const { error } = await supabase.storage.from('fotos-reportes').upload(filePath, file);
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('fotos-reportes').getPublicUrl(filePath);
      urls.push(publicUrl.publicUrl);
    }
    return urls;
  };

  const guardarReporte = async () => {
    if (!form.cliente) return alert("Ingresa el cliente antes de guardar.");
    setLoading(true);
    try {
      const [antes, durante, despues, etiqueta] = await Promise.all([
        uploadImages(form.fotosAntes, 'antes'),
        uploadImages(form.fotosDurante, 'durante'),
        uploadImages(form.fotosDespues, 'despues'),
        uploadImages(form.fotosEtiqueta, 'etiqueta')
      ]);

      const { error } = await supabase.from('reportes_servicio').insert([{
        folio: form.folio, fecha: form.fecha, cliente: form.cliente,
        direccion: form.direccion, contrato: form.contrato, partida: form.partida,
        equipos: form.equipos, checklist: form.checklist,
        fotos_antes: antes, fotos_durante: durante, fotos_despues: despues,
        foto_etiqueta: etiqueta[0] || null
      }]);

      if (error) throw error;
      alert("Reporte guardado con éxito en la nube.");
    } catch (err) {
      console.error(err);
      alert("Error al guardar.");
    } finally { setLoading(false); }
  };

  return (
    <>
      <div className="no-print min-h-screen p-8 text-black" style={{ background: "#2F7A4A" }}>
        <div className="max-w-6xl mx-auto">

          {/* Formulario de Entrada */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-md text-black">
            <h2 className="text-xl font-bold mb-4 text-green-900 underline">DATOS DEL REPORTE</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase">Folio Secuencial</label>
                <input value={form.folio} disabled className="w-full border p-2 rounded bg-gray-50 font-bold text-red-600"/>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase">Fecha Emisión</label>
                <input value={form.fecha} disabled className="w-full border p-2 rounded bg-gray-50 text-black"/>
              </div>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
              {/* Información Cliente */}
              <div className="bg-white p-6 rounded-xl shadow-md text-black">
                <h3 className="font-bold mb-3 text-green-800 uppercase">Información del Cliente</h3>
                <input placeholder="Cliente" value={form.cliente} onChange={e=>handleInput("cliente", e.target.value)} className="w-full border p-2 rounded mb-3 text-black placeholder-gray-400"/>
                <input placeholder="Dirección / Unidad" value={form.direccion} onChange={e=>handleInput("direccion", e.target.value)} className="w-full border p-2 rounded mb-3 text-black placeholder-gray-400"/>
                <div className="grid grid-cols-2 gap-3">
                  <input placeholder="Contrato" value={form.contrato} onChange={e=>handleInput("contrato", e.target.value)} className="border p-2 rounded text-black placeholder-gray-400"/>
                  <input placeholder="Partida" value={form.partida} onChange={e=>handleInput("partida", e.target.value)} className="border p-2 rounded text-black placeholder-gray-400"/>
                </div>
              </div>

              {/* Equipos */}
              <div className="bg-white p-6 rounded-xl shadow-md text-black">
                <h3 className="font-bold mb-3 text-green-800 uppercase">Equipos Atendidos</h3>
                {form.equipos.map((eq, i) => (
                  <div key={i} className="border p-4 rounded mb-4 bg-gray-50 relative border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Equipo" value={eq.equipo} onChange={e=>updateEquipo(i, "equipo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Marca" value={eq.marca} onChange={e=>updateEquipo(i, "marca", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Modelo" value={eq.modelo} onChange={e=>updateEquipo(i, "modelo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Serie" value={eq.serie} onChange={e=>updateEquipo(i, "serie", e.target.value)} className="border p-2 rounded text-black"/>
                    </div>
                    {form.equipos.length > 1 && <button onClick={()=>removeEquipo(i)} className="text-red-600 text-xs mt-2 underline font-bold">Quitar Equipo</button>}
                  </div>
                ))}
                <button onClick={addEquipo} className="text-blue-700 font-bold text-sm hover:underline">+ AGREGAR OTRO EQUIPO</button>
              </div>
            </div>

            {/* Checklist */}
            <div className="bg-white p-6 rounded-xl shadow-md h-fit text-black">
              <h3 className="font-bold mb-3 text-green-800 uppercase text-center border-b pb-2">Anexo Técnico</h3>
              <div className="max-h-[500px] overflow-y-auto pr-2">
                {checklistAire.map((item, idx)=>(
                  <label key={idx} className="flex justify-between items-center py-2 border-b text-sm cursor-pointer hover:bg-gray-50 text-gray-800">
                    <span>{item}</span>
                    <input type="checkbox" checked={form.checklist[item] || false} onChange={()=>handleChecklist(item)} className="w-5 h-5"/>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Fotos */}
          <div className="bg-white p-6 rounded-xl shadow-md mt-6 text-black">
            <h3 className="font-bold mb-4 text-center border-b pb-2 text-green-800 uppercase">Evidencia Fotográfica</h3>
            <div className="grid grid-cols-4 gap-4">
              {['Antes', 'Durante', 'Despues', 'Etiqueta'].map(tipo => (
                <div key={tipo} className="border p-3 rounded-lg bg-gray-50 border-gray-200">
                  <p className="font-bold mb-2 text-[10px] uppercase text-center text-gray-700">{tipo}</p>
                  <input type="file" multiple={tipo !== 'Etiqueta'} onChange={e=>handleFotos(e.target.files, `fotos${tipo}`)} className="text-[9px] mb-2 w-full text-black"/>
                  <div className="space-y-2">
                    {form[`fotos${tipo}`]?.map((f, i) => (
                      <div key={i} className="relative aspect-video border rounded bg-white">
                        <img src={URL.createObjectURL(f)} className="object-contain w-full h-full" />
                        <button onClick={()=>removeFoto(`fotos${tipo}`, i)} className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Botones - Texto Blanco */}
          <div className="flex justify-center gap-6 mt-12 pb-10">
            <button 
              onClick={guardarReporte} 
              disabled={loading}
              className="bg-blue-700 text-white font-bold py-4 px-12 rounded-full shadow-xl hover:bg-blue-800 disabled:opacity-50 transition-transform hover:scale-105"
            >
              {loading ? "Subiendo..." : "Guardar"}
            </button>
            <button 
              onClick={() => window.print()} 
              className="bg-black text-white font-bold py-4 px-12 rounded-full shadow-xl hover:bg-gray-900 transition-transform hover:scale-105"
            >
              Imprimir Reporte
            </button>
          </div>

        </div>
      </div>

      {/* --- VISTA DE IMPRESIÓN (PDF) --- */}
      <div className="print-only">
        <div className="print-page">
          <header><img src="/header.PNG" className="w-full" /></header>
          <div className="content-padding text-black">
            <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-4">
              <div>
                <h1 className="text-xl font-bold uppercase leading-tight text-black">Orden/Reporte de Servicio</h1>
                <p className="text-[8px] text-black">FORMATO: MH-MPM-02-01-Folio-Reporte de Servicio</p>
              </div>
              <div className="text-right">
                <p className="text-red-600 font-bold text-lg leading-none">{form.folio}</p>
                <p className="text-[9px] font-bold text-black">Fecha: {form.fecha}</p>
              </div>
            </div>

            <table className="w-full text-[10px] mb-4 text-black">
              <tbody>
                <tr className="h-6">
                  <td className="font-bold w-24 uppercase">Cliente:</td>
                  <td className="border-b border-black">{form.cliente}</td>
                  <td className="font-bold w-32 pl-4 uppercase">Contrato:</td>
                  <td className="border-b border-black">{form.contrato}</td>
                </tr>
                <tr className="h-6">
                  <td className="font-bold uppercase">Dirección:</td>
                  <td className="border-b border-black">{form.direccion}</td>
                  <td className="font-bold pl-4 uppercase">Partida:</td>
                  <td className="border-b border-black">{form.partida}</td>
                </tr>
              </tbody>
            </table>

            <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-3 uppercase text-center">EVIDENCIA FOTOGRÁFICA</h3>

            <div className="grid grid-cols-4 gap-2">
              {['Antes', 'Durante', 'Despues', 'Etiqueta'].map(tipo => (
                <div key={tipo} className="avoid-break text-black">
                  <p className="font-bold text-[8px] mb-1 text-center uppercase border-b border-black pb-1">
                    {tipo === 'Etiqueta' ? 'ETIQUETA' : `${tipo.toUpperCase()} DEL SERVICIO`}
                  </p>
                  <div className="space-y-1">
                    {form[`fotos${tipo}`]?.slice(0, tipo === 'Etiqueta' ? 1 : 2).map((f, i) => (
                      <div key={i} className="border border-black aspect-[4/3] flex items-center justify-center overflow-hidden bg-gray-50">
                        <img src={URL.createObjectURL(f)} className="object-contain w-full h-full" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <table className="w-full border-collapse border border-black text-[8px] mt-8 text-center text-black">
              <tbody>
                <tr className="h-20">
                  <td className="border border-black p-2 w-1/4 align-bottom">
                    <div className="border-t border-black pt-1">Ing/Tec realizó servicio<br/>Firma Entrega</div>
                  </td>
                  <td className="border border-black p-2 w-1/4 align-bottom">
                    <div className="border-t border-black pt-1">Director/Administrador<br/>Recibe/Autoriza</div>
                  </td>
                  <td className="border border-black p-2 w-1/4 align-bottom">
                    <div className="font-bold uppercase">Ing. Adrián Martínez Robles</div>
                    <div className="border-t border-black pt-1">Valida</div>
                  </td>
                  <td className="border border-black p-2 w-1/4 align-top text-gray-400 italic">Sello de la Unidad</td>
                </tr>
              </tbody>
            </table>
          </div>
          <footer className="footer-fixed"><img src="/footer.PNG" className="w-full" /></footer>
        </div>
      </div>
    </>
  );
}
