# Userflow: Timeout por Abandono

> Mecanismo de seguridad para cuando un jugador abandona el duelo.
> El jugador activo reclama el pozo completo. El que abandonó pierde su stake.

---

## Secuencia paso a paso

### Concepto general

En un duelo, hay dos ventanas de tiempo críticas:

| Fase | Timeout | Qué pasa si expira |
|------|---------|-------------------|
| **Esperando rival** | 24 horas desde `CREATED` | El duelo expira. El retador puede reclamar su devolución. |
| **Quiz en curso** | `time_limit` del duelo desde `IN_PROGRESS` (3, 5 o 10 min según selección del retador) | El jugador que NO respondió (o respondió incompleto) pierde. El otro reclama el pozo. |

Para V1, nos enfocamos principalmente en el timeout durante el quiz, que es el caso más crítico. El timeout de "esperando rival" es un nice-to-have.

---

### Escenario: Timeout durante el quiz

**Premisa:** Ambos jugadores aceptaron el duelo (estado `IN_PROGRESS`). Uno de ellos abandona (no responde, cierra el navegador, se queda sin internet).

---

### Paso 1: Detección del abandono (backend)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El backend monitorea los duelos en estado `IN_PROGRESS` o `ACCEPTED`. |
| — | — | Un worker/cron verifica periódicamente (cada 15 segundos): |

**Lógica de detección:**

```python
def check_timeouts():
    active_duels = db.get_duels_in_progress()
    
    for duel in active_duels:
        # Tiempo desde que el duelo pasó a IN_PROGRESS
        elapsed = now() - duel.started_at
        
        if elapsed > duel.time_limit:  # usa el time_limit configurado por el retador
            # ¿Ambos terminaron?
            if duel.challenger_answers.count < duel.question_count:
                # Challenger no terminó
                resolve_timeout(duel, abandoned='challenger', claimer='opponent')
            elif duel.opponent_answers.count < duel.question_count:
                # Opponent no terminó
                resolve_timeout(duel, abandoned='opponent', claimer='challenger')
```

**Reglas de timeout:**
- Si pasó el `time_limit` del duelo (3, 5 o 10 minutos desde que entró en `IN_PROGRESS`) y un jugador no respondió todas las preguntas, ese jugador es declarado en abandono.
- El backend calcula el score del jugador que SÍ respondió (aunque sea parcial) para mostrarlo en la UI, pero el resultado del duelo es automáticamente a favor del jugador activo.
- Las preguntas no respondidas por el abandonador cuentan como incorrectas (0). Las respondidas se corrigen normalmente.

---

### Paso 2: Reclamo on-chain (backend → smart contract)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El backend construye y firma la transacción: `claim_timeout(duel_id)` |
| — | — | La transacción se envía a Solana. |

**Lógica del contrato en `claim_timeout`:**

```rust
pub fn claim_timeout(ctx: Context<ClaimTimeout>) -> Result<()> {
    let duel = &mut ctx.accounts.duel;
    
    // Solo el resolver autorizado
    require!(ctx.accounts.resolver.key() == duel.resolver, ErrorCode::Unauthorized);
    
    // El duelo debe estar en estado ACCEPTED o IN_PROGRESS
    require!(
        duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress,
        ErrorCode::InvalidStatus
    );
    
    // Verificar que realmente pasó el tiempo límite
    let clock = Clock::get()?;
    require!(
        clock.unix_timestamp >= duel.started_at + duel.time_limit,  # time_limit en segundos
        ErrorCode::TimeoutNotReached
    );
    
    // Determinar quién abandonó basado en quién tiene menos respuestas
    // (esto lo determina el backend y lo pasa como argumento o el contrato
    //  recibe scores de un oráculo de confianza)
    
    let total_pot = duel.stake_amount * 2;
    
    // Transferir todo al jugador activo
    // La dirección del ganador viene en los argumentos o se infiere
    transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.claimer_ata, total_pot)?;
    
    duel.winner = Some(ctx.accounts.claimer.key());
    duel.status = DuelStatus::TimedOut;
    
    Ok(())
}
```

**Cuentas involucradas en `claim_timeout`:**

| Cuenta | Rol |
|--------|-----|
| `resolver` (signer) | Keypair del backend |
| `duel_account` (PDA) | Se actualiza estado a `TIMED_OUT` |
| `escrow_token_account` (PDA) | Origen de los fondos |
| `claimer_token_account` (ATA) | Destino: el jugador que NO abandonó |
| `token_program` | Token Program |

---

### Paso 3: Notificación a los jugadores

