import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://TU_URL_AQUI.supabase.co";
const SUPABASE_KEY = "TU_ANON_KEY_AQUI";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const TIPO_CONFIG = {
  bache:  { label: "Bache / Hueco", emoji: "🕳️", color: "#EF4444" },
  luz:    { label: "Daño de Luz",   emoji: "💡", color: "#F59E0B" },
  basura: { label: "Basura",        emoji: "🗑️", color: "#8B5CF6" },
};

const ESTADO_CONFIG = {
  reportado: { label: "Reportado", color: "#EF4444", dot: "🔴" },
  resuelto:  { label: "Resuelto",  color: "#22C55E", dot: "🟢" },
};

function pinSize(votos) {
  if (votos >= 50) return 64;
  if (votos >= 20) return 52;
  if (votos >= 10) return 44;
  if (votos >= 5)  return 38;
  return 30;
}

// ─── Mapa ─────────────────────────────────────────────────────────────────────
function MapaReportes({ reportes, onMapClick, reporteSeleccionado, setReporteSeleccionado, ubicacionUsuario, modoReporte }) {
  const mapRef = useRef(null);
  const leafletMap = useRef(null);
  const markersRef = useRef([]);
  const modoReporteRef = useRef(false); // ref para que el click del mapa siempre lo detecte
  const marcadorUbicacion = useRef(null);
  const ubicacionRef = useRef(ubicacionUsuario);

  // Sincronizar modoReporte con ref
  useEffect(() => {
    modoReporteRef.current = modoReporte;
  }, [modoReporte]);

  useEffect(() => {
    if (leafletMap.current) return;
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css"; link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css";
      document.head.appendChild(link);
    }

    const iniciarMapa = () => {
      const L = window.L;
      const centro = ubicacionRef.current
        ? [ubicacionRef.current.lat, ubicacionRef.current.lng]
        : [3.4516, -76.532];
      const zoom = ubicacionRef.current ? 16 : 14;
      const map = L.map(mapRef.current, { zoomControl: true }).setView(centro, zoom);
      leafletMap.current = map;
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap", maxZoom: 19,
      }).addTo(map);
      // Poner punto azul si ya tenemos ubicación
      if (ubicacionRef.current) {
        const iconHtml = `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25);"></div>`;
        const icon = L.divIcon({ html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8], className: "" });
        marcadorUbicacion.current = L.marker([ubicacionRef.current.lat, ubicacionRef.current.lng], { icon }).addTo(map);
      }
      // Click en el mapa
      map.on("click", (e) => {
        if (modoReporteRef.current) {
          onMapClick({ lat: e.latlng.lat, lng: e.latlng.lng });
        }
      });
    };

    if (window.L) {
      iniciarMapa();
    } else {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js";
      script.onload = iniciarMapa;
      document.head.appendChild(script);
    }
  }, []);

  // Cuando llega la ubicación del usuario — centra y pone punto azul
  useEffect(() => {
    ubicacionRef.current = ubicacionUsuario;
    if (!ubicacionUsuario) return;
    // Si el mapa ya está listo, centrar ahora
    if (leafletMap.current && window.L) {
      const L = window.L;
      leafletMap.current.setView([ubicacionUsuario.lat, ubicacionUsuario.lng], 16);
      if (marcadorUbicacion.current) leafletMap.current.removeLayer(marcadorUbicacion.current);
      const iconHtml = `<div style="width:16px;height:16px;border-radius:50%;background:#3B82F6;border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.25);"></div>`;
      const icon = L.divIcon({ html: iconHtml, iconSize: [16, 16], iconAnchor: [8, 8], className: "" });
      marcadorUbicacion.current = L.marker([ubicacionUsuario.lat, ubicacionUsuario.lng], { icon }).addTo(leafletMap.current);
    }
  }, [ubicacionUsuario]);

  // Renderizar pines de reportes
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;
    const L = window.L;
    markersRef.current.forEach(m => leafletMap.current.removeLayer(m));
    markersRef.current = [];
    reportes.forEach(r => {
      const cfg = TIPO_CONFIG[r.tipo] || TIPO_CONFIG.bache;
      const isSelected = reporteSeleccionado?.id === r.id;
      const isResuelto = r.estado === "resuelto";
      const size = isResuelto ? 34 : pinSize(r.votos || 1);
      const pulsa = !isResuelto && (r.votos || 1) >= 5;
      const color = isResuelto ? "#22C55E" : cfg.color;
      const iconHtml = `
        <div style="position:relative;width:${size}px;height:${size}px;">
          ${pulsa ? `<div style="position:absolute;inset:0;border-radius:50%;background:${color}44;animation:pulse 1.5s infinite;"></div>` : ""}
          <div style="position:absolute;inset:${isSelected ? 2 : 4}px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;font-size:${Math.round(size*0.4)}px;box-shadow:0 2px 12px ${color}99;border:2px solid white;">
            ${isResuelto ? "✅" : cfg.emoji}
          </div>
          ${(r.votos||1) >= 10 ? `<div style="position:absolute;top:-6px;right:-6px;background:#F97316;color:white;border-radius:99px;font-size:9px;font-weight:900;padding:2px 5px;border:1.5px solid white;">${r.votos}</div>` : ""}
        </div>`;
      const icon = L.divIcon({ html: iconHtml, iconSize: [size, size], iconAnchor: [size/2, size/2], className: "" });
      const marker = L.marker([r.lat, r.lng], { icon }).addTo(leafletMap.current).on("click", () => setReporteSeleccionado(r));
      markersRef.current.push(marker);
    });
  }, [reportes, reporteSeleccionado]);

  return (
    <div style={{ position:"relative", width:"100%", height:"100%" }}>
      <style>{`@keyframes pulse{0%,100%{transform:scale(1);opacity:0.6}50%{transform:scale(2);opacity:0.1}}`}</style>
      <div ref={mapRef} style={{ width:"100%", height:"100%" }} />
    </div>
  );
}

