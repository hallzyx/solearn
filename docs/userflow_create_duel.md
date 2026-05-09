# Userflow: Crear Duelo

> El retador (Usuario A) crea un duelo definiendo curso, tema, garantía, cantidad de preguntas y tiempo límite.

---

## Secuencia paso a paso

### Paso 1: Landing y conexión de wallet

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario A | Abre la dApp en el navegador | El frontend carga la landing page |
| Usuario A | Hace clic en "Conectar Wallet" | Se abre el modal de selección de wallet (Phantom, Backpack, Solflare, etc.) |
| Usuario A | Aprueba la conexión en su wallet | La dApp obtiene la `Pubkey` de A y muestra: balance de USDC/SOL, avatar/identicon, botones principales |

**Reglas:**
- Si el usuario no tiene wallet instalada, se muestra un mensaje con links para instalar Phantom/Backpack.
- Si el usuario no tiene USDC o SOL suficiente para el stake mínimo, se muestra una advertencia (pero no se bloquea — puede que quiera fondearse después).
- La wallet permanece conectada durante toda la sesión.

---

### Paso 2: Home — Ver opciones

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario A | Llega al Home (ya conectado) | Se muestran dos cards principales: |

```
┌──────────────────────────┐   ┌──────────────────────────┐
│      ⚔️ CREAR DUELO      │   │     🔍 BUSCAR DUELOS     │
│                          │   │                          │
│  Retá a alguien a un     │   │  Hay 3 duelos abiertos   │
│  quiz sobre tu tema.     │   │  esperando rival.         │
│                          │   │                          │
│    [Crear duelo]         │   │    [Ver duelos]          │
└──────────────────────────┘   └──────────────────────────┘
```

| Usuario A | Hace clic en "Crear duelo" | Navega a la pantalla de creación |

---

### Paso 3: Formulario de creación

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario A | Ve el formulario "Crear duelo" | La UI muestra: |

**Campos del formulario:**

| Campo | Tipo | Ejemplo | Validación |
|-------|------|---------|-----------|
| **Nombre del curso** | Text input | "Tecnologías Emergentes" | Requerido, 3–100 caracteres |
| **Tema del duelo** | Text input | "Teoría básica de blockchain" | Requerido, 3–200 caracteres |
| **Monto de garantía** | Selector | 0.5 USDC, 1 USDC, 2 USDC, 5 USDC | Requerido, debe tener balance suficiente |
| **Número de preguntas** | Selector | 3, 5, 10 | Requerido, opciones predefinidas |
| **Tiempo límite** | Selector | 3 min, 5 min, 10 min | Requerido, opciones predefinidas |

**Opciones predefinidas (V1):**

| Parámetro | Opciones |
|-----------|----------|
| **Stake** | 0.5 USDC, 1 USDC (default), 2 USDC, 5 USDC |
| **Preguntas** | 3 (rápido), 5 (default), 10 (completo) |
| **Tiempo límite** | 3 min (rápido), 5 min (default), 10 min (completo) |
- 0.5 USDC
- 1 USDC (default)
- 2 USDC
- 5 USDC

**| Usuario A | Selecciona el número de preguntas y el tiempo límite según su preferencia | — |

---

### Paso 3b: Preview del duelo

A medida que completa el formulario, se muestra un preview en tiempo real:

```
┌──────────────────────────────────────────────┐
│  ⚔️ Preview del duelo                        │
│                                              │
│  Retador: @alice.sol                         │
│  Curso: Tecnologías Emergentes               │
│  Tema: Teoría básica de blockchain           │
│  💰 1 USDC  │  ❓ 5 preg.  │  ⏱️ 5 min      │
└──────────────────────────────────────────────┘
```

**Estados del formulario:****

| Estado | UI |
|--------|-----|
| Vacío | Placeholders: "Ej: Tecnologías Emergentes", "Ej: Teoría básica de blockchain" |
| Completando | Validación en tiempo real (caracteres mínimos, balance suficiente) |
| Inválido | Borde rojo en campo problemático + mensaje de error debajo |
| Válido | Botón "Crear duelo" habilitado |

| Usuario A | Completa los campos y selecciona el stake | — |
| Usuario A | Hace clic en "Crear duelo" | Se dispara la secuencia de creación |

---

### Paso 4: Generación del quiz (backend + IA)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El frontend llama al backend: `POST /api/duels` con `{ course, topic, stake, question_count, time_limit }` |
| — | — | El backend envía el tema a la IA con un prompt estructurado para generar `question_count` preguntas multiple choice con 4 opciones cada una, incluyendo la respuesta correcta. |
| — | — | La IA retorna el quiz en formato estructurado (JSON). |
| — | — | El backend **no retorna las preguntas ni las respuestas correctas al frontend todavía**. Solo crea la entrada del duelo off-chain y devuelve un `duel_id` y los datos necesarios para la transacción on-chain. |

