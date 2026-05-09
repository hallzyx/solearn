# Userflow: Resolver Duelo

> El backend envía los scores al smart contract. El contrato determina al ganador y distribuye los fondos.

---

## Secuencia paso a paso

### Paso 1: Corrección de respuestas (backend)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | Ambos jugadores terminaron el quiz (estado `finished`) o el temporizador global expiró. |
| — | — | El backend ejecuta la corrección: |

```python
def grade_duel(duel):
    challenger_score = 0
    opponent_score = 0
    
    for question in duel.questions:
        correct = question.correct_index
        
        challenger_answer = duel.challenger_answers.get(question.id)
        if challenger_answer and challenger_answer.selected_index == correct:
            challenger_score += 1
            
        opponent_answer = duel.opponent_answers.get(question.id)
        if opponent_answer and opponent_answer.selected_index == correct:
            opponent_score += 1
            
    return challenger_score, opponent_score
```

| — | — | El backend almacena los scores y cambia el estado del duelo a `READY_TO_RESOLVE`. |

---

### Paso 2: Espera de resultados (frontend)

| Actor | Acción | Sistema |
|-------|--------|---------|
| Usuario | Está en la pantalla de espera | El frontend hace polling: `GET /api/duels/:id/status` |
| — | — | Cuando el backend responde con `status: "READY_TO_RESOLVE"` y los scores, el frontend muestra una transición: |

```
┌────────────────────────────────────────────┐
│                                            │
│         ⚖️ Calculando resultados...        │
│                                            │
│     La IA está corrigiendo las respuestas.  │
│                                            │
└────────────────────────────────────────────┘
```

---

### Paso 3: Resolución on-chain (backend → smart contract)

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | El backend construye y firma la transacción con su propia keypair (el "resolver"): `resolve_duel(duel_id, score_a, score_b)` |
| — | — | La transacción se envía a Solana. |

**Lógica del contrato en `resolve_duel`:**

```rust
pub fn resolve_duel(ctx: Context<ResolveDuel>, score_a: u8, score_b: u8) -> Result<()> {
    let duel = &mut ctx.accounts.duel;
    
    // Solo el resolver autorizado puede llamar
    require!(ctx.accounts.resolver.key() == duel.resolver, ErrorCode::Unauthorized);
    
    // Solo se resuelve si está en estado ACCEPTED o IN_PROGRESS
    require!(duel.status == DuelStatus::Accepted || duel.status == DuelStatus::InProgress, 
             ErrorCode::InvalidStatus);
    
    // Guardar scores
    duel.score_a = score_a;
    duel.score_b = score_b;
    
    // Determinar ganador y transferir
    let total_pot = duel.stake_amount * 2;
    
    if score_a > score_b {
        // Challenger gana todo
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.challenger_ata, total_pot)?;
        duel.winner = Some(duel.challenger);
    } else if score_b > score_a {
        // Opponent gana todo
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.opponent_ata, total_pot)?;
        duel.winner = Some(duel.opponent);
    } else {
        // Empate: devolver a cada uno su stake
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.challenger_ata, duel.stake_amount)?;
        transfer_from_escrow_to(&ctx.accounts.escrow, &ctx.accounts.opponent_ata, duel.stake_amount)?;
        duel.winner = None; // None = empate
    }
    
    duel.status = DuelStatus::Completed;
    Ok(())
}
```

**Cuentas involucradas en `resolve_duel`:**

| Cuenta | Rol |
|--------|-----|
| `resolver` (signer) | Keypair del backend autorizada para resolver |
| `duel_account` (PDA) | Estado del duelo, se actualiza con scores y winner |
| `escrow_token_account` (PDA) | De donde salen los fondos |
| `challenger_token_account` (ATA) | Destino si A gana o en empate |
| `opponent_token_account` (ATA) | Destino si B gana o en empate |
| `token_program` | Token Program |

**¿Por qué el backend paga la tx?**
- Los jugadores ya pagaron su stake y la tx de creación/aceptación.
- No queremos que tengan que pagar gas adicional para resolver.
- El backend como "resolver" es un oráculo de confianza en V1. En V2 se puede descentralizar.

---

### Paso 4: Pantalla de resultado

| Actor | Acción | Sistema |
|-------|--------|---------|
| — | — | La transacción se confirma on-chain. El backend actualiza el estado a `COMPLETED`. |
| Usuario | El frontend detecta el cambio de estado y muestra la pantalla de resultado | — |