**Para el jugador activo (ganador por timeout):**

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario activo | Está en la pantalla de espera o volvió a abrir la app | El frontend detecta el cambio de estado |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│               ⏰ ¡Tu rival no respondió!               │
│                                                      │
│  @bob.sol no completó el quiz a tiempo.               │
│                                                      │
│  Recibiste el pozo completo: 2.0 USDC                 │
│                                                      │
│  Tus respuestas: 3/5                                 │
│  (aunque no era necesario, ¡bien hecho!)              │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Resumen                                  │    │
│  │  Curso: Tecnologías Emergentes               │    │
│  │  Tema: Teoría básica de blockchain           │    │
│  │  Motivo: Rival no respondió                  │    │
│  │  Tx: 4xK9...f3a  (Ver en Solscan)           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Nuevo duelo]    [📚 Nuevo tema]                 │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Para el jugador que abandonó:**

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario que abandonó | Vuelve a abrir la app más tarde | El frontend detecta el estado `TIMED_OUT` |

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│          ⏰ Se acabó el tiempo                         │
│                                                      │
│  No respondiste a tiempo. Perdiste tu garantía        │
│  de 1.0 USDC.                                        │
│                                                      │
│  La próxima vez, asegurate de tener tiempo            │
│  para completar el duelo.                             │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Resumen                                  │    │
│  │  Curso: Tecnologías Emergentes               │    │
│  │  Tema: Teoría básica de blockchain           │    │
│  │  Motivo: No respondiste a tiempo             │    │
│  │  Tx: 4xK9...f3a  (Ver en Solscan)           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Intentar de nuevo]    [📚 Nuevo tema]           │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Paso 4: Timeout por duelo expirado (sin rival)

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario A | Creó un duelo hace 24 horas y nadie lo aceptó | — |
| — | — | El backend detecta duelos en estado `CREATED` con más de 24 horas de antigüedad |
| — | — | Cambia estado a `EXPIRED` off-chain |
| — | — | El frontend construye la tx: `cancel_duel(duel_id)` (o un instruction específica `expire_duel`) |
| Usuario A | Firma la transacción | — |
| — | — | El contrato libera los fondos de vuelta a A. Estado: `EXPIRED`. |

**Nota V1:** Por simplicidad, el timeout de "sin rival" puede usar la misma instrucción `cancel_duel` que ya existe, sin restricción de tiempo (el propio usuario cancela cuando quiere). El estado `EXPIRED` es informativo en la UI.

---

## Diagrama de estados con timeouts

```
                    ┌─────────┐
                    │ CREATED │──(A cancela)──→ CANCELLED
                    └────┬────┘
                         │
                    (B acepta)
                         │
                    ┌────▼─────┐
                    │ ACCEPTED │
                    └────┬─────┘
                         │
                    (quiz inicia)
                         │
                 ┌───────▼────────┐
                 │  IN_PROGRESS   │
                 └┬──────────────┬┘
                  │              │
          (ambos terminan)  (timer expira sin
          y scores enviados)  que uno termine)
                  │              │
          ┌───────▼──────┐  ┌───▼─────────┐
          │  COMPLETED   │  │  TIMED_OUT   │
          └──────────────┘  └──────────────┘
```

---

## Consideraciones de seguridad

| Riesgo | Mitigación |
|--------|-----------|
| **Frontend manipula el timer** | El timer real lo controla el backend. El timer del frontend es solo visual. El backend es la fuente de verdad para el timeout. |
| **Jugador responde 1 pregunta y cierra todo para forzar timeout y recuperar** | No recupera. El timeout siempre beneficia al jugador que jugó más. Si el rival respondió aunque sea 1 pregunta más, el rival gana. |
| **Ambos abandonan** | Edge case raro. Si ninguno responde nada en el `time_limit` del duelo, se considera empate y se devuelve el stake a cada uno (o se penaliza a ambos — decisión de diseño). Para V1: devolución a ambos. |
| **Ataque de denegación de servicio al backend** | El timeout es una seguridad on-chain. Si el backend se cae, el contrato igual puede ser llamado por cualquier persona después del tiempo límite (con los datos correctos). En V1, solo el backend puede llamarlo. En V2, cualquier usuario puede triggerear el timeout. |
| **Resolver hace trampa marcando timeout cuando no pasó el tiempo** | El contrato verifica `clock.unix_timestamp >= started_at + TIME_LIMIT`. No se puede timear antes de tiempo. |

---

## Edge cases

| Caso | Comportamiento |
|------|---------------|
| Jugador pierde conexión por 2 min pero vuelve antes del timeout | Puede seguir respondiendo. El timer del backend sigue corriendo. |
| Jugador responde 4/5 y se va | El backend espera hasta el timeout. Si no vuelve, las 4 respuestas se corrigen y se comparan contra el rival. Si el rival respondió 5/5, gana el rival normalmente (no se aplica timeout porque ambos "terminaron" — el backend cierra el duelo al timeout global aunque falten respuestas). |
| Duelo resuelto por timeout pero el "ganador" también tenía score 0 | Gana igual. El que abandonó pierde por abandono, no por score. |
| El backend intenta resolver por timeout pero el contrato ya fue resuelto normalmente | El contrato rechaza la transacción (estado ya no es IN_PROGRESS). El backend detecta el error y no reintenta. |
