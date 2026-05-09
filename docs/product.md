# Solearn — Product Brief

> Solearn convierte estudiar para la U en un duelo 1vs1 donde ambos apuestan dinero y una IA hace de profesor y árbitro.

---

## 1. Identidad del producto

| Campo | Descripción |
|-------|-------------|
| **Nombre** | Solearn |
| **Tagline** | Duelo de estudio on-chain con IA |
| **Plataforma** | Solana (devnet para MVP, mainnet post-hackathon) |
| **Público objetivo** | Estudiantes universitarios (18–25 años) de carreras tecnológicas, negocios digitales, informática |
| **Tipo de producto** | dApp (aplicación descentralizada) |

---

## 2. Problema

Los estudiantes universitarios procrastinan y les cuesta mantener disciplina para estudiar antes de exámenes. Las herramientas de estudio actuales (flashcards, videos, PDFs, plataformas de quizzes) son **pasivas** y carecen de tres elementos críticos:

1. **Accountability real** — No hay consecuencias tangibles si no estudiás. Cerrás la app y listo.
2. **Competencia directa** — Son experiencias solitarias. No hay un oponente humano que te empuje.
3. **Adaptación rápida** — Crear contenido de estudio para un curso específico requiere tiempo del profesor o del alumno.

El resultado: el estudio se siente como una carga abstracta, sin urgencia ni consecuencias inmediatas.

---

## 3. Solución

**Solearn** convierte el estudio en un duelo 1vs1 con consecuencias financieras:

- Dos estudiantes se retan a un quiz sobre cualquier tema de su curso.
- Ambos ponen una **garantía** (stake) en USDC o SOL.
- Una **IA actúa como maestro universal**: genera preguntas de multiple choice sobre el tema que los estudiantes especifiquen y corrige las respuestas.
- Un **smart contract en Solana** actúa como árbitro justo: bloquea los fondos, recibe los resultados, y paga automáticamente al ganador.

El que estudió más, gana. El que no, pierde plata. Simple, directo, y efectivo.

---

## 4. Propuesta de valor

| Componente | Valor |
|------------|-------|
| **Skin in the game** | Si no estudiás, perdés plata. La accountability es real e inmediata. |
| **IA como maestro universal** | Cualquier curso, cualquier tema. El estudiante escribe lo que necesita estudiar y la IA genera el quiz al instante. |
| **Smart contract como árbitro** | No hay "amigo que se corre del pago". El código define quién gana y distribuye automáticamente. |
| **Competencia 1vs1** | La presión de un oponente humano real. No es contra una máquina, es contra otro estudiante. |
| **Loop de revancha** | El que pierde quiere revancha. El que gana quiere seguir ganando. Retención orgánica. |

---

## 5. Caso de demo (hackathon)

- **Curso**: Tecnologías Emergentes
- **Tema**: "Teoría básica de blockchain"
- **Stake**: 1 USDC por jugador
- **Preguntas**: 5 multiple choice
- **Resultado esperado**: La IA genera 5 preguntas sobre blockchain, ambos responden, el contrato paga 2 USDC al que acierte más.

---

## 6. Feature set — MVP (V1)

### 6.1 Funcionalidades incluidas

| Feature | Descripción |
|---------|-------------|
| **Conectar wallet** | Integración con Solana wallets (Phantom, Backpack, Solflare) mediante wallet-standard |
| **Crear duelo** | El retador define: nombre del curso, tema del duelo, monto de garantía, número de preguntas y tiempo límite |
| **Generar quiz con IA** | Al crear el duelo, la IA genera N preguntas multiple choice con 4 opciones cada una sobre el tema especificado |
| **Listar duelos abiertos** | Feed de duelos pendientes donde cualquier usuario puede entrar como retado |
| **Aceptar duelo** | El retado ve los parámetros del duelo y decide entrar, bloqueando su garantía |
| **Jugar quiz** | Ambos jugadores responden las mismas preguntas (mismo orden en V1) dentro de un tiempo límite |
| **Corrección off-chain** | La IA/backend corrige las respuestas y calcula el score de cada jugador (0 a N preguntas) |
| **Resolver duelo on-chain** | El backend envía los scores al contrato, que compara y distribuye los fondos automáticamente |
| **Pantalla de resultado** | Muestra ganador, scores, y opciones de revancha o nuevo tema |
| **Timeout por abandono** | Si un jugador no responde dentro del tiempo límite, el otro reclama el pozo completo |

### 6.2 Limitaciones explícitas de V1

- Solo preguntas cerradas (multiple choice, 4 opciones).
- Stake simétrico: ambos ponen exactamente lo mismo.
- Corrección de IA **off-chain**: el contrato solo recibe los scores finales.
- El backend actúa como "oráculo de confianza" para la resolución.
- Sin ranking global, sin historial on-chain completo, sin sistema de reputación.

---

## 7. Fuera de alcance para V1 (ideas V2+)

- Preguntas abiertas (texto libre) corregidas por IA.
- Stake asimétrico (un jugador apuesta más que el otro).
- Torneos con brackets.
- Ranking global y leaderboard on-chain.
- Historial completo de duelos on-chain.
- Sistema de reputación / ELO.
- Modo de práctica sin stake.
- Creación de quizzes por parte de profesores (curadas, no IA).
- Verificación on-chain de respuestas (commit-reveal o zk).
- Duelos por equipos (2vs2).
- Integración con LMS universitarios (Moodle, Canvas).
- Token nativo de gobernanza.
