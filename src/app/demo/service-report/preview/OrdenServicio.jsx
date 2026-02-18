import { useState, useEffect } from "react";
import "./OrdenServicio.css";
import { checklistAire } from "./AnexoTecnico";

export default function OrdenServicio() {
  const [folio, setFolio] = useState("");
  const [fecha, setFecha] = useState("");
  const [fotos, setFotos] = useState([]);
  const [servicio, setServicio] = useState("");
  const [checks, setChecks] = useState({});

  useEffect(() => {
    generarFolio();
    setFecha(new Date().toLocaleDateString());
  }, []);

  const generarFolio = async () => {
    // AQUÍ LUEGO VA SUPABASE
    let numeroSimulado = 1;
    setFolio(`MHOS-SSM-EL-${String(numeroSimulado).padStart(3, "0")}`);
  };

  const handleFotos = (e) => {
    const files = Array.from(e.target.files);
    setFotos([...fotos, ...files]);
  };

  const toggleCheck = (item) => {
    setChecks({ ...checks, [item]: !checks[item] });
  };

  return (
    <form className="orden-form">
      <h1>Orden de Servicio</h1>

      {/* FOLIO Y FECHA */}
      <div className="grid-2">
        <input value={folio} disabled />
        <input value={fecha} disabled />
      </div>

      {/* CLIENTE */}
      <h3>Datos del Cliente</h3>
      <input placeholder="Nombre del cliente" />
      <input placeholder="Dirección" />
      <input placeholder="Número de contrato" />
      <input placeholder="Partida" />

      {/* SERVICIO */}
      <h3>Tipo de Servicio</h3>
      <select required value={servicio} onChange={(e) => setServicio(e.target.value)}>
        <option value="">Selecciona uno</option>
        <option>MTTO Preventivo</option>
        <option>MTTO Correctivo</option>
        <option>Garantía</option>
        <option>Diagnóstico</option>
        <option>Instalación</option>
        <option>Capacitación</option>
      </select>

      {/* EQUIPO */}
      <h3>Datos del Equipo</h3>
      <input placeholder="Equipo" />
      <input placeholder="Marca" />
      <input placeholder="Modelo" />
      <input placeholder="Número de Serie" />
      <input placeholder="Folio SSM" />
      <input placeholder="Ubicación" />
      <textarea placeholder="Falla reportada" />
      <textarea placeholder="Condiciones iniciales" />
      <textarea placeholder="Trabajos realizados / notas" />
      <textarea placeholder="Refacciones utilizadas" />

      {/* CHECKLIST */}
      <h3>Anexo Técnico</h3>
      <div className="checklist">
        {checklistAire.map((item, i) => (
          <label key={i}>
            <input
              type="checkbox"
              onChange={() => toggleCheck(item)}
            />
            {item}
          </label>
        ))}
      </div>

      {/* FOTOS */}
      <h3>Fotos del Servicio (mínimo 4)</h3>
      <input type="file" multiple accept="image/*" onChange={handleFotos} />

      <div className="preview">
        {fotos.map((f, i) => (
          <img key={i} src={URL.createObjectURL(f)} alt="" />
        ))}
      </div>

      <button>Guardar Orden</button>
    </form>
  );
}
