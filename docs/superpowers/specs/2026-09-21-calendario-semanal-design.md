# Calendario semanal "Bento flotante" — Diseño

Fecha: 2026-09-21
Estado: Aprobado por el usuario, pendiente de plan de implementación.

## Objetivo

Un planificador semanal (lunes a domingo, dividido por días) para agregar, editar, mover y
borrar tareas/notas/pendientes/actividades manualmente. Sin login. Compartido entre varias
personas con el mismo link, en tiempo real. Publicado como sitio estático en GitHub Pages.

Explícitamente NO se quiere el estilo típico de lista con renglones/líneas separadoras.

## Estilo visual: "Bento flotante" (combinación de dos direcciones exploradas)

- Bloques redondeados con degradados de color por categoría, modo oscuro, estética moderna
  tipo widgets (inspirado en un estilo "Bento" explorado).
- Las notas NO están en una cuadrícula ni en fila: flotan libremente dentro de la columna de
  su día, en la posición donde el usuario las arrastre (inspirado en un estilo
  "Constelación/burbujas" explorado).
- El tamaño de la nota refleja prioridad/duración (chico/mediano/grande).
- **Fijar una nota (pin)**: aro dorado alrededor + ícono ⭐, se mantiene "por encima" visualmente.
- **Pendiente vs completada**:
  - Pendiente: la nota brilla detrás con el color de su categoría (glow).
  - Completada: NO se tacha el texto. Se oscurece el fondo de la nota (brightness/saturación
    reducida) y aparece una palomita ✔ verde grande centrada encima, con su propio resplandor.
  - Si una nota está fijada Y pendiente a la vez: se combinan ambos brillos (el de categoría
    detrás + el aro dorado de fijado). Ninguno reemplaza al otro.

## Arquitectura

- Sitio estático: `index.html` + `app.js` + `styles.css` (sin build, sin framework, JS plano
  o con una librería ligera si hace falta para drag-and-drop).
- Persistencia y tiempo real: Firebase Firestore (SDK de cliente vía CDN). Sin autenticación:
  reglas de Firestore abiertas a lectura/escritura para cualquiera con el link, ya que no se
  quiere sistema de cuentas.
  - **Riesgo aceptado y anotado**: cualquiera con el link (o que descubra la config del
    proyecto) puede leer y escribir/borrar datos. Se mitiga con un "deshacer" de 5 segundos
    en borrados, y queda documentado como decisión consciente del usuario, no un descuido.
  - El proyecto de Firebase lo crea el usuario (guiado paso a paso durante la
    implementación); Claude Code no crea cuentas de Google en su nombre.
- Repositorio propio en GitHub, independiente del repo de n8n, publicado vía GitHub Pages.
- Carpeta de trabajo local: `calendario-semanal/` en el Desktop del usuario.

## Modelo de datos (Firestore)

Colección `notas`. Cada documento:

| Campo         | Tipo                                   | Notas                                   |
|---------------|------------------------------------------|------------------------------------------|
| `dia`         | string (fecha ISO `YYYY-MM-DD`)          | a qué día de la semana pertenece          |
| `tipo`        | enum: Tarea / Nota / Pendiente / Actividad | define el color base                    |
| `titulo`      | string                                    | texto corto visible en la tarjeta         |
| `descripcion` | string (opcional)                        | detalle largo, se ve al abrir la nota     |
| `color`       | string                                    | color efectivo (con default por tipo, editable) |
| `posicionX/Y` | number                                    | posición libre dentro de la columna del día |
| `tamano`      | enum: chico / mediano / grande            | afecta tamaño visual de la tarjeta        |
| `fijada`      | boolean                                   | pin dorado                                |
| `completada`  | boolean                                   | estado de check verde                     |
| `creadoEn`    | timestamp                                 | orden de creación / auditoría simple      |

## Componentes de interfaz

- **Barra superior**: flechas ◀ ▶ para semana anterior/siguiente, botón "Hoy", rango de
  fechas de la semana visible (lunes–domingo).
- **7 columnas de día** en escritorio (una fila horizontal). En móvil: **un día a la vez**,
  con swipe (deslizar) para cambiar de día.
- **Nota flotante**: arrastrable dentro de su día y entre días (cambia el campo `dia` al
  soltarla en otra columna). Clic abre un modal con la descripción larga y el checkbox de
  completada. Botón ⭐ para fijar/desfijar. Botón 🗑 para borrar.
- **Botón "+" por día**: crea una nota nueva; se elige el tipo (Tarea/Nota/Pendiente/
  Actividad) y toma su color por default (editable después).

## Manejo de errores y estados vacíos

- Sin conexión a Firestore: aviso discreto ("Sin conexión, mostrando última versión
  guardada"), sigue mostrando los datos ya cargados en memoria sin bloquear la pantalla.
- Día sin notas: mensaje sutil "Sin pendientes" en vez de espacio en blanco sin contexto.
- Borrado: toast con opción "Deshacer" durante 5 segundos antes de confirmar el borrado en
  Firestore.

## Pruebas

Sin framework de testing automatizado (proyecto estático simple). Verificación manual:
- Crear, editar, mover (dentro del día y entre días), fijar/desfijar, marcar completada,
  borrar (y deshacer) una nota.
- Sincronización en tiempo real: abrir dos pestañas/dispositivos y confirmar que los cambios
  de una aparecen en la otra sin recargar.
- Responsive: swipe entre días en modo móvil (o el modo responsive de Chrome DevTools).

## Fuera de alcance (por ahora)

- Autenticación / cuentas de usuario.
- Sincronización offline avanzada (más allá del aviso simple de "sin conexión").
- Recordatorios/notificaciones push.
- Repetición de tareas recurrentes.
