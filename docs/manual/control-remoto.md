# Control remoto desde el celular

Sakura Music puede manejarse desde el navegador del teléfono. La PC sigue siendo
quien tiene los archivos y ejecuta el audio: el celular **envía comandos por la
red local**, no reproduce la música. Por eso no hay streaming y la música sigue
sonando en la computadora.

Si quiere saber por qué se eligió HTTP con PIN y no WebSocket, vea
[racional-de-decisiones.md](../racional-de-decisiones.md#6-control-remoto-puente-http-con-pin-no-websocket).

## Requisitos

- La PC y el celular están en la **misma red Wi-Fi**.
- El servidor local está activo en **Ajustes → Sistema → Control remoto**.
- En desarrollo, ejecutar `npm run build` antes de activarlo: el servidor sirve
  el contenido compilado en `dist/`.

## Activar el servidor

1. Abra **Ajustes → Sistema → Control remoto** y active el servidor local.
2. Aparece un **código QR** y un **PIN de 6 dígitos**.
3. Escanee el QR con la cámara del teléfono o ingrese la URL a mano. Si va por
   URL, el PIN se pide en un formulario.
4. El navegador del celular abre la misma interfaz de Sakura Music, con los
   temas incluidos.

El PIN se renueva cada vez que se activa el servidor y se descarta al
desactivarlo. Si la app no detecta la IP de la red y muestra `127.0.0.1`, escriba
la IP real de la PC en el campo: el QR se generará con ese valor.

## Qué puede hacer desde el celular

- Ver la biblioteca y buscar pistas.
- Reproducir, pausar y cambiar de pista; el panel «Sonando en la PC» muestra el
  estado real del reproductor.
- Mandar descargas y seguir su progreso.
- Editar metadatos y portadas.
- Administrar playlists y la papelera (con Deshacer).
- Consultar el doctor del sistema.

Todo se ejecuta en la computadora. El celular es un control, no una segunda
copia de la biblioteca.

## Firewall

Si el celular no puede acceder al sitio, habilite el puerto **17342** en el
firewall de Windows desde una terminal de Administrador:

```powershell
netsh advfirewall firewall add rule name="Sakura Control Remoto" dir=in action=allow protocol=TCP localport=17342
```

## Seguridad y límites

- El acceso queda restringido a la red local y protegido por un PIN de sesión.
- El PIN se renueva al activar el servidor y se descarta al desactivarlo.
- Todas las operaciones pasan por la misma validación IPC que la app de
  escritorio: longitud, caracteres de control, rutas dentro de la raíz activa y
  portadas desde `covers/` (ver [ADR 0017](../adr/0017-validacion-ipc-y-scope.md)).
- En el celular no hay selector de archivos nativo: esa acción se desgrada a
  «no disponible». Tampoco hay eventos push; el estado se re-sincroniza al
  pollear.

## Si algo falla

| Síntoma | Causa probable | Qué hacer |
|---|---|---|
| El celular no abre la página | Firewall o IP equivocada | Habilite el puerto 17342 y escriba la IP real de la PC |
| Aparece `127.0.0.1` en el QR | La app no detectó la IP de la red | Ingrese la IP de la PC en el campo y vuelva a escanear |
| El PIN no funciona | Sesión vieja o servidor reiniciado | Active el servidor de nuevo y use el PIN actual |
| La interfaz no se actualiza en desarrollo | Falta el build | Ejecute `npm run build` y reactive el control remoto |
| No se escucha nada en el celular | Es intencional: no hay streaming | La música suena en la PC; el celular sólo envía comandos |

Más casos en [problemas.md](problemas.md).

## Dónde está en el código

- `src/lib/puente.ts`: decide entre el bridge de Tauri (PC) y `fetch` a `/api/...` (celular).
- `src-tauri/src/remote.rs`: servidor HTTP local, PIN y sesiones.
- `src/lib/useRemoteControl.ts`: estado del control remoto en la interfaz.
- `src-tauri/src/validacion.rs`: validación de la frontera IPC.