**Caso: Victoria (Usuario A ganó)**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   🏆 ¡GANASTE!                        │
│                                                      │
│  Tu score: 4/5                                       │
│  Score de @bob.sol: 2/5                              │
│  Preguntas: 5 · Tiempo: 5 min                        │
│                                                      │
│  Recibiste 2.0 USDC en tu wallet.                    │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Resumen                                  │    │
│  │  Curso: Tecnologías Emergentes               │    │
│  │  Tema: Teoría básica de blockchain           │    │
│  │  Tx: 4xK9...f3a  (Ver en Solscan)           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Pedir revancha]    [📚 Nuevo tema]              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Caso: Derrota (Usuario B perdió)**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   📚 Perdiste el duelo                 │
│                                                      │
│  Tu score: 2/5                                       │
│  Score de @alice.sol: 4/5                            │
│  Preguntas: 5 · Tiempo: 5 min                        │
│                                                      │
│  Perdiste 1.0 USDC, pero ahora sabés qué repasar     │
│  antes del examen. 💪                                │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │  📊 Resumen                                  │    │
│  │  Curso: Tecnologías Emergentes               │    │
│  │  Tema: Teoría básica de blockchain           │    │
│  │  Tx: 4xK9...f3a  (Ver en Solscan)           │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  [⚔️ Pedir revancha]    [📚 Nuevo tema]              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

**Caso: Empate**

```
┌──────────────────────────────────────────────────────┐
│                                                      │
│                   🤝 ¡Empate!                         │
│                                                      │
│  Ambos sacaron 3/5                                   │
│                                                      │
│  Preguntas: 5 · Tiempo: 5 min                        │
│                                                      │
│  Recuperaste tu garantía de 1.0 USDC.                │
│                                                      │
│  [⚔️ Pedir revancha]    [📚 Nuevo tema]              │
│                                                      │
└──────────────────────────────────────────────────────┘
```

---

### Paso 5: Acciones post-resultado

| Botón | Comportamiento |
|-------|---------------|
| **Pedir revancha** | Crea un nuevo duelo con el mismo curso y tema. Navega al formulario de creación pre-rellenado con los mismos datos. |
| **Nuevo tema** | Navega al formulario de creación limpio para empezar un duelo sobre otro tema. |
| **Ver en Solscan** | Link externo al explorador de Solana para ver la transacción de resolución. |

---

### Paso 6: Historial de duelos

Desde el Home, el usuario puede ver su historial:

```
┌──────────────────────────────────────────────────────┐
│  📊 TU HISTORIAL                                     │
│                                                      │
│  Victorias: 7  │  Derrotas: 3  │  Empates: 1         │
│  Ganancias totales: +4.5 USDC                        │
│                                                      │
│  ┌──────────────────────────────────────────────┐    │
│  │ 🏆 Blockchain — 4/5 vs 2/5 — +1 USDC        │    │
│  │    hace 10 min                                │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ 📚 Cloud — 1/5 vs 5/5 — -2 USDC              │    │
│  │    hace 2 horas                               │    │
│  └──────────────────────────────────────────────┘    │
│  ┌──────────────────────────────────────────────┐    │
│  │ 🤝 IA — 3/5 vs 3/5 — 0 USDC                  │    │
│  │    hace 1 día                                 │    │
│  └──────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────┘
```

---

## Diagrama de secuencia completo (resolve)

```
Usuario A       Frontend A      Backend         Contrato        Frontend B      Usuario B
    |               |               |               |               |               |
    |  terminé quiz |               |               |               |               |
    |-------------->|               |               |               |               |
    |               | POST /answers |               |               |               |
    |               |-------------->|               |               |               |
    |               |               |               |               |  terminé quiz |
    |               |               |               |               |<--------------|
    |               |               |               |               | POST /answers |
    |               |               |<--------------|---------------|               |
    |               |               |               |               |               |
    |               |               | ambos finished → calcular scores              |
    |               |               |               |               |               |
    |               |  polling...   |               |               |  polling...   |
    |               |<------------->|               |               |<------------->|
    |               |               |               |               |               |
    |               |               | resolve_duel  |               |               |
    |               |               |-------------->|               |               |
    |               |               |               | distribuir    |               |
    |               |               |               | fondos        |               |
    |               |               |<--------------|               |               |
    |               |               |               |               |               |
    |               | status: COMPLETED             |               |               |
    |               |<--------------|-------------->|               |               |
    |               |               |               |               |               |
    |  resultado    |               |               |  resultado    |               |
    |<--------------|               |               |-------------->|               |
```

---

## Edge cases

| Caso | Comportamiento |
|------|---------------|
| El backend falla al enviar `resolve_duel` | Reintenta con backoff exponencial. El duelo queda en `READY_TO_RESOLVE`. Los frontends siguen mostrando pantalla de espera. |
| El contrato revierte `resolve_duel` (scores inválidos) | El backend registra el error, notifica a los frontends con mensaje genérico: "Error al procesar el resultado. Reintentando..." |
| Un jugador cierra el navegador antes de ver el resultado | Al volver a abrir la app y conectar la wallet, ve el resultado automáticamente (el estado está en la DB y on-chain). |
| Intento de doble resolución | El contrato rechaza porque el estado ya es `COMPLETED`. El backend detecta que ya fue resuelto y simplemente notifica a los frontends. |
| El backend se cae antes de resolver | El duelo queda en `READY_TO_RESOLVE`. Al reiniciar el backend, procesa los duelos pendientes. |
| Jugador no está de acuerdo con la corrección | V1: no hay mecanismo de disputa. Se muestra disclaimer en la UI: "La corrección es realizada por IA y puede no ser perfecta." V2: se puede agregar revisión comunitaria o commit-reveal. |
