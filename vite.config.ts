import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// @ts-expect-error el proyecto no incluye @types/node; Vite resuelve el módulo igual.
import process from "node:process";
const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(() => ({
  plugins: [react()],

  // Opciones de Vite para Tauri: solo se aplican en `tauri dev` y `tauri build`.
  //
  // 1. No limpiar la pantalla para no ocultar los errores de Rust.
  clearScreen: false,
  // 2. Tauri espera un puerto fijo: mejor fallar que usar otro distinto.
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host
      ? {
          protocol: "ws",
          host,
          port: 1421,
        }
      : undefined,
    watch: {
      // 3. Ignorar `src-tauri`: ese árbol lo vigila Cargo, no Vite.
      ignored: ["**/src-tauri/**"],
    },
  },
}));
