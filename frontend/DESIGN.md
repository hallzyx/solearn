---
name: Vanguard Brutalist Terminal (V1.0 - Solana Edition)
version: 1.1.0
author: Design Protocol Agent
aesthetic: Solana Industrial Brutalism
---

## 1. Core Visual Philosophy
Este sistema de diseño rechaza la suavidad moderna. Se basa en la **honestidad estructural**: el diseño es el sistema operativo. No hay decoraciones superfluas; cada línea es funcional y cada color es una señal energética basada en el ecosistema Solana.

- **Rigid Grid:** Todo debe estar contenido en una cuadrícula visible mediante bordes sólidos y fondos texturizados.
- **Zero Softness:** El uso de `rounded-*` está prohibido. Radio de borde estrictamente en `0px`.
- **High Information Density:** Uso de tipografía monoespaciada o técnica para metadatos y logs.
- **Aggressive Hierarchy:** Escalas tipográficas masivas (Display) contrastadas con micro-etiquetas (Label).

## 2. Technical Token Specification (Tailwind & CSS)

### Colors (Tailwind Reference)
Para una fidelidad del 100%, define estos tokens en tu `@theme`:
| Token | Hex | Tailwind Class | Usage |
| :--- | :--- | :--- | :--- |
| `surface` | `#FBF9FF` | `bg-surface` | Fondo principal (clínico violeta). |
| `brand-black` | `#000000` | `bg-brand-black` | Bordes, estructura, texto realce. |
| `brand-jade` | `#14F195` | `bg-brand-jade` | Acción crítica, estados activos. |
| `brand-violet` | `#9945FF` | `bg-brand-violet` | Acentos secundarios, red, lógica. |
| `brand-gray` | `#E2D8F0` | `bg-brand-gray` | Líneas de guía y cuadrícula. |

### Typography Implementation
- **Display (Space Grotesk):** `text-6xl md:text-8xl font-black uppercase tracking-tighter leading-[0.85]`
- **Headline (Space Grotesk):** `text-3xl font-black uppercase tracking-tight`
- **Label/Meta (Inter):** `text-[10px] font-bold uppercase tracking-[0.2em]`
- **Body (Inter/Mono):** `text-base font-normal tracking-tight`

## 3. Structural Rules & Layout Patterns

### The "Global CSS" Foundation
Copia este bloque en `index.css` para establecer el ADN del diseño:
```css
@theme {
  --color-surface: #FBF9FF;
  --color-brand-jade: #14F195;
  --color-brand-violet: #9945FF;
  --color-brand-gray: #E2D8F0;
  --color-brand-black: #000000;
}

@layer base {
  body {
    background-color: var(--color-surface);
    /* Grid de fondo de 40px */
    background-image: 
      linear-gradient(to right, #E2D8F0 1px, transparent 1px),
      linear-gradient(to bottom, #E2D8F0 1px, transparent 1px);
    background-size: 40px 40px;
    @apply selection:bg-brand-jade selection:text-black;
  }
}
```

### Component Architecture

#### 1. The Heavy Card (The "Container")
Debe usar bordes de 2px y una sombra sólida compensada.
```html
<div class="border-2 border-black bg-white p-6 [box-shadow:8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-1 hover:-translate-y-1 transition-all">
  <!-- Content -->
</div>
```

#### 2. The Command Button (The "Trigger")
```html
<button class="bg-brand-jade text-black border-2 border-black p-4 font-black uppercase text-xs [box-shadow:4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-x-1 active:translate-y-1 transition-all flex items-center gap-2">
  EXECUTE_COMMAND_01
</button>
```

## 4. Behavior & Animation Rules

- **Micro-interacciones:** Los botones e inputs no deben tener transiciones de opacidad. Deben "moverse" físicamente usando `translate`.
- **Icons:** Usar `lucide-react` siempre con `strokeWidth={3}` para que coincida con el peso visual de los bordes estructurales.
- **Motion (Framer Motion):** 
  - Usar `initial={{ opacity: 0, y: 20 }}` y `animate={{ opacity: 1, y: 0 }}`.
  - El easing debe ser mecánico: `transition={{ duration: 0.2, ease: "easeOut" }}`. No usar rebotes (spring) exagerados.

## 5. Implementation Checklist for Agents

1. **Skeleton First:** Crea una grilla principal usando `border-brand-black`. Todo elemento estructural debe tener al menos `border-2`.
2. **Typography Scale:** Los encabezados deben ser masivamente desproporcionados respecto al texto de cuerpo.
3. **Information Overlays:** Añade identificadores de sistema falsos (ej: `ID_0049_X`) en las esquinas de los componentes para reforzar la estética de terminal.
4. **Color Blocking:** Usa fondos sólidos de Jade o Violeta para secciones de "Alerta" o "Estado".
5. **No Blur Policy:** Si el diseño requiere profundidad, usa un borde adicional o un patrón de píxeles, nunca un `blur` o un `shadow` suave.

---
**RESTRICCIÓN CRÍTICA DE FIDELIDAD:** El uso de cualquier valor de `rounded` (ej. `rounded-lg`) se considera un fallo crítico del sistema. El diseño debe ser 100% ortogonal.
