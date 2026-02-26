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
  cliente: "", direccion: "", contrato: "", partida: "", servicio: "MTTO. Preventivo",
  folio: "Cargando...", fecha: "", checklist: {},
  fotosAntes: [], fotosDurante: [], fotosDespues: [], fotosEtiqueta: [],
  equipos: [{ equipo: "", marca: "", modelo: "", serie: "", ssm: "", location: "" }],
  medicion: [{ equipo: "", marca: "", modelo: "", serie: "" }],
  falla: "", condiciones: "", trabajos: "",
  refacciones: [{ descripcion: "", cantidad: "" }]
};

const imprimirTarjeta = () => {
  // 1. Aplicamos la clase
  document.body.classList.add("solo-tarjeta");

  // 2. Esperamos 300ms antes de llamar a la impresión
  // Esto le da tiempo al navegador móvil de ocultar el reporte y mostrar la tarjeta
  setTimeout(() => {
    window.print();
    
    // 3. Quitamos la clase después de un segundo para que la pantalla vuelva a la normalidad
    setTimeout(() => {
      document.body.classList.remove("solo-tarjeta");
    }, 1000);
  }, 300); 
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
  
  // Handlers Dinámicos para listas
  const addItem = (tipo, defaultObj) => setForm(prev => ({ ...prev, [tipo]: [...prev[tipo], defaultObj] }));
  const updateItem = (i, tipo, field, value) => {
    const copy = [...form[tipo]];
    copy[i][field] = value;
    setForm({ ...form, [tipo]: copy });
  };
  const removeItem = (i, tipo) => setForm(prev => ({ ...prev, [tipo]: prev[tipo].filter((_, idx) => idx !== i) }));

  const handleFotos = (files, tipo) => {
  const nuevas = Array.from(files);
  
  setForm(prev => {
    // Obtenemos las fotos que ya existen en esa categoría
    const fotosActuales = prev[tipo] || [];
    
    // Si es la Etiqueta, solo permitimos 1
    if (tipo === "fotosEtiqueta") {
      return { ...prev, [tipo]: [nuevas[0]] };
    }

    const espacioDisponible = 2 - fotosActuales.length;

    if (espacioDisponible <= 0) {
      alert("Ya has alcanzado el límite de 2 fotografías para esta etapa.");
      return prev;
    }

    const fotosAAgregar = nuevas.slice(0, espacioDisponible);

    return { 
      ...prev, 
      [tipo]: [...fotosActuales, ...fotosAAgregar] 
    };
  });
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
        servicio: form.servicio, falla: form.falla, condiciones: form.condiciones,
        trabajos: form.trabajos, equipos: form.equipos, medicion: form.medicion,
        refacciones: form.refacciones, checklist: form.checklist,
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
      <div className="no-print min-h-screen p-2 md:p-8 text-black" style={{ background: "#2F7A4A" }}>
        <div className="w-full max-w-6xl mx-auto">

          {/* Formulario de Entrada */}
          <div className="bg-white rounded-xl p-6 mb-6 shadow-md text-black">
            <h2 className="text-xl font-bold mb-4 text-green-900 underline uppercase">Datos del Reporte</h2>
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

          <div className="bg-white p-6 rounded-xl shadow-md text-black mb-6">
  <h3 className="font-bold mb-3 text-green-800 uppercase text-sm border-b">Información del Cliente</h3>
  <input placeholder="Cliente" value={form.cliente} onChange={e=>handleInput("cliente", e.target.value)} className="w-full border p-2 rounded mb-3"/>
  <input placeholder="Dirección" value={form.direccion} onChange={e=>handleInput("direccion", e.target.value)} className="w-full border p-2 rounded mb-3"/>
  <div className="grid grid-cols-2 gap-3 mb-4">
    <input placeholder="Contrato" value={form.contrato} onChange={e=>handleInput("contrato", e.target.value)} className="border p-2 rounded"/>
    <input placeholder="Partida" value={form.partida} onChange={e=>handleInput("partida", e.target.value)} className="border p-2 rounded"/>
  </div>
  <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Tipo de Servicio</label>
  <select value={form.servicio} onChange={e=>handleInput("servicio", e.target.value)} className="w-full border p-2 rounded bg-gray-50 font-bold">
    <option>MTTO. Preventivo</option>
    <option>MTTO. Correctivo</option>
    <option>Garantía</option>
    <option>Diagnostico</option>
    <option>Instalación y capacitación</option>
  </select>
</div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">

              {/* Datos del Equipo */}
              <div className="bg-white p-6 rounded-xl shadow-md text-black">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <h3 className="font-bold mb-3 text-green-800 uppercase">Datos del Equipo Atendido</h3>
                {form.equipos.map((eq, i) => (
                  <div key={i} className="border p-4 rounded mb-4 bg-gray-50 relative border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Equipo" value={eq.equipo} onChange={e=>updateItem(i, "equipos", "equipo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Marca" value={eq.marca} onChange={e=>updateItem(i, "equipos", "marca", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Modelo" value={eq.modelo} onChange={e=>updateItem(i, "equipos", "modelo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Número de Serie" value={eq.serie} onChange={e=>updateItem(i, "equipos", "serie", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Folio SSM" value={eq.ssm} onChange={e=>updateItem(i, "equipos", "ssm", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Ubicación" value={eq.location} onChange={e=>updateItem(i, "equipos", "location", e.target.value)} className="border p-2 rounded text-black"/>
                    </div>
                    {form.equipos.length > 1 && <button onClick={()=>removeItem(i, "equipos")} className="text-red-600 text-xs mt-2 underline font-bold">Quitar Equipo</button>}
                  </div>
                ))}
                <button onClick={()=>addItem("equipos", { equipo: "", marca: "", modelo: "", serie: "", ssm: "", location: "" })} className="text-blue-700 font-bold text-sm hover:underline">+ AGREGAR OTRO EQUIPO</button>
                </div>
              </div>

              {/* Equipo de Medición */}
              <div className="bg-white p-6 rounded-xl shadow-md text-black">
                <h3 className="font-bold mb-3 text-green-800 uppercase">Equipo de Medición Utilizado</h3>
                {form.medicion.map((med, i) => (
                  <div key={i} className="border p-4 rounded mb-4 bg-gray-50 relative border-gray-200">
                    <div className="grid grid-cols-2 gap-2">
                      <input placeholder="Equipo" value={med.equipo} onChange={e=>updateItem(i, "medicion", "equipo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Marca" value={med.marca} onChange={e=>updateItem(i, "medicion", "marca", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Modelo" value={med.modelo} onChange={e=>updateItem(i, "medicion", "modelo", e.target.value)} className="border p-2 rounded text-black"/>
                      <input placeholder="Número de Serie" value={med.serie} onChange={e=>updateItem(i, "medicion", "serie", e.target.value)} className="border p-2 rounded text-black"/>
                    </div>
                    {form.medicion.length > 1 && <button onClick={()=>removeItem(i, "medicion")} className="text-red-600 text-xs mt-2 underline font-bold">Quitar Equipo de Medición</button>}
                  </div>
                ))}
                <button onClick={()=>addItem("medicion", { equipo: "", marca: "", modelo: "", serie: "" })} className="text-blue-700 font-bold text-sm hover:underline">+ AGREGAR OTRO EQUIPO DE MEDICIÓN</button>
              </div>

              {/* Refacciones */}
              <div className="bg-white p-6 rounded-xl shadow-md text-black">
                <h3 className="font-bold mb-3 text-green-800 uppercase">Refacciones / Accesorios Utilizados</h3>
                {form.refacciones.map((ref, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <input placeholder="Descripción de la refacción o equipo" value={ref.descripcion} onChange={e=>updateItem(i, "refacciones", "descripcion", e.target.value)} className="flex-grow border p-2 rounded text-sm"/>
                    <input placeholder="Cant." value={ref.cantidad} onChange={e=>updateItem(i, "refacciones", "cantidad", e.target.value)} className="w-20 border p-2 rounded text-sm text-center"/>
                    {form.refacciones.length > 1 && <button onClick={()=>removeItem(i, "refacciones")} className="text-red-500 font-bold px-2">×</button>}
                  </div>
                ))}
                <button onClick={()=>addItem("refacciones", { descripcion: "", cantidad: "" })} className="text-blue-700 font-bold text-xs mt-2 underline">+ AGREGAR REFACCIÓN</button>
              </div>

            </div>

            {/* Checklist Lateral */}
            <div className="bg-white p-6 rounded-xl shadow-md h-fit text-black">
              <h3 className="font-bold mb-3 text-green-800 uppercase text-center border-b pb-2">Anexo Técnico</h3>
              <div className="max-h-[800px] overflow-y-auto pr-2">
                {checklistAire.map((item, idx)=>(
                  <label key={idx} className="flex justify-between items-center py-2 border-b text-sm cursor-pointer hover:bg-gray-50 text-gray-800">
                    <span>{item}</span>
                    <input type="checkbox" checked={form.checklist[item] || false} onChange={()=>handleChecklist(item)} className="w-5 h-5"/>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECCIÓN DE REPORTE TÉCNICO - AHORA ANCHO TOTAL */}
          <div className="bg-white p-6 rounded-xl shadow-md space-y-6 text-black mt-6">
  <h3 className="font-bold text-green-800 uppercase border-b pb-2">Diagnóstico y Reporte Técnico</h3>
  
  <div>
    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Falla reportada</label>
    <textarea 
      placeholder="Describa el problema reportado por el cliente o la falla que se encontró durante la revisión." 
      value={form.falla} 
      onChange={e=>handleInput("falla", e.target.value)} 
      className="w-full border p-3 rounded min-h-[80px]"
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Condiciones iniciales del equipo</label>
    <textarea 
      placeholder="¿En qué estado se encontró el equipo al llegar?" 
      value={form.condiciones} 
      onChange={e=>handleInput("condiciones", e.target.value)} 
      className="w-full border p-3 rounded min-h-[80px]"
    />
  </div>

  <div>
    <label className="block text-xs font-bold text-gray-600 uppercase mb-1">Trabajos realizados / Notas / Observaciones / Recomendaciones</label>
    <textarea 
      placeholder="Detalle completo de la intervención, mantenimiento o reparación efectuada, así como cualquier recomendación para el cliente." 
      value={form.trabajos} 
      onChange={e=>handleInput("trabajos", e.target.value)} 
      className="w-full border p-3 rounded min-h-[200px]"
    />
  </div>
</div>

{/* Sección de Fotos con Deshabilitación */}
<div className="bg-white p-6 rounded-xl shadow-md mt-6 text-black">
  <h3 className="font-bold mb-4 text-center border-b pb-2 text-green-800 uppercase">
    Evidencia Fotográfica (Máx. 2 por etapa)
  </h3>
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
    {['Antes', 'Durante', 'Despues', 'Etiqueta'].map(tipo => {
      // Calculamos si ya se alcanzó el límite para deshabilitar
      const limite = tipo === 'Etiqueta' ? 1 : 2;
      const cantidadActual = form[`fotos${tipo}`]?.length || 0;
      const estaLleno = cantidadActual >= limite;

      return (
        <div key={tipo} className="border p-3 rounded-lg bg-gray-50 border-gray-200">
          <p className="font-bold mb-2 text-[10px] uppercase text-center text-gray-700">
            {tipo} ({cantidadActual}/{limite})
          </p>
          
          <input 
            type="file" 
            multiple={tipo !== 'Etiqueta'} 
            onChange={e => handleFotos(e.target.files, `fotos${tipo}`)} 
            // AQUÍ LA DESHABILITACIÓN:
            disabled={estaLleno}
            className={`text-[9px] mb-2 w-full text-black ${estaLleno ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
          />

          <div className="space-y-2">
            {form[`fotos${tipo}`]?.map((f, i) => (
              <div key={i} className="relative aspect-video border rounded bg-white">
                <img src={URL.createObjectURL(f)} className="object-contain w-full h-full" />
                <button 
                  onClick={() => removeFoto(`fotos${tipo}`, i)} 
                  className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center shadow-md"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    })}
  </div>
</div>

{/* Botones Finales */}
<div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-6 mt-12 pb-10">
  <button 
    onClick={guardarReporte} 
    disabled={loading}
    className="w-full md:w-auto bg-blue-700 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:bg-blue-800 disabled:opacity-50 transition-transform hover:scale-105"
  >
    {loading ? "Subiendo..." : "Guardar en Nube"}
  </button>

  <button 
    onClick={() => window.print()} 
    className="w-full md:w-auto bg-black text-white font-bold py-4 px-10 rounded-full shadow-xl hover:bg-gray-900 transition-transform hover:scale-105"
  >
    Imprimir Reporte
  </button>

  <button 
    onClick={imprimirTarjeta} 
    className="w-full md:w-auto bg-green-700 text-white font-bold py-4 px-10 rounded-full shadow-xl hover:bg-green-800 transition-transform hover:scale-105"
  >
    Generar Tarjeta
  </button>
</div>

        </div>
      </div>

      {/* VISTA PDF */}
<div className="print-only">
  <div className="print-page">
    <header><img src="/Technical_Report_MHOS/header.PNG" className="w-full" /></header>
    <div className="content-padding text-black">
      
      <div className="avoid-break">
        <div className="flex justify-between items-end border-b-2 border-black pb-1 mb-4">
          <div>
            <h1 className="text-xl font-bold uppercase leading-tight">Reporte de Servicio</h1>
            <p className="text-[10px] font-bold mt-1 uppercase">SERVICIO: {form.servicio}</p>
          </div>
          <div className="text-right">
            <p className="text-red-600 font-bold text-lg leading-none">{form.folio}</p>
            <p className="text-[9px] font-bold">Fecha: {form.fecha}</p>
          </div>
        </div>

        <table className="w-full text-[10px] mb-4 border border-black border-collapse">
          <tbody>
            <tr>
              <td className="font-bold p-1 bg-gray-100 border border-black w-24">CLIENTE:</td>
              <td className="p-1 border border-black">{form.cliente}</td>
              <td className="font-bold p-1 bg-gray-100 border border-black w-24">CONTRATO:</td>
              <td className="p-1 border border-black">{form.contrato}</td>
            </tr>
            <tr>
              <td className="font-bold p-1 bg-gray-100 border border-black">DIRECCIÓN:</td>
              <td className="p-1 border border-black">{form.direccion}</td>
              <td className="font-bold p-1 bg-gray-100 border border-black">PARTIDA:</td>
              <td className="p-1 border border-black">{form.partida}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="avoid-break">
        <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-1 uppercase text-center">Datos del Equipo Atendido</h3>
        <table className="w-full border-collapse border border-black text-[8px] mb-4 text-center">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1">EQUIPO</th>
              <th className="border border-black p-1">MARCA</th>
              <th className="border border-black p-1">MODELO</th>
              <th className="border border-black p-1">SERIE</th>
            </tr>
          </thead>
          <tbody>
            {form.equipos.map((eq, i) => (
              <tr key={i}>
                <td className="border border-black p-1 uppercase">{eq.equipo}</td>
                <td className="border border-black p-1 uppercase">{eq.marca}</td>
                <td className="border border-black p-1 uppercase">{eq.modelo}</td>
                <td className="border border-black p-1 uppercase">{eq.serie}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-col md:grid md:grid-cols-2 gap-4 mb-4">
        <div className="avoid-break">
          <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-1 uppercase text-center">Anexo Técnico (Checklist)</h3>
          <div className="border border-black p-2 min-h-[180px]">
            {checklistAire.filter(item => form.checklist[item]).map((item, i) => (
              <div key={i} className="text-[7px] border-b border-gray-200 py-1 uppercase font-medium">• {item}</div>
            ))}
            {checklistAire.filter(item => form.checklist[item]).length === 0 && <p className="text-[8px] italic text-gray-400">Sin actividades marcadas.</p>}
          </div>
        </div>

        <div className="space-y-4">
          <div className="avoid-break">
            <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-1 uppercase text-center">Diagnóstico y Notas</h3>
            <div className="border border-black p-2 text-[8px] min-h-[80px]">
              <p className="mb-1"><strong>Falla Reportada:</strong> {form.falla}</p>
              <p className="mb-1"><strong>Condiciones Iniciales:</strong> {form.condiciones}</p>
              <p><strong>Trabajos Realizados y/o recomendaciones:</strong> {form.trabajos}</p>
            </div>
          </div>
          <div className="avoid-break">
            <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-1 uppercase text-center">Refacciones Utilizadas</h3>
            <table className="w-full border-collapse border border-black text-[8px]">
              <tbody>
                {form.refacciones.map((ref, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1">{ref.descripcion}</td>
                    <td className="border border-black p-1 w-10 text-center">{ref.cantidad}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="avoid-break">
            <h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-1 uppercase text-center">Equipo de Medición</h3>
            <table className="w-full border-collapse border border-black text-[7px]">
              <tbody>
                {form.medicion.map((med, i) => (
                  <tr key={i}>
                    <td className="border border-black p-1 uppercase">{med.equipo} - Número de Serie: {med.serie}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Evidencia Fotográfica Corregida */}
<h3 className="bg-black text-white text-[9px] px-2 py-1 font-bold mb-2 uppercase text-center">Evidencia Fotográfica</h3>

<div className="space-y-4">
  {['Antes', 'Durante', 'Despues', 'Etiqueta'].map(tipo => (
    <div key={tipo} className="avoid-break">
      {/* Título de la etapa (Solo aparece si hay fotos) */}
      {form[`fotos${tipo}`]?.length > 0 && (
        <>
          <p className="text-[8px] font-bold uppercase mb-1 border-b border-gray-300">{tipo}</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {form[`fotos${tipo}`].map((foto, idx) => (
              <div key={idx} className="border border-black aspect-video bg-gray-50 flex items-center justify-center overflow-hidden">
                <img 
                  src={URL.createObjectURL(foto)} 
                  className="object-contain w-full h-full" 
                  alt={`${tipo} ${idx}`}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  ))}
</div>

      <div className="avoid-break seccion-firmas">
  <table className="w-full border-collapse border border-black text-[8px] text-center">
    <tbody>
      <tr className="h-16">
        <td className="border border-black p-2 w-1/4 align-bottom">
          <div className="border-t border-black pt-1">Realizó Servicio<br/>Firma Técnico</div>
        </td>
        <td className="border border-black p-2 w-1/4 align-bottom">
          <div className="border-t border-black pt-1">Recibe Conforme<br/>Firma Cliente</div>
        </td>
        <td className="border border-black p-2 w-1/4 align-bottom">
          <div className="border-t border-black pt-1 font-bold">Ing. Adrián Martínez Robles</div>
          <div>Valida Servicio</div>
        </td>
        <td className="border border-black p-2 w-1/4 align-top text-gray-300 italic">
          Sello de la Unidad
        </td>
      </tr>
    </tbody>
  </table>
</div>

    </div>
    <footer className="footer-fixed"><img src="/Technical_Report_MHOS/footer.PNG" className="w-full" /></footer>
  </div>
</div>

{/* VISTA DE TARJETAS DE IDENTIFICACIÓN OPTIMIZADA */}
<div className="tarjeta-identificacion text-black font-sans">
  {form.equipos && form.equipos.map((eq, index) => (
    <div 
      key={index} 
      className="tarjeta-item bg-white border border-gray-400 mx-auto overflow-hidden" 
      style={{ 
        width: '90mm', 
        height: '55mm', 
        position: 'relative',
        pageBreakAfter: 'always',
        breakAfter: 'page'
      }}
    >
      {/* Header Estirado (W-FULL) */}
      <div className="w-full border-b-2 border-green-700">
        <img src="/Technical_Report_MHOS/header.PNG" className="w-full h-10 object-fill" alt="Header" />
      </div>

      <div className="px-2 py-1">
        {/* Fila Superior: Contrato y Folio */}
        <div className="grid grid-cols-2 gap-2 text-[8px] mb-1">
          <div className="flex gap-1"><span className="font-bold">Contrato:</span><span className="border-b border-black flex-grow truncate">{form.contrato}</span></div>
          <div className="flex gap-1"><span className="font-bold">Folio:</span><span className="border-b border-black flex-grow text-blue-700 font-bold">{form.folio}</span></div>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {/* LADO IZQUIERDO: Datos del Equipo */}
          <div className="space-y-1 border-r pr-2 border-gray-300">
            <div className="flex flex-col"><span className="text-[6px] font-bold text-gray-500 uppercase">Equipo</span><span className="text-[9px] border-b border-gray-300 h-3 truncate leading-none">{eq.equipo}</span></div>
            <div className="flex flex-col"><span className="text-[6px] font-bold text-gray-500 uppercase">Marca</span><span className="text-[9px] border-b border-gray-300 h-3 truncate leading-none">{eq.marca}</span></div>
            <div className="flex flex-col"><span className="text-[6px] font-bold text-gray-500 uppercase">Modelo</span><span className="text-[8px] border-b border-gray-300 h-3 truncate leading-none">{eq.modelo}</span></div>
            <div className="flex flex-col"><span className="text-[6px] font-bold text-gray-500 uppercase">No. Serie</span><span className="text-[9px] border-b border-gray-300 h-3 truncate leading-none">{eq.serie}</span></div>
          </div>
          
          {/* LADO DERECHO: Servicio, Fecha y Firma (Compacto) */}
          <div className="flex flex-col justify-between">
            <div>
              <span className="text-[6px] font-bold text-green-800 uppercase">Servicio Realizado</span>
              <p className="text-[9px] font-bold border-b border-black leading-tight mb-2 min-h-[12px]">{form.servicio}</p>
              
              {/* Fecha y Firma*/}
              <div className="space-y-2">
                <div className="flex flex-col">
                  <span className="text-[6px] font-bold uppercase">Fecha</span>
                  <span className="border-b border-black text-[9px] h-3 leading-none">{form.fecha}</span>
                </div>
                <div className="flex flex-col pt-1">
                  <div className="border-b border-black w-full h-3"></div>
                  <span className="text-[5px] text-center uppercase font-bold mt-0.5">Nombre y firma de quien realizó</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer: Línea Verde Sencilla */}
      <div className="absolute bottom-0 left-0 w-full h-1 bg-green-700"></div>
    </div>
  ))}
</div>
    </>
  );
}