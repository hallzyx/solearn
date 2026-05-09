# Userflow: Jugar Quiz

> Ambos jugadores responden las N preguntas del duelo. El temporizador corre. Sistema captura respuestas.

---

## Secuencia paso a paso

### Paso 1: Entrada a la arena

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Llega a la pantalla de quiz (desde "Comenzar quiz" o automáticamente) | La UI muestra el encabezado del duelo |

```
┌──────────────────────────────────────────────────────┐
│  ⚔️ DUELO EN CURSO                                   │
│  @alice.sol vs @bob.sol                              │
│  Tema: Teoría básica de blockchain                   │
│                                                      │
│  ⏱️ Tiempo restante: 04:32                           │
│  ❓ Pregunta 1 de 5 (3 min · 10 preg)               │
└──────────────────────────────────────────────────────┘
```

---

### Paso 2: Presentación de pregunta

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El frontend obtiene la pregunta del backend: `GET /api/duels/:id/questions?player=alice` |
| — | — | **Importante:** El backend solo retorna el texto de la pregunta y las 4 opciones. **NUNCA retorna `correct_index`** al frontend durante la fase de juego. |
| Usuario | Ve la pregunta actual | La UI renderiza: |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│  📝 Pregunta 1:                                      │
│  ¿Qué es un bloque en una blockchain?                │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ A. Un archivo cifrado que contiene        │    │
│  │       todas las wallets de la red            │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ B. Una estructura de datos que agrupa     │    │
│  │       transacciones validadas y las enlaza   │    │
│  │       criptográficamente al bloque anterior  │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ C. Un smart contract que ejecuta          │    │
│  │       transacciones automáticamente          │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │  ○ D. Un servidor central que valida las     │    │
│  │       transacciones de la red                │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│              [Seleccionar una opción]                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Comportamiento de selección:**
- Las opciones son botones o radios grandes, fáciles de tocar en mobile.
- Al hacer clic en una opción, se marca visualmente (highlight, borde de color).
- No hay botón "Confirmar" por pregunta — la selección es instantánea.
- Una vez seleccionada, se pasa automáticamente a la siguiente pregunta (transición suave de ~300ms).

**Si el usuario quiere cambiar su respuesta:**
| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Hace clic en "← Anterior" | Vuelve a la pregunta anterior. La respuesta previa aparece seleccionada. |
| Usuario | Selecciona una opción diferente | Se actualiza la respuesta en el backend. |

---

### Paso 3: Guardado de respuestas

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Selecciona una opción | El frontend envía inmediatamente al backend: `POST /api/duels/:id/answers` con `{ player, question_id, selected_index }` |
| — | — | El backend guarda la respuesta en la DB off-chain. |
| — | — | El frontend también guarda en estado local para funcionar offline y sincronizar al reconectar. |

**Estrategia de guardado:**
- Cada respuesta se guarda individualmente (no se espera a tener las 5).
- Si el usuario pierde conexión, las respuestas se guardan en localStorage y se envían al reconectar.
- Si el usuario cierra el navegador y vuelve, se recuperan las respuestas ya enviadas desde el backend y se muestra la pregunta actual.

---

### Paso 4: Progreso y temporizador

La UI muestra constantemente:

```
┌──────────────────────────────────────────────────────┐
│  ⏱️ 04:32  │  ❓ 3/5 respondidas                     │
│                                                      │
│  Progreso:  ██████████░░░░░░░░░░  3/5               │
│  Timeout: 5 min · Preguntas: 5                      │
└──────────────────────────────────────────────────────┘
```

| Elemento | Comportamiento |
|----------|---------------|
| **Temporizador** | Cuenta regresiva desde el `time_limit` del duelo (3, 5 o 10 min). A los 60s restantes cambia a color naranja. A los 30s, rojo y con parpadeo. |
| **Barra de progreso** | Se llena a medida que el jugador responde. Independiente por jugador. |
| **Indicador de preguntas** | Muestra checkmarks en las ya respondidas, círculo vacío en las pendientes. |

