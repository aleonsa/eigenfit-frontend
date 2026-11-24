import { useEffect, useRef, type RefObject } from 'react';

const FOCUSABLE =
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])';

/**
 * Comportamiento de diálogo modal: Escape cierra, Tab queda atrapado dentro,
 * el foco entra al abrir y vuelve al elemento previo al cerrar, y bloquea el scroll del body.
 */
export function useDialogFocus(isOpen: boolean, containerRef: RefObject<HTMLElement | null>, onClose: () => void) {
    // onClose suele ser una función inline: se guarda en ref para no reiniciar el efecto en cada render.
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;

    useEffect(() => {
        if (!isOpen) return;
        const node = containerRef.current;
        const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (node && !node.contains(document.activeElement)) {
            (node.querySelector<HTMLElement>('[autofocus]') ?? node).focus();
        }

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== 'Tab' || !node) return;
            const items = (Array.prototype.slice.call(node.querySelectorAll(FOCUSABLE)) as HTMLElement[]).filter(
                (el) => el.getClientRects().length > 0,
            );
            if (items.length === 0) {
                e.preventDefault();
                node.focus();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement;
            if (e.shiftKey && (active === first || active === node)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && active === last) {
                e.preventDefault();
                first.focus();
            } else if (!node.contains(active)) {
                e.preventDefault();
                first.focus();
            }
        };

        // En el propio nodo: con diálogos apilados solo responde el que tiene el foco.
        node?.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            node?.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            previous?.focus?.();
        };
    }, [isOpen, containerRef]);
}
