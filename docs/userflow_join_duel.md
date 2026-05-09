# Userflow: Unirse a Duelo

> El retado (Usuario B) encuentra y acepta un duelo existente.

---

## Secuencia paso a paso

### Paso 1: Descubrimiento del duelo

Hay dos caminos para que el Usuario B encuentre un duelo:

**Camino A — Feed de duelos abiertos:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario B | Ya conectó su wallet. Desde el Home, hace clic en "Buscar duelos" | Se muestra el feed: |

```
┌──────────────────────────────────────────────────────────┐
│  🔍 Duelos abiertos — 3 disponibles                      │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Tecnologías Emergentes                          │  │
│  │ 📖 Teoría básica de blockchain                     │  │
│  │ 💰 1 USDC  │  ❓ 5 preguntas  │  👤 @alice.sol     │  │
│  │ Creado hace 2 min                                   │  │
│  │                                        [Aceptar →]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Cloud Computing                                 │  │
│  │ 📖 AWS vs Azure vs GCP                             │  │
│  │ 💰 2 USDC  │  ❓ 5 preguntas  │  👤 @bob.sol       │  │
│  │ Creado hace 15 min                                  │  │
│  │                                        [Aceptar →]  │  │
│  └────────────────────────────────────────────────────┘  │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │ ⚔️ Inteligencia Artificial                         │  │
│  │ 📖 Redes neuronales convolucionales                │  │
│  │ 💰 5 USDC  │  ❓ 5 preguntas  │  👤 @carol.sol     │  │
│  │ Creado hace 1 hora                                  │  │
│  │                                        [Aceptar →]  │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

**Camino B — Link directo:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario B | Recibe un enlace `solearn.app/duel/abc123` por WhatsApp/Discord/Telegram | — |
| Usuario B | Abre el enlace en el navegador | La dApp carga la pantalla de detalle del duelo directamente |
| Usuario B | Conecta su wallet si no lo había hecho | Misma lógica de conexión |

---

### Paso 2: Pantalla de detalle del duelo

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario B | Ve el detalle completo del duelo | La UI muestra: |

```
┌──────────────────────────────────────────────────────┐
│               ⚔️ DETALLE DEL DUELO                   │
│                                                      │
│  Retador: @alice.sol                                 │
│  Curso: Tecnologías Emergentes                       │
│  Tema: Teoría básica de blockchain                   │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │  💰 Garantía: 1 USDC                       │      │
│  │  ❓ Preguntas: 5 (multiple choice)          │      │
│  │  ⏱️  Tiempo límite: 5 minutos              │      │
│  │  📅 Creado: hace 2 minutos                  │      │
│  └────────────────────────────────────────────┘      │
│                                                      │
│  📋 Reglas:                                          │
│  • Ambos responden las mismas 5 preguntas.           │
│  • Gana quien acierte más.                           │
│  • Si empatan, cada uno recupera su garantía.        │
│  • Si no respondés a tiempo, perdés tu stake.        │
│                                                      │
│  Tu balance: 10.5 USDC                               │
│                                                      │
│  ┌────────────────────────────────────────────┐      │
│  │       [⚔️ Aceptar reto — 1 USDC]           │      │
│  └────────────────────────────────────────────┘      │
└──────────────────────────────────────────────────────┘
```

**Validaciones antes de mostrar el botón "Aceptar":**

| Condición | Acción |
|-----------|--------|
| Balance de B < stake | Botón deshabilitado: "Saldo insuficiente. Necesitás 1 USDC." |
| B es el mismo que A | Botón oculto: "No podés aceptar tu propio duelo." |
| Duelo ya expirado | Pantalla muestra: "Este duelo expiró." |
| Duelo ya aceptado por otro | Pantalla muestra: "Este duelo ya tiene rival." |
| Wallet no conectada | Botón muestra "Conectar wallet para aceptar" |

---

### Paso 3: Aceptar el duelo

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario B | Revisa las condiciones y hace clic en "Aceptar reto" | Se dispara la secuencia |

**Sub-paso 3a — Confirmación en UI:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | Se muestra un modal de confirmación: "Se bloqueará 1 USDC de tu wallet. Solo recuperarás los fondos si ganás el duelo o si empatan." |
| Usuario B | Hace clic en "Sí, aceptar" | — |

**Sub-paso 3b — Transacción on-chain:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El frontend construye la instrucción: `accept_duel(duel_id)` |
| Usuario B | Firma la transacción en su wallet | — |
| — | — | El programa de Solana: verifica que el duelo esté en estado `CREATED`, registra a B como `opponent`, transfiere el stake de B a la cuenta escrow, cambia estado a `ACCEPTED`, guarda `accepted_at`. |

**Cuentas involucradas en `accept_duel`:**

| Cuenta | Rol |
|--------|-----|
| `opponent` (signer) | El usuario B, paga la tx y el stake |
| `duel_account` (PDA) | Cuenta del duelo, se actualiza con opponent y estado |
| `escrow_token_account` (PDA) | Recibe el stake de B (ahora tiene 2x el stake) |
| `opponent_token_account` (ATA) | Cuenta de USDC/SOL de B |
| `token_program` | Token Program |

---

### Paso 4: Transición a fase de quiz

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | Al confirmarse la tx, el backend marca el duelo como `ACCEPTED` en la DB off-chain. |
| Usuario B | Ve una pantalla de transición | — |

```
┌────────────────────────────────────────────┐
│          ⚔️ ¡Duelo aceptado!               │
│                                            │
│  @alice.sol vs @bob.sol                    │
│  Tema: Teoría básica de blockchain         │
│                                            │
│  Preparate... el quiz comienza en breve.   │
│                                            │
│     [▶️ Comenzar quiz]                     │
└────────────────────────────────────────────┘
```

| Usuario B | Hace clic en "Comenzar quiz" | Navega a la pantalla del quiz |
| — | — | El backend cambia el estado a `IN_PROGRESS` cuando ambos jugadores están listos (o inmediatamente si se quiere simplificar). |

**Nota V1:** Para simplificar, el duelo pasa a `IN_PROGRESS` apenas B acepta. Ambos jugadores pueden empezar a responder inmediatamente al entrar a la pantalla de quiz. Ver `userflow_play_quiz.md` para la fase siguiente.

---

### Edge cases

| Caso | Comportamiento |
|------|---------------|
| B abre el link pero no tiene wallet | Se muestra CTA para instalar Phantom/Backpack primero |
| B tiene la wallet pero está en otra red | Se detecta la red y se pide cambiar a Solana devnet/mainnet |
| Dos usuarios intentan aceptar el mismo duelo al mismo tiempo | El contrato solo acepta al primero que confirma la tx. El segundo recibe error: "Duelo ya aceptado". |
| B hace clic en aceptar pero rechaza la firma | Vuelve a la pantalla de detalle sin cambios. |
| El duelo fue cancelado por A mientras B veía el detalle | Al intentar aceptar, el contrato rechaza porque estado != CREATED. Se refresca la UI. |
| B cierra el navegador después de aceptar pero antes de jugar | El duelo queda en `ACCEPTED`. Si no juega en el tiempo límite, aplica timeout (ver `userflow_timeout_duel.md`). |
