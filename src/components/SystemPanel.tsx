import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  Activity,
  Check,
  Copy,
  Database,
  FileArchive,
  RefreshCw,
  ScrollText,
  Trash2,
  Sparkles,
} from 'lucide-react';

interface DatabaseInfo {
  integridad: string;
  pistas: number;
  entradas_fts: number;
  version_esquema: number;
  tamano_bytes: number;
  ultimo_backup: string | null;
  migraciones: string;
}

interface DoctorResultado {
  mensaje: string;
  info: DatabaseInfo;
}

/** Panel de salud de SQLite y visor de registros, dentro de Ajustes → Sistema. */
export default function SystemPanel() {
  const [doctor, setDoctor] = useState<DoctorResultado | null>(null);
  const [logs, setLogs] = useState('');
  const [estado, setEstado] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [papelera, setPapelera] = useState(0);

  const cargar = useCallback(async () => {
    try {
      const [resultado, registro] = await Promise.all([
        invoke<DoctorResultado>('doctor_database'),
        invoke<string>('get_system_logs', { limit: 200 }),
      ]);
      setDoctor(resultado ?? null);
      setLogs(registro ?? '');
      invoke<number>('trash_count')
        .then((cantidad) => setPapelera(cantidad ?? 0))
        .catch(() => setPapelera(0));
    } catch (error) {
      setEstado(`No se pudo consultar el sistema: ${String(error)}`);
    }
  }, []);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const ejecutar = async (accion: () => Promise<string>, etiqueta: string) => {
    setOcupado(true);
    setEstado('');
    try {
      const mensaje = await accion();
      setEstado(mensaje || etiqueta);
      await cargar();
    } catch (error) {
      setEstado(`${etiqueta}: ${String(error)}`);
    } finally {
      setOcupado(false);
    }
  };

  const vaciarPapelera = async () => {
    setOcupado(true);
    try {
      const cantidad = await invoke<number>('empty_trash');
      setEstado(`${cantidad ?? 0} archivos eliminados definitivamente.`);
      await cargar();
    } catch (error) {
      setEstado(String(error));
    } finally {
      setOcupado(false);
    }
  };

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(logs);
      setCopiado(true);
      window.setTimeout(() => setCopiado(false), 1400);
    } catch {
      setEstado('El portapapeles no está disponible en esta ventana.');
    }
  };

  const info = doctor?.info;

  return (
    <div className="sys-panel">
      <div className="sys-stats">
        <div className="sys-stat">
          <Activity className="w-3.5 h-3.5" />
          <small>Integridad</small>
          <strong>{info?.integridad ?? '—'}</strong>
        </div>
        <div className="sys-stat">
          <Database className="w-3.5 h-3.5" />
          <small>Pistas indexadas</small>
          <strong>{info?.pistas ?? '—'}</strong>
        </div>
        <div className="sys-stat">
          <Sparkles className="w-3.5 h-3.5" />
          <small>Índice de búsqueda</small>
          <strong>{info?.entradas_fts ?? '—'} entrada(s)</strong>
        </div>
        <div className="sys-stat">
          <FileArchive className="w-3.5 h-3.5" />
          <small>Esquema</small>
          <strong>v{info?.version_esquema ?? '—'}</strong>
        </div>
      </div>

      <p className="sys-detalle">
        {info
          ? `${(info.tamano_bytes / 1024 / 1024).toFixed(2)} MB · ${info.migraciones} · último respaldo: ${info.ultimo_backup?.split(/[/\\]/).pop() ?? 'ninguno'}`
          : 'Consultando la base de datos…'}
      </p>

      <div className="sys-actions">
        <button type="button" className="sys-btn" disabled={ocupado} onClick={() => void cargar()}>
          <RefreshCw className="w-3.5 h-3.5" /> Verificar
        </button>
        <button
          type="button"
          className="sys-btn"
          disabled={ocupado}
          onClick={() => void ejecutar(() => invoke<string>('vacuum_database'), 'Base compactada')}
        >
          <Database className="w-3.5 h-3.5" /> Compactar
        </button>
        <button
          type="button"
          className="sys-btn"
          disabled={ocupado}
          onClick={() => void ejecutar(() => invoke<string>('backup_database'), 'Respaldo creado')}
        >
          <FileArchive className="w-3.5 h-3.5" /> Crear respaldo
        </button>
        <button
          type="button"
          className="sys-btn"
          disabled={ocupado}
          onClick={() => void vaciarPapelera()}
        >
          <Trash2 className="w-3.5 h-3.5" /> Vaciar papelera{papelera > 0 ? ` (${papelera})` : ''}
        </button>
      </div>

      {estado && <p className="sys-estado">{estado}</p>}

      <div className="sys-log-head">
        <span>
          <ScrollText className="w-3.5 h-3.5" /> Registro de la app
        </span>
        <button type="button" className="sys-copiar" onClick={() => void copiar()}>
          {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
      <pre className="sys-log" aria-label="Registro de la aplicación">
        {logs || 'Sin registros.'}
      </pre>
    </div>
  );
}
