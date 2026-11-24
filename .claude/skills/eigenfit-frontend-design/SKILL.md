---
name: eigenfit-frontend-design
description: Diseña vistas y componentes de EigenFit con su lenguaje visual (slate, blanco, sobrio, español). Úsala antes de crear una vista o cambiar su composición visual; no para tareas exclusivas de backend.
---

# Diseñar una interfaz de EigenFit

Adaptada de la skill `project-frontend-design` de Relevo. EigenFit todavía no tiene una guía de diseño escrita; las vistas existentes son la referencia.

## Lenguaje visual actual (verifícalo en el código antes de asumirlo)
- Stack: React 19 + Vite, **Tailwind por CDN** (`index.html`, sin `tailwind.config` ni plugins; solo clases utilitarias estándar o valores arbitrarios), iconos `lucide-react`.
- Superficies: fondo `bg-[#FAFAFA]`/`bg-white`; tarjetas `bg-white border border-slate-100 rounded-lg` con sombra muy sutil `shadow-[0_2px_10px_-4px_rgba(0,0,0,0.02)]`.
- Texto: `text-slate-900` (títulos), `text-slate-600/500` (secundario), `text-xs`/`text-sm` para densidad. Fuente Inter.
- Solo modo claro hoy. No introduzcas dark mode por tu cuenta; si una vista nueva lo necesita, propónlo.
- Primitivas existentes en `components/ui/`: `Button`, `Input`, `Modal`, `Drawer`, `Dropdown`, `DataTable`, `ErrorBoundary`. Reúsalas antes de crear otras.
- Referencias visuales: `components/dashboard/views/HomeView.tsx`, `VisitView.tsx`, `MembershipsView.tsx`, `DashboardLayout.tsx`.
- **Textos de producto en español (México)**. Nombres de código en inglés.

## Procedimiento
1. Lee las vistas de referencia y las primitivas de `components/ui/` antes de proponer componentes nuevos.
2. Define en una frase la tarea principal de la vista y quién la usa (recepción, admin, socio, kiosco).
3. Propón la composición (wireframe breve) con jerarquía, espacio y detalle progresivo. Evita métricas, cards o gráficos sin una función explícita.
4. Identifica componentes reutilizables y estados: carga, vacío, error, deshabilitado, seleccionado, foco.
5. Color: el acento se usa para estado (lleno / casi lleno / disponible / cancelado), nunca como decoración. Comprueba contraste de pares texto/fondo (WCAG AA).
6. Responsive: escritorio y viewport estrecho (≈375 px). En móvil, prefiere listas sobre grillas densas.
7. Accesibilidad: todo operable con teclado; los drawers y modales devuelven el foco al disparador; nombres accesibles en español.
8. Para patrones de plataforma (dialog, popover, fechas/zonas horarias, formularios), consulta `modern-web-guidance`.
9. Si implementas, sigue `eigenfit-implement-change`.
10. Con UI ejecutable, captura y compara escritorio y móvil; recorre la tarea con teclado y con contenido largo (nombres largos, 30+ inscritos).

## Entrega
- Tarea, composición y motivo de las decisiones visibles.
- Componentes y estados afectados.
- Evidencia visual (capturas) o indicación explícita de que solo se produjo una propuesta.

No declares validado el aspecto de una vista basándote solo en el código.