// ─── Modal Reportar ───────────────────────────────────────────────────────────
function ModalReporte({ ubicacion, onClose, onSubmit, onCambiarUbicacion }) {
  const [tipo, setTipo] = useState("bache");
  const [descripcion, setDescripcion] = useState("");
  const [barrio, setBarrio] = useState("");
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [paso, setPaso] = useState(1);

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setFotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    setEnviando(true);
    try {
      let foto_url = null;
      if (fotoFile) {
        const ext = fotoFile.name.split('.').pop() || 'jpg';
        const nombre = `reporte_${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("fotos-reportes").upload(nombre, fotoFile, { contentType: fotoFile.type || "image/jpeg" });
        if (!upErr) {
          const { data: urlData } = supabase.storage.from("fotos-reportes").getPublicUrl(nombre);
          foto_url = urlData.publicUrl;
        }
      }
      const { data, error } = await supabase.from("reportes").insert([{
        tipo, descripcion, barrio, lat: ubicacion.lat, lng: ubicacion.lng,
        estado: "reportado", votos: 1, foto_url,
      }]).select();
      if (error) throw error;
      onSubmit(data[0]);
      setPaso(3);
    } catch (err) {
      alert("Error al enviar. Intenta de nuevo.");
      console.error(err);
    }
    setEnviando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#1C1917", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, padding:"24px", maxHeight:"90vh", overflowY:"auto" }}>
        <div style={{ width:48, height:4, background:"#44403C", borderRadius:99, margin:"0 auto 20px" }} />
        {paso === 3 ? (
          <div style={{ textAlign:"center", padding:"32px 0" }}>
            <div style={{ fontSize:64, marginBottom:16 }}>✅</div>
            <h2 style={{ color:"#FAFAF9", fontSize:22, fontWeight:800, marginBottom:8 }}>¡Reporte enviado!</h2>
            <p style={{ color:"#A8A29E", fontSize:14, marginBottom:28 }}>Ya aparece en el mapa. Compártelo con tus vecinos para sumar votos y generar presión.</p>
            <button onClick={onClose} style={{ background:"#F97316", color:"white", border:"none", borderRadius:12, padding:"14px 40px", fontSize:16, fontWeight:700, cursor:"pointer" }}>Ver en el mapa</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ color:"#FAFAF9", fontSize:20, fontWeight:800, margin:0 }}>{paso === 1 ? "¿Qué encontraste?" : "Cuéntanos más"}</h2>
              <button onClick={onClose} style={{ background:"#292524", border:"none", color:"#A8A29E", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            {paso === 1 && (
              <div>
                <div style={{ display:"grid", gap:12, marginBottom:24 }}>
                  {Object.entries(TIPO_CONFIG).map(([key, cfg]) => (
                    <button key={key} onClick={() => setTipo(key)} style={{ display:"flex", alignItems:"center", gap:14, padding:"16px", borderRadius:14, border:`2px solid ${tipo===key ? cfg.color : "#292524"}`, background:tipo===key ? `${cfg.color}18` : "#292524", cursor:"pointer", textAlign:"left" }}>
                      <span style={{ fontSize:28 }}>{cfg.emoji}</span>
                      <div>
                        <div style={{ color:"#FAFAF9", fontWeight:700, fontSize:16 }}>{cfg.label}</div>
                        <div style={{ color:"#78716C", fontSize:13 }}>
                          {key==="bache" && "Huecos, grietas, daños en el asfalto"}
                          {key==="luz" && "Postes, semáforos, alumbrado público"}
                          {key==="basura" && "Acumulación, puntos negros, escombros"}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
                <button onClick={() => setPaso(2)} style={{ width:"100%", background:"#F97316", color:"white", border:"none", borderRadius:14, padding:"16px", fontSize:16, fontWeight:700, cursor:"pointer" }}>Siguiente →</button>
              </div>
            )}
            {paso === 2 && (
              <div>
                {/* Ubicación con botón cambiar */}
                <div style={{ background:"#292524", borderRadius:10, padding:"10px 14px", marginBottom:14, display:"flex", alignItems:"center", justifyContent:"space-between" }}>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span>📍</span>
                    <div>
                      <div style={{ color:"#A8A29E", fontSize:12 }}>Ubicación capturada</div>
                      <div style={{ color:"#FAFAF9", fontSize:12, fontFamily:"monospace" }}>{ubicacion.lat.toFixed(5)}, {ubicacion.lng.toFixed(5)}</div>
                    </div>
                  </div>
                  <button onClick={onCambiarUbicacion} style={{ background:"#F9731622", border:"1px solid #F9731644", borderRadius:8, padding:"6px 10px", color:"#F97316", fontSize:11, fontWeight:700, cursor:"pointer", whiteSpace:"nowrap" }}>
                    📍 Cambiar
                  </button>
                </div>
                <input type="text" placeholder="Barrio o sector (ej: El Peñón)" value={barrio} onChange={e => setBarrio(e.target.value)} style={{ width:"100%", background:"#292524", border:"1.5px solid #44403C", borderRadius:10, padding:"12px 14px", color:"#FAFAF9", fontSize:15, marginBottom:12, boxSizing:"border-box" }} />
                <textarea placeholder="Descríbelo brevemente... (opcional)" value={descripcion} onChange={e => setDescripcion(e.target.value)} rows={3} style={{ width:"100%", background:"#292524", border:"1.5px solid #44403C", borderRadius:10, padding:"12px 14px", color:"#FAFAF9", fontSize:15, resize:"none", marginBottom:12, boxSizing:"border-box" }} />
                <label style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, padding:"14px", borderRadius:12, border:`2px dashed ${fotoPreview ? "#22C55E" : "#44403C"}`, cursor:"pointer", marginBottom:14, background:fotoPreview ? "#16A34A12" : "transparent" }}>
                  <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display:"none" }} />
                  {fotoPreview
                    ? <><span style={{ fontSize:20, color:"#22C55E" }}>📸</span><span style={{ color:"#22C55E", fontWeight:600 }}>Foto adjunta ✓</span></>
                    : <><span style={{ fontSize:20 }}>📷</span><span style={{ color:"#78716C" }}>Tomar foto del daño </span><span style={{ color:"#EF4444", fontSize:11 }}>* obligatoria</span></>
                  }
                </label>
                {fotoPreview && <img src={fotoPreview} alt="preview" style={{ width:"100%", borderRadius:10, marginBottom:14, maxHeight:160, objectFit:"cover" }} />}
                <div style={{ display:"flex", gap:12 }}>
                  <button onClick={() => setPaso(1)} style={{ flex:1, background:"#292524", color:"#A8A29E", border:"none", borderRadius:14, padding:"16px", fontSize:15, fontWeight:600, cursor:"pointer" }}>← Atrás</button>
                  <button onClick={handleSubmit} disabled={enviando || !fotoFile} style={{ flex:2, background:enviando ? "#78716C" : !fotoFile ? "#292524" : "#F97316", color:!fotoFile ? "#44403C" : "white", border:"none", borderRadius:14, padding:"16px", fontSize:15, fontWeight:700, cursor:enviando || !fotoFile ? "not-allowed" : "pointer" }}>
                    {enviando ? "Enviando..." : !fotoFile ? "📷 Foto requerida" : "📢 Reportar ahora"}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Modal Resuelto ───────────────────────────────────────────────────────────
function ModalResuelto({ reporte, onClose, onResuelto }) {
  const [fotoFile, setFotoFile] = useState(null);
  const [fotoPreview, setFotoPreview] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [listo, setListo] = useState(false);

  const handleFoto = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => setFotoPreview(ev.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!fotoFile) { alert("Necesitas subir una foto que confirme que está resuelto."); return; }
    setEnviando(true);
    try {
      let foto_resuelto_url = null;
      const ext = fotoFile.name.split('.').pop() || 'jpg';
      const nombre = `resuelto_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("fotos-reportes").upload(nombre, fotoFile, { contentType: fotoFile.type || "image/jpeg" });
      if (!upErr) {
        const { data: urlData } = supabase.storage.from("fotos-reportes").getPublicUrl(nombre);
        foto_resuelto_url = urlData.publicUrl;
      }
      const { error } = await supabase.from("reportes").update({ estado: "resuelto", foto_resuelto_url }).eq("id", reporte.id);
      if (error) throw error;
      onResuelto(reporte.id, foto_resuelto_url);
      setListo(true);
    } catch (err) {
      alert("Error al actualizar. Intenta de nuevo.");
      console.error(err);
    }
    setEnviando(false);
  };

  return (
    <div style={{ position:"fixed", inset:0, zIndex:9999, background:"rgba(0,0,0,0.8)", backdropFilter:"blur(4px)", display:"flex", alignItems:"flex-end", justifyContent:"center" }}>
      <div style={{ background:"#1C1917", borderRadius:"24px 24px 0 0", width:"100%", maxWidth:480, padding:"24px", maxHeight:"80vh", overflowY:"auto" }}>
        <div style={{ width:48, height:4, background:"#44403C", borderRadius:99, margin:"0 auto 20px" }} />
        {listo ? (
          <div style={{ textAlign:"center", padding:"24px 0" }}>
            <div style={{ fontSize:56, marginBottom:12 }}>🎉</div>
            <h2 style={{ color:"#22C55E", fontSize:22, fontWeight:800, marginBottom:8 }}>¡Marcado como resuelto!</h2>
            <p style={{ color:"#A8A29E", fontSize:14, marginBottom:24 }}>El pin cambió a verde. ¡Gracias por reportar el arreglo!</p>
            <button onClick={onClose} style={{ background:"#22C55E", color:"white", border:"none", borderRadius:12, padding:"14px 40px", fontSize:16, fontWeight:700, cursor:"pointer" }}>Ver en el mapa</button>
          </div>
        ) : (
          <>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
              <h2 style={{ color:"#FAFAF9", fontSize:20, fontWeight:800, margin:0 }}>¿Ya lo arreglaron?</h2>
              <button onClick={onClose} style={{ background:"#292524", border:"none", color:"#A8A29E", borderRadius:8, padding:"6px 10px", cursor:"pointer", fontSize:18 }}>✕</button>
            </div>
            <p style={{ color:"#A8A29E", fontSize:14, marginBottom:20, lineHeight:1.6 }}>Si pasaste por el lugar y ya está arreglado, sube una foto como evidencia y el pin cambiará a 🟢.</p>
            <label style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:8, padding:"20px", borderRadius:12, border:`2px dashed ${fotoPreview ? "#22C55E" : "#44403C"}`, cursor:"pointer", marginBottom:16, background:fotoPreview ? "#16A34A12" : "transparent" }}>
              <input type="file" accept="image/*" capture="environment" onChange={handleFoto} style={{ display:"none" }} />
              {fotoPreview
                ? <><img src={fotoPreview} alt="preview" style={{ width:"100%", borderRadius:8, maxHeight:180, objectFit:"cover" }} /><span style={{ color:"#22C55E", fontWeight:600, fontSize:14 }}>📸 Foto del arreglo lista</span></>
                : <><span style={{ fontSize:36 }}>📷</span><span style={{ color:"#78716C", fontSize:14 }}>Tomar foto del arreglo</span><span style={{ color:"#44403C", fontSize:12 }}>Requerida para confirmar</span></>
              }
            </label>
            <button onClick={handleSubmit} disabled={enviando || !fotoFile} style={{ width:"100%", background:!fotoFile ? "#292524" : enviando ? "#78716C" : "#22C55E", color:!fotoFile ? "#44403C" : "white", border:"none", borderRadius:14, padding:"16px", fontSize:16, fontWeight:700, cursor:!fotoFile ? "not-allowed" : "pointer" }}>
              {enviando ? "Guardando..." : "✅ Confirmar que está resuelto"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Panel Detalle ────────────────────────────────────────────────────────────
function PanelDetalle({ reporte, onClose, onVotar, onAbrirResuelto }) {
  const cfg = TIPO_CONFIG[reporte.tipo] || TIPO_CONFIG.bache;
  const estadoCfg = ESTADO_CONFIG[reporte.estado] || ESTADO_CONFIG.reportado;
  const isResuelto = reporte.estado === "resuelto";
  return (
    <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:1000, background:"#1C1917", borderRadius:"20px 20px 0 0", padding:"20px", boxShadow:"0 -4px 24px rgba(0,0,0,0.6)", maxHeight:"55vh", overflowY:"auto" }}>
      <div style={{ width:40, height:4, background:"#44403C", borderRadius:99, margin:"0 auto 16px" }} />
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <span style={{ fontSize:28 }}>{cfg.emoji}</span>
          <div>
            <div style={{ color:"#FAFAF9", fontWeight:800, fontSize:17 }}>{cfg.label}</div>
            <div style={{ color:"#78716C", fontSize:13 }}>📍 {reporte.barrio || "Cali"}</div>
          </div>
        </div>
        <button onClick={onClose} style={{ background:"#292524", border:"none", color:"#78716C", borderRadius:8, padding:"4px 8px", cursor:"pointer" }}>✕</button>
      </div>
      <div style={{ display:"inline-flex", alignItems:"center", gap:6, background:`${estadoCfg.color}22`, border:`1px solid ${estadoCfg.color}44`, borderRadius:99, padding:"4px 12px", marginBottom:12 }}>
        <span style={{ fontSize:10 }}>{estadoCfg.dot}</span>
        <span style={{ color:estadoCfg.color, fontSize:13, fontWeight:600 }}>{estadoCfg.label}</span>
      </div>
      {reporte.descripcion && <p style={{ color:"#A8A29E", fontSize:14, marginBottom:12, lineHeight:1.5 }}>"{reporte.descripcion}"</p>}
      {reporte.foto_url && (
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#78716C", fontSize:11, marginBottom:4 }}>📷 FOTO DEL DAÑO</div>
          <img src={reporte.foto_url} alt="Foto del daño" style={{ width:"100%", borderRadius:10, maxHeight:150, objectFit:"cover" }} />
        </div>
      )}
      {reporte.foto_resuelto_url && (
        <div style={{ marginBottom:12 }}>
          <div style={{ color:"#22C55E", fontSize:11, marginBottom:4 }}>✅ FOTO DEL ARREGLO</div>
          <img src={reporte.foto_resuelto_url} alt="Foto del arreglo" style={{ width:"100%", borderRadius:10, maxHeight:150, objectFit:"cover" }} />
        </div>
      )}
      {!isResuelto && (
        <div style={{ background:"#292524", borderRadius:12, padding:"12px", marginBottom:12 }}>
          <div style={{ color:"#A8A29E", fontSize:12, marginBottom:6 }}>PRESIÓN COMUNITARIA</div>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ flex:1, background:"#1C1917", borderRadius:99, height:8 }}>
              <div style={{ width:`${Math.min(((reporte.votos||1)/50)*100,100)}%`, height:"100%", borderRadius:99, background:reporte.votos>=20 ? "#EF4444" : reporte.votos>=10 ? "#F97316" : "#F59E0B", transition:"width 0.5s" }} />
            </div>
            <span style={{ color:"#F97316", fontWeight:800, fontSize:16 }}>{reporte.votos} 🔥</span>
          </div>
          <div style={{ color:"#44403C", fontSize:11, marginTop:4 }}>
            {(reporte.votos||1) < 5 && "Pocos vecinos lo han visto — compártelo"}
            {(reporte.votos||1) >= 5 && (reporte.votos||1) < 20 && "Creciendo — sigue compartiendo"}
            {(reporte.votos||1) >= 20 && (reporte.votos||1) < 50 && "¡Alta presión! El pin es muy visible en el mapa"}
            {(reporte.votos||1) >= 50 && "🚨 Punto crítico — máxima visibilidad en el mapa"}
          </div>
        </div>
      )}
      {!isResuelto && (
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => onVotar(reporte.id)} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:"#F9731618", border:"1.5px solid #F9731644", borderRadius:10, padding:"12px", cursor:"pointer", color:"#F97316", fontWeight:700, fontSize:14 }}>🔥 Yo también lo veo</button>
          <button onClick={onAbrirResuelto} style={{ flex:1, display:"flex", alignItems:"center", justifyContent:"center", gap:6, background:"#22C55E18", border:"1.5px solid #22C55E44", borderRadius:10, padding:"12px", cursor:"pointer", color:"#22C55E", fontWeight:700, fontSize:14 }}>✅ Ya lo arreglaron</button>
        </div>
      )}
      {isResuelto && (
        <div style={{ textAlign:"center", padding:"12px", background:"#22C55E12", border:"1px solid #22C55E33", borderRadius:12, color:"#22C55E", fontWeight:600, fontSize:14 }}>
          🎉 Este daño fue resuelto gracias a la comunidad
        </div>
      )}
    </div>
  );
}

