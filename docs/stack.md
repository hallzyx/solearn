# Solearn — Stack Tecnológico

> Stack definitivo para el MVP. Basado en Solana Foundation skill oficial + herramientas disponibles.

---

## 1. Stack core del MVP

| Capa | Tecnología | Versión | Propósito |
|------|-----------|---------|-----------|
| **Framework** | Next.js | 16 | App Router, Server Components, API Routes |
| **Lenguaje** | TypeScript | 5.x | Tipado estricto en frontend y backend |
| **UI** | Tailwind CSS + shadcn/ui | 4.x | Componentes y estilos consistentes |
| **Estado local** | Zustand | 5.x | Estado global liviano (modales, UI, wallet state) |
| **Validación** | Zod | 4.x | Schemas y validación de formularios |
| **DB off-chain** | lowdb | — | JSON database embebida en API Routes de Next.js |
| **Animación** | Framer Motion | — | Transiciones entre preguntas del quiz |
| **IA** | Vercel AI SDK | 5.x | Generación de quizzes via API Routes |
| **Solana SDK** | `@solana/client` + `@solana/react-hooks` | — | Conexión wallet + signing (framework-kit) |
| **Solana Kit** | `@solana/kit` | — | Cliente RPC, transacciones, codecs |
| **Solana Program** | Anchor (Rust) | — | Programa Solana del duelo |
| **Solana MCP** | solanaMcp (tools) | — | Documentación en vivo y expert query |

---

## 2. Skills de agente

```
.agents/skills/solana-dev/
├── SKILL.md              → Guía principal (Solana Foundation v1.1.0)
└── references/
    ├── kit/              → Patterns @solana/kit
    ├── anchor/           → Anchor program development
    ├── surfpool/         → Testing en local
    ├── security.md       → Checklist de seguridad
    ├── payments.md       → Manejo de pagos
    ├── common-errors.md  → Errores frecuentes y solución
    └── ...
```

### Skills disponibles en el sistema

| Skill | Ubicación | Propósito |
|-------|-----------|-----------|
| **solana-dev** (proyecto) | `solearn/.agents/skills/solana-dev/` | Guía oficial Solana Foundation v1.1.0 → **usar esta** |
---

## 3. MCP tools disponibles

| Tool | Propósito |
|------|-----------|
| `solanaMcp_Solana_Expert__Ask_For_Help` | Consultas específicas a docs de Solana (RAG) |
| `solanaMcp_Solana_Documentation_Search` | Búsqueda semántica sobre el corpus de docs |
| `solanaMcp_list_sections` | Lista secciones de documentación disponibles |
| `solanaMcp_get_documentation` | Obtener documentación completa de una sección |

---

## 4. Arquitectura de alto nivel

```
┌─────────────────────────────────────────────────────────┐
│                      FRONTEND                           │
│  Next.js 16 + @solana/react-hooks + shadcn/ui          │
│  - Pantallas: Home, Create, Join, Quiz, Result          │
│  - Conexión wallet via @solana/client                   │
│  - Manejo de temporizador en el cliente                 │
│  - Estado global con Zustand 5                          │
└──────────┬──────────────────────────┬───────────────────┘
           │                          │
     llamadas API              transacciones (wallet)
     (fetch /api/...)          (@solana/client)
           │                          │
┌──────────▼──────────┐     ┌─────────▼───────────────────┐
│   API ROUTES (Next) │     │   SOLANA PROGRAM            │
│                     │     │   (Anchor / Rust)           │
│ - POST /api/duels   │     │                            │
│   → generate quiz   │     │ - create_duel()            │
│ - POST /api/answers │     │ - accept_duel()            │
│   → grade           │     │ - resolve_duel()           │
│ - lowdb persistence │     │ - claim_timeout()          │
│ - Vercel AI SDK     │     │ - Escrow de fondos         │
│ - Timeout detection │     │ - Distribución automática   │
└─────────────────────┘     └────────────────────────────┘
```

### Flujo de datos