**Prompt de IA (ejemplo):**
```
Eres un profesor universitario experto en [tema].
Genera [question_count] preguntas de opción múltiple (A, B, C, D) sobre [tema] para un 
examen del curso "[curso]". Cada pregunta debe tener exactamente 4 opciones 
y una única respuesta correcta claramente indicada. Las preguntas deben 
evaluar comprensión conceptual, no solo memorización.

Formato de salida JSON:
{
  "questions": [
    {
      "text": "¿Qué es un bloque en una blockchain?",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correct_index": 0
    }
  ]
}
```

---

### Paso 5: Creación on-chain (smart contract)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El frontend construye la instrucción para el programa de Solana: `create_duel(stake_amount, question_count, time_limit, duel_id)` |
| Usuario A | Ve un modal de confirmación: "Vas a crear un duelo sobre [tema] con garantía de 1 USDC. Se bloqueará este monto de tu wallet." | — |
| Usuario A | Hace clic en "Confirmar" | Se envía la transacción a la wallet de A para firmar |
| Usuario A | Firma la transacción en su wallet | — |
| — | — | El programa de Solana: crea la cuenta PDA del duelo con estado `CREATED`, transfiere el stake de A a una cuenta escrow (o token account del PDA), almacena `challenger`, `stake_amount`, `question_count`, `time_limit`, `duel_id`, `created_at`. |

**Cuentas involucradas en `create_duel`:**

| Cuenta | Rol |
|--------|-----|
| `challenger` (signer) | El usuario A, paga la tx y el stake |
| `duel_account` (PDA) | Cuenta nueva que almacena el estado del duelo |
| `escrow_token_account` (PDA) | Token account que retiene los fondos durante el duelo |
| `challenger_token_account` (ATA) | Cuenta de USDC/SOL de A, de donde se debita el stake |
| `token_program` | Token Program o Token-2022 |
| `system_program` | Para crear cuentas |

---

### Paso 6: Confirmación y link de duelo

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | Al confirmarse la transacción on-chain, el backend marca el duelo como `CREATED` en la DB off-chain. |
| Usuario A | Ve la pantalla de confirmación: |

```
┌────────────────────────────────────────┐
│        ✅ Duelo creado con éxito        │
│                                        │
│  Curso: Tecnologías Emergentes         │
│  Tema: Teoría básica de blockchain     │
│  Garantía: 1 USDC                       │
│  Preguntas: 5                          │
│  Tiempo límite: 5 minutos              │
│                                        │
│  Compartí este enlace con tu rival:    │
│  ┌────────────────────────────────────┐ │
│  │ solearn.app/duel/abc123            │ │
│  └────────────────────────────────────┘ │
│  [📋 Copiar enlace]                     │
│                                        │
│  O esperá a que alguien lo acepte       │
│  desde el feed de duelos abiertos.      │
│                                        │
│       [⚔️ Ver mis duelos]              │
└────────────────────────────────────────┘
```

| Usuario A | Copia el enlace y lo comparte por WhatsApp/Telegram/Discord | — |
| Usuario A | O vuelve al Home a esperar | El duelo aparece en el feed de "Duelos abiertos" para otros usuarios |

---

### Paso 7 (opcional): Cancelar duelo

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario A | Desde "Mis duelos", ve su duelo en estado `CREATED` y hace clic en "Cancelar" | — |
| — | — | El frontend construye `cancel_duel(duel_id)` y pide firma |
| Usuario A | Firma la transacción | — |
| — | — | El contrato verifica que el duelo esté en estado `CREATED` y que el signer sea el `challenger`. Libera los fondos de vuelta a A. Cambia estado a `CANCELLED`. |

**Regla:** Solo se puede cancelar si el duelo está en estado `CREATED` (nadie lo aceptó todavía).

---

## Estados de UI durante la creación

| Momento | UI State |
|---------|----------|
| Formulario completándose | Inputs activos, botón deshabilitado hasta que todo sea válido |
| Click en "Crear duelo" | Botón muestra spinner, inputs se deshabilitan |
| Generando quiz (backend) | Mensaje: "La IA está generando las preguntas..." |
| Esperando firma de wallet | Modal de wallet abierto (lo maneja el wallet adapter) |
| Transacción enviada | Mensaje: "Creando duelo en Solana... (tx: 4xK9...)" con link al explorer |
| Transacción confirmada | Pantalla de éxito con link de duelo |
| Error en cualquier paso | Toast de error con mensaje específico y botón de reintentar |

---

## Edge cases

| Caso | Comportamiento |
|------|---------------|
| Usuario cierra el navegador mientras se genera el quiz | El duelo off-chain queda a medio crear. La tx on-chain no se ejecutó. Se descarta al volver. |
| La IA falla en generar el quiz | Error mostrado al usuario: "No pudimos generar el quiz. Intentá con un tema más específico." |
| Usuario rechaza la firma en la wallet | El duelo off-chain queda huérfano. Se muestra mensaje: "Transacción cancelada." |
| Balance insuficiente detectado en la wallet | El contrato revierte la transacción. Se muestra error antes de enviar la tx si el frontend lo detecta. |
| Tema ofensivo o inválido | V1: sin filtro. V2: filtro de contenido con IA. |