// ─── App Principal ────────────────────────────────────────────────────────────
export default function App() {
  const [reportes, setReportes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState("mapa");
  const [modalReporte, setModalReporte] = useState(false);
  const [modalResuelto, setModalResuelto] = useState(false);
  const [nuevaUbicacion, setNuevaUbicacion] = useState(null);
  const [reporteSeleccionado, setReporteSeleccionado] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [modoReporte, setModoReporte] = useState(false);
  const [ubicacionUsuario, setUbicacionUsuario] = useState(null);

  useEffect(() => {
    cargarReportes();
    // Pedir GPS inmediatamente al abrir la app
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUbicacionUsuario({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.log("GPS no disponible:", err.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    }
  }, []);

  const cargarReportes = async () => {
    setCargando(true);
    const { data, error } = await supabase.from("reportes").select("*").order("created_at", { ascending: false });
    if (!error && data) setReportes(data);
    setCargando(false);
  };

  const reportesFiltrados = reportes.filter(r => filtroTipo === "todos" || r.tipo === filtroTipo);

  const handleMapClick = ({ lat, lng }) => {
    if (!modoReporte) return;
    setNuevaUbicacion({ lat, lng });
    setModoReporte(false);
    setModalReporte(true);
  };

  const handleNuevoReporte = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setNuevaUbicacion({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          setModalReporte(true);
        },
        () => {
          // GPS no disponible — activar modo reporte manual
          setModoReporte(true);
          setVistaActiva("mapa");
        }
      );
    } else {
      setModoReporte(true);
      setVistaActiva("mapa");
    }
  };

  const handleSubmitReporte = (nuevo) => setReportes(prev => [nuevo, ...prev]);

  const handleVotar = async (id) => {
    const r = reportes.find(x => x.id === id);
    if (!r) return;
    const nuevosVotos = (r.votos || 1) + 1;
    await supabase.from("reportes").update({ votos: nuevosVotos }).eq("id", id);
    setReportes(prev => prev.map(x => x.id === id ? { ...x, votos: nuevosVotos } : x));
    setReporteSeleccionado(prev => prev?.id === id ? { ...prev, votos: nuevosVotos } : prev);
  };

  const handleResuelto = (id, foto_resuelto_url) => {
    setReportes(prev => prev.map(x => x.id === id ? { ...x, estado: "resuelto", foto_resuelto_url } : x));
    setReporteSeleccionado(prev => prev?.id === id ? { ...prev, estado: "resuelto", foto_resuelto_url } : prev);
  };

  const stats = {
    total: reportes.length,
    reportados: reportes.filter(r => r.estado === "reportado").length,
    resueltos: reportes.filter(r => r.estado === "resuelto").length,
    votos: reportes.reduce((acc, r) => acc + (r.votos || 0), 0),
  };

  return (
    <div style={{ width:"100%", height:"100vh", background:"#0C0A09", display:"flex", flexDirection:"column", fontFamily:"'Inter', -apple-system, sans-serif", maxWidth:480, margin:"0 auto", position:"relative", overflow:"hidden" }}>

      {/* Header */}
      <header style={{ background:"#1C1917", padding:"14px 20px", display:"flex", justifyContent:"space-between", alignItems:"center", borderBottom:"1px solid #292524", flexShrink:0, zIndex:100 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:36, height:36, borderRadius:10, background:"linear-gradient(135deg, #F97316, #EA580C)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 }}>🕳️</div>
          <div>
            <div style={{ color:"#FAFAF9", fontWeight:900, fontSize:18, letterSpacing:"-0.5px" }}>Bache<span style={{ color:"#F97316" }}>Alert</span></div>
            <div style={{ color:"#78716C", fontSize:11 }}>
              Cali, Valle del Cauca
              {ubicacionUsuario && <span style={{ color:"#3B82F6", marginLeft:6 }}>📍 Ubicación activa</span>}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {cargando && <div style={{ color:"#78716C", fontSize:12 }}>Cargando...</div>}
          <div style={{ background:"#292524", borderRadius:10, padding:"6px 12px", color:"#F97316", fontSize:13, fontWeight:700 }}>{stats.total} reportes</div>
        </div>
      </header>

      {/* Banner modo reporte */}
      {modoReporte && (
        <div style={{ background:"#F97316", color:"white", textAlign:"center", padding:"12px", fontSize:14, fontWeight:700, flexShrink:0, zIndex:200 }}>
          👆 Toca el mapa para marcar la ubicación del daño
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex", background:"#1C1917", borderBottom:"1px solid #292524", flexShrink:0 }}>
        {[{ id:"mapa", label:"🗺️ Mapa" }, { id:"lista", label:"📋 Lista" }, { id:"stats", label:"📊 Cifras" }].map(tab => (
          <button key={tab.id} onClick={() => setVistaActiva(tab.id)} style={{ flex:1, padding:"12px 8px", border:"none", background:"transparent", color:vistaActiva===tab.id ? "#F97316" : "#78716C", fontWeight:vistaActiva===tab.id ? 700 : 500, fontSize:13, cursor:"pointer", borderBottom:vistaActiva===tab.id ? "2px solid #F97316" : "2px solid transparent" }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>

        {/* MAPA */}
        {vistaActiva === "mapa" && (
          <div style={{ width:"100%", height:"100%", position:"relative" }}>
            <MapaReportes
              reportes={reportesFiltrados}
              onMapClick={handleMapClick}
              reporteSeleccionado={reporteSeleccionado}
              setReporteSeleccionado={setReporteSeleccionado}
              ubicacionUsuario={ubicacionUsuario}
              modoReporte={modoReporte}
            />
            {/* Leyenda */}
            <div style={{ position:"absolute", top:12, right:12, zIndex:500, background:"rgba(28,25,23,0.93)", borderRadius:12, padding:"10px 14px" }}>
              <div style={{ color:"#78716C", fontSize:10, marginBottom:6, fontWeight:600 }}>LEYENDA</div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><span style={{ fontSize:10 }}>🔴</span><span style={{ color:"#A8A29E", fontSize:11 }}>Reportado</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><span style={{ fontSize:10 }}>🟢</span><span style={{ color:"#A8A29E", fontSize:11 }}>Resuelto</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}><span style={{ fontSize:10 }}>🔵</span><span style={{ color:"#A8A29E", fontSize:11 }}>Tu ubicación</span></div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}><span style={{ fontSize:10 }}>📌</span><span style={{ color:"#A8A29E", fontSize:11 }}>+ votos = + grande</span></div>
            </div>
            {reporteSeleccionado && (
              <PanelDetalle reporte={reporteSeleccionado} onClose={() => setReporteSeleccionado(null)} onVotar={handleVotar} onAbrirResuelto={() => setModalResuelto(true)} />
            )}
          </div>
        )}

        {/* LISTA */}
        {vistaActiva === "lista" && (
          <div style={{ height:"100%", overflowY:"auto", padding:"16px" }}>
            <div style={{ display:"flex", gap:8, marginBottom:16, overflowX:"auto", paddingBottom:4 }}>
              {["todos","bache","luz","basura"].map(t => (
                <button key={t} onClick={() => setFiltroTipo(t)} style={{ whiteSpace:"nowrap", padding:"6px 14px", borderRadius:99, border:"none", cursor:"pointer", fontSize:13, fontWeight:600, background:filtroTipo===t ? "#F97316" : "#292524", color:filtroTipo===t ? "white" : "#78716C" }}>
                  {t==="todos" ? "Todos" : TIPO_CONFIG[t].label}
                </button>
              ))}
            </div>
            <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
              {cargando && <div style={{ textAlign:"center", color:"#78716C", paddingTop:40 }}>Cargando reportes...</div>}
              {!cargando && reportesFiltrados.length===0 && <div style={{ textAlign:"center", color:"#44403C", paddingTop:40 }}>No hay reportes aún. ¡Sé el primero!</div>}
              {reportesFiltrados.map(r => {
                const cfg = TIPO_CONFIG[r.tipo] || TIPO_CONFIG.bache;
                const estadoCfg = ESTADO_CONFIG[r.estado] || ESTADO_CONFIG.reportado;
                return (
                  <div key={r.id} onClick={() => { setReporteSeleccionado(r); setVistaActiva("mapa"); }} style={{ background:"#1C1917", borderRadius:14, padding:"14px", cursor:"pointer", border:"1px solid #292524" }}>
                    <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
                      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                        <span style={{ fontSize:20 }}>{cfg.emoji}</span>
                        <span style={{ color:"#FAFAF9", fontWeight:700, fontSize:15 }}>{cfg.label}</span>
                      </div>
                      <span style={{ fontSize:11, fontWeight:600, color:estadoCfg.color, background:`${estadoCfg.color}18`, padding:"3px 8px", borderRadius:99 }}>{estadoCfg.label}</span>
                    </div>
                    <div style={{ color:"#78716C", fontSize:13, marginBottom:6 }}>📍 {r.barrio||"Cali"} · {r.created_at ? new Date(r.created_at).toLocaleDateString("es-CO") : ""}</div>
                    {r.descripcion && <div style={{ color:"#A8A29E", fontSize:13, marginBottom:8 }}>{r.descripcion}</div>}
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, background:"#292524", borderRadius:99, height:4 }}>
                        <div style={{ width:`${Math.min(((r.votos||1)/50)*100,100)}%`, height:"100%", borderRadius:99, background:"#F97316" }} />
                      </div>
                      <span style={{ color:"#F97316", fontSize:13, fontWeight:700 }}>🔥 {r.votos||1}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STATS */}
        {vistaActiva === "stats" && (
          <div style={{ height:"100%", overflowY:"auto", padding:"20px" }}>
            <h2 style={{ color:"#FAFAF9", fontSize:22, fontWeight:900, marginBottom:4 }}>Estado de Cali</h2>
            <p style={{ color:"#78716C", fontSize:14, marginBottom:24 }}>Veeduría ciudadana en tiempo real</p>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:24 }}>
              {[
                { num:stats.total,      label:"Total reportes",   color:"#F97316", emoji:"📢" },
                { num:stats.votos,      label:"Votos ciudadanos", color:"#EF4444", emoji:"🔥" },
                { num:stats.reportados, label:"Sin resolver",     color:"#F59E0B", emoji:"🔴" },
                { num:stats.resueltos,  label:"Resueltos",        color:"#22C55E", emoji:"🟢" },
              ].map(s => (
                <div key={s.label} style={{ background:"#1C1917", borderRadius:16, padding:"20px", border:`1px solid ${s.color}33` }}>
                  <div style={{ fontSize:22, marginBottom:6 }}>{s.emoji}</div>
                  <div style={{ color:s.color, fontSize:36, fontWeight:900, lineHeight:1 }}>{s.num}</div>
                  <div style={{ color:"#78716C", fontSize:12, marginTop:4 }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ background:"#1C1917", borderRadius:16, padding:"20px", marginBottom:16 }}>
              <h3 style={{ color:"#FAFAF9", fontWeight:700, marginBottom:14, fontSize:15 }}>🔥 Puntos más críticos</h3>
              {reportes.filter(r => r.estado==="reportado").sort((a,b) => (b.votos||0)-(a.votos||0)).slice(0,3).map((r,i) => (
                <div key={r.id} style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                  <div style={{ color:"#F97316", fontWeight:900, fontSize:18, width:24 }}>#{i+1}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ color:"#FAFAF9", fontSize:13, fontWeight:600 }}>{TIPO_CONFIG[r.tipo]?.emoji} {r.barrio||"Cali"}</div>
                    <div style={{ background:"#292524", borderRadius:99, height:4, marginTop:4 }}>
                      <div style={{ width:`${Math.min(((r.votos||1)/50)*100,100)}%`, height:"100%", borderRadius:99, background:"#F97316" }} />
                    </div>
                  </div>
                  <div style={{ color:"#F97316", fontWeight:700, fontSize:14 }}>{r.votos||1} 🔥</div>
                </div>
              ))}
              {reportes.filter(r => r.estado==="reportado").length===0 && <div style={{ color:"#44403C", fontSize:13 }}>No hay reportes activos aún</div>}
            </div>
            <div style={{ background:"linear-gradient(135deg, #F9731618, #EA580C18)", border:"1px solid #F9731633", borderRadius:16, padding:"20px", textAlign:"center" }}>
              <div style={{ fontSize:32, marginBottom:8 }}>🏙️</div>
              <div style={{ color:"#FAFAF9", fontWeight:800, fontSize:16, marginBottom:6 }}>¿Ves un daño en tu barrio?</div>
              <div style={{ color:"#78716C", fontSize:13, marginBottom:16 }}>Entre más vecinos voten, más presión generamos</div>
              <button onClick={() => { handleNuevoReporte(); setVistaActiva("mapa"); }} style={{ background:"#F97316", color:"white", border:"none", borderRadius:12, padding:"12px 28px", fontWeight:700, fontSize:15, cursor:"pointer" }}>Reportar ahora</button>
            </div>
          </div>
        )}
      </div>

      {/* Botón flotante */}
      {!modoReporte && (
        <button onClick={handleNuevoReporte} style={{ position:"absolute", bottom:28, right:20, zIndex:600, width:64, height:64, borderRadius:"50%", background:"linear-gradient(135deg, #F97316, #EA580C)", border:"none", cursor:"pointer", boxShadow:"0 4px 20px rgba(249,115,22,0.5)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:26 }}>＋</button>
      )}

      {/* Modales */}
      {modalReporte && nuevaUbicacion && (
        <ModalReporte
          ubicacion={nuevaUbicacion}
          onClose={() => { setModalReporte(false); setNuevaUbicacion(null); }}
          onSubmit={handleSubmitReporte}
          onCambiarUbicacion={() => { setModalReporte(false); setNuevaUbicacion(null); setModoReporte(true); setVistaActiva("mapa"); }}
        />
      )}
      {modalResuelto && reporteSeleccionado && (
        <ModalResuelto reporte={reporteSeleccionado} onClose={() => setModalResuelto(false)} onResuelto={handleResuelto} />
      )}
    </div>
  );
}