```
1. Usuario A crea duelo
   Frontend → POST /api/duels → IA genera quiz → lowdb guarda
   Frontend → create_duel() on-chain → escrow lock

2. Usuario B acepta duelo
   Frontend → accept_duel() on-chain → escrow lock

3. Ambos juegan
   Frontend → POST /api/answers → lowdb guarda respuestas

4. Backend resuelve
   Backend → corrige respuestas → resolve_duel() on-chain → escrow distribuye
```

---

## 5. Ciclo de vida de un duelo

```
CREATED ──→ ACCEPTED ──→ IN_PROGRESS ──→ COMPLETED
   │             │              │
   │             │              └──→ TIMED_OUT (abandono)
   │             │
   │             └──→ CANCELLED (retador se arrepiente antes de ser aceptado)
   │
   └──→ EXPIRED (nadie aceptó en tiempo límite)
```

| Estado | Significado | Quién puede actuar |
|--------|-------------|-------------------|
| `CREATED` | Duelo creado, garantía de A bloqueada, esperando rival | Retador puede cancelar |
| `ACCEPTED` | Ambos bloquearon garantía, listos para jugar | Sistema inicia quiz |
| `IN_PROGRESS` | Quiz en curso, temporizador corriendo | Jugadores responden |
| `COMPLETED` | Scores enviados, fondos distribuidos | Solo lectura |
| `TIMED_OUT` | Un jugador no respondió, el otro reclamó | Solo lectura |
| `CANCELLED` | Retador canceló antes de ser aceptado | Solo lectura |
| `EXPIRED` | Nadie aceptó el duelo en el tiempo límite | Retador reclama devolución |

---

## 6. Instrucciones del programa Solana

### 6.1 Instrucciones

| Instrucción | Signer | Estado requerido | Acción |
|------------|--------|------------------|--------|
| `create_duel` | Challenger | — | Crea cuenta PDA del duelo con `question_count`, `time_limit`, bloquea stake de A, estado → `CREATED` |
| `accept_duel` | Opponent | `CREATED` | Registra oponente, bloquea stake de B, estado → `ACCEPTED` |
| `resolve_duel` | Resolver (backend) | `ACCEPTED` o `IN_PROGRESS` | Recibe scores, distribuye fondos, estado → `COMPLETED` |
| `claim_timeout` | Resolver (backend) | `ACCEPTED` o `IN_PROGRESS` | Verifica tiempo expirado, paga al activo, estado → `TIMED_OUT` |
| `cancel_duel` | Challenger | `CREATED` | Devuelve stake a A, estado → `CANCELLED` |

### 6.2 Cuentas (PDAs)

| Cuenta | Seeds | Almacena |
|--------|-------|----------|
| `duel_account` | `["duel", duel_id]` | challenger, opponent, stake, question_count, time_limit, estado, scores, timestamps |
| `escrow_token_account` | `["escrow", duel_id]` | Fondos bloqueados (token account, USDC) |

---

## 7. Modelo de datos off-chain (backend)

```
Duel (off-chain):
  id: UUID
  on_chain_address: Pubkey (PDA del duelo en Solana)
  status: enum
  challenger: Pubkey
  opponent: Pubkey | null
  course_name: string
  topic: string
  stake_amount: number (en lamports o USDC units)
  question_count: number (opciones: 3, 5, 10)
  time_limit: number (en segundos, opciones: 180, 300, 600)
  questions: Question[]
  challenger_answers: Answer[] | null
  opponent_answers: Answer[] | null
  challenger_score: number | null
  opponent_score: number | null
  created_at: timestamp
  accepted_at: timestamp | null
  started_at: timestamp | null
  completed_at: timestamp | null

Question:
  id: number (1-5)
  text: string
  options: string[] (4 opciones)
  correct_index: number (0-3)

Answer:
  question_id: number
  selected_index: number (0-3)
```

---

## 8. Decisiones técnicas y su justificación