---

### Paso 5: Finalización del quiz

Hay dos triggers para finalizar:

**Trigger A — Todas las preguntas respondidas:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Responde la última pregunta (la N según `question_count`) | — |
| — | — | El frontend detecta que respondió todas y muestra pantalla de confirmación |
| — | — | El backend marca al jugador como `finished` |

**Trigger B — Temporizador expira:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El temporizador llega a 00:00 |
| — | — | El frontend bloquea la UI (no se pueden cambiar respuestas) |
| — | — | Se envían al backend las respuestas que haya (las no respondidas quedan como `null` y cuentan como incorrectas) |
| — | — | El backend marca al jugador como `finished` |

---

### Paso 6: Pantalla de espera

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Terminó su quiz pero el rival todavía está jugando | Se muestra pantalla de espera: |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│           ✅ ¡Respondiste todas las preguntas!        │
│                                                      │
│              ⏳ Esperando a tu rival...               │
│                                                      │
│        @bob.sol todavía está respondiendo.            │
│                                                      │
│     [████████████████░░░░░░░░░░░░░░] 3/5             │
│                                                      │
│     (Tiempo restante total: 03:21)                   │
│                                                      │
│     No cierres esta ventana. Los resultados           │
│     aparecerán apenas ambos terminen.                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Importante:** La pantalla de espera hace polling cada 5 segundos al backend para saber si el rival terminó. En cuanto ambos están `finished`, se dispara la fase de resolución.

---

### Paso 7: Corrección off-chain

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El backend detecta que ambos jugadores tienen estado `finished` (o el temporizador global expiró) |
| — | — | El backend compara las respuestas de cada jugador contra el `correct_index` de cada pregunta (almacenado en el quiz, nunca expuesto al frontend durante el juego) |
| — | — | Calcula `scoreA` y `scoreB` (0 a `question_count`) |
| — | — | Almacena los scores en la DB y cambia estado del duelo a `READY_TO_RESOLVE` |
| — | — | Notifica a ambos frontends (vía polling o WebSocket) que los resultados están listos |

---

### Estados de UI durante el quiz

| Momento | UI State |
|---------|----------|
| Cargando preguntas | Skeleton loader con items dinámicos (3, 5 o 10) |
| Quiz en curso | Pregunta actual visible, opciones clickeables, timer corriendo |
| Seleccionando opción | Opción marcada con highlight + transición a siguiente pregunta |
| Últimos 60 segundos | Timer en naranja, texto: "Queda 1 minuto" |
| Últimos 30 segundos | Timer en rojo, parpadeo, texto: "Apurate" |
| Quiz terminado (esperando rival) | Pantalla de espera con progreso del rival |
| Quiz terminado (ambos listos) | Transición a pantalla de carga: "Calculando resultados..." |
| Error de conexión | Banner amarillo: "Sin conexión. Tus respuestas se guardan localmente." |

---

### Edge cases

| Caso | Comportamiento |
|------|---------------|
| Usuario recarga la página a mitad del quiz | Se recupera el estado desde el backend (preguntas ya respondidas, pregunta actual). El timer sigue corriendo del lado del servidor. |
| Usuario cierra el navegador y no vuelve | Sus respuestas parciales quedan guardadas. Si no vuelve antes del timeout, aplica abandono (ver `userflow_timeout_duel.md`). |
| Usuario intenta abrir el quiz en dos pestañas | La segunda pestaña detecta que ya hay una sesión activa y muestra: "Ya tenés el quiz abierto en otra pestaña." |
| Ambos jugadores terminan al mismo tiempo | El backend procesa la corrección una sola vez (con lock o idempotencia). |
| El backend falla al guardar una respuesta | El frontend reintenta con exponential backoff. Si después de 3 intentos falla, muestra error y guarda en localStorage. |
| Un jugador responde todo en 30 segundos, el otro tarda 4:50 | El primero ve la pantalla de espera. El segundo ve el timer normal. La corrección se dispara cuando el segundo termina o el timer expira. |