| Decisión | Justificación |
|----------|---------------|
| **IA off-chain para generación y corrección** | Hacerlo on-chain requeriría oráculos complejos o zk-proofs. Para MVP, el backend actúa como oráculo de confianza. Es la decisión correcta para un hackathon. |
| **Stake simétrico** | Simplifica el contrato (no hay que manejar pools de stakes diferentes) y hace el duelo justo. |
| **Mismas preguntas, mismo orden (V1)** | Simplifica la corrección y evita sesgos por dificultad. En V2 se puede randomizar orden. |
| **Backend resuelve el duelo (paga la tx)** | El backend tiene una keypair propia y es quien llama a `resolve_duel()` y `claim_timeout()`. Los jugadores no pagan gas por la resolución. |
| **USDC como moneda principal** | Stablecoin = sin riesgo de volatilidad. El estudiante sabe exactamente cuánto arriesga. SOL también aceptado como alternativa. |
| **Solana sobre otras chains** | Transacciones sub-segundo, fees menores a $0.01, ecosistema maduro de wallets. Ideal para micro-stakes de estudiantes. |
| **Preguntas y tiempo variables (V1)** | Ambos parámetros son configurables por el retador. El costo de implementarlos es mínimo (1 campo extra en el contrato, selectores en el form) y evita refactors dolorosos después. Las opciones son predefinidas, no libres, para mantener el contrato predecible. |
| **Timeout como mecanismo de seguridad** | Sin esto, un jugador podría lockear los fondos del otro indefinidamente. El contrato debe permitir reclamar después de expirado el tiempo. Usa `time_limit` almacenado por duelo. |
| **lowdb sobre PostgreSQL/MongoDB** | MVP no necesita un motor de base de datos completo. lowdb es un archivo JSON que vive dentro de Next.js, zero config, zero ops. Suficiente para un hackathon. |
| **API Routes de Next en vez de backend separado** | Todo vive en el mismo proyecto Next.js. Menos cosas que deployar, menos configuración. Ideal para MVP. |
| **@solana/client + @solana/react-hooks sobre wallet-adapter** | Es el stack recomendado por Solana Foundation. wallet-adapter está deprecado (`@solana/web3.js` es legacy). |
| **Zustand sobre Redux/Context** | Menos boilerplate que Redux, más performante que Context para renders frecuentes (como el timer del quiz). |

---

## 9. Notas de Next.js 16

> ⚠️ Este proyecto usa Next.js 16. Consultar `node_modules/next/dist/docs/` antes de escribir código.

### Principales cambios respecto a Next.js 15

- **React 19** bajo el capó con React Compiler (no requiere `useMemo`/`useCallback` manuales)
- Posibles cambios en convenciones de Server Components vs Client Components
- Consultar la documentación local en `node_modules/next/dist/docs/` antes de implementar cualquier feature nuevo

### Stack compatible con Next.js 16

| Librería | Verificar compatibilidad |
|----------|------------------------|
| `@solana/react-hooks` | Sí (framework-kit) |
| `shadcn/ui` | Sí (Tailwind CSS puro) |
| `Zustand 5` | Sí |
| `Zod 4` | Sí |
| `lowdb` | Sí |
| `Framer Motion` | Verificar en Next 16 |
| `Vercel AI SDK 5` | Sí |

---

## 10. Skill de agente — Referencia rápida

### solana-dev (proyecto local)

```
Ruta: solearn/.agents/skills/solana-dev/SKILL.md
Trigger: "build a Solana dapp", "set up wallet connection", "deploy to devnet"
```

### Referencias disponibles en el skill

| Archivo | Cuándo leerlo |
|---------|---------------|
| `frontend-framework-kit.md` | Antes de escribir cualquier componente React que conecte wallet |
| `kit-web3-interop.md` | Si necesitás integrar con librerías que usan web3.js |
| `programs-anchor.md` | Antes de escribir el programa Solana |
| `testing.md` | Antes de escribir tests |
| `security.md` | Antes del deploy — checklist obligatorio |
| `payments.md` | Para manejo de USDC/SOL |
| `common-errors.md` | Si encontrás errores raros en toolchain |
