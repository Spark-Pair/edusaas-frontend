import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const GAP = 10;

const getDirection = (target) => {
  const dir = target.getAttribute('data-tooltip-direction') || target.getAttribute('data-tooltip-dir') || 'top';
  if (['top', 'bottom', 'left', 'right'].includes(dir)) return dir;
  return 'top';
};

const TooltipLayer = () => {
  const [tooltip, setTooltip] = useState({
    visible: false,
    text: '',
    x: 0,
    y: 0,
    direction: 'top'
  });

  useEffect(() => {
    const hide = () => {
      setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    const showFromTarget = (target) => {
      if (!target || typeof target.closest !== 'function') return;
      const anchor = target.closest('[data-tooltip]');
      if (!anchor) return;
      const text = anchor.getAttribute('data-tooltip');
      if (!text) return;

      const rect = anchor.getBoundingClientRect();
      const direction = getDirection(anchor);

      let x = rect.left + rect.width / 2;
      let y = rect.top - GAP;
      if (direction === 'bottom') y = rect.bottom + GAP;
      if (direction === 'left') {
        x = rect.left - GAP;
        y = rect.top + rect.height / 2;
      }
      if (direction === 'right') {
        x = rect.right + GAP;
        y = rect.top + rect.height / 2;
      }

      setTooltip({
        visible: true,
        text,
        x,
        y,
        direction
      });
    };

    const onPointerOver = (event) => showFromTarget(event.target);
    const onPointerOut = (event) => {
      if (!event.target?.closest) return;
      const from = event.target.closest('[data-tooltip]');
      if (!from) return;
      const to = event.relatedTarget?.closest?.('[data-tooltip]');
      if (from !== to) hide();
    };
    const onFocusIn = (event) => showFromTarget(event.target);
    const onFocusOut = (event) => {
      const active = document.activeElement?.closest?.('[data-tooltip]');
      if (!active) hide();
    };
    const onScroll = () => hide();
    const onKeyDown = (event) => {
      if (event.key === 'Escape') hide();
    };

    document.addEventListener('pointerover', onPointerOver, true);
    document.addEventListener('pointerout', onPointerOut, true);
    document.addEventListener('focusin', onFocusIn, true);
    document.addEventListener('focusout', onFocusOut, true);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('wheel', onScroll, { passive: true });
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('pointerover', onPointerOver, true);
      document.removeEventListener('pointerout', onPointerOut, true);
      document.removeEventListener('focusin', onFocusIn, true);
      document.removeEventListener('focusout', onFocusOut, true);
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, []);

  const transform = useMemo(() => {
    if (tooltip.direction === 'bottom') return 'translate(-50%, 0)';
    if (tooltip.direction === 'left') return 'translate(-100%, -50%)';
    if (tooltip.direction === 'right') return 'translate(0, -50%)';
    return 'translate(-50%, -100%)';
  }, [tooltip.direction]);

  if (!tooltip.visible) return null;

  return createPortal(
    <div
      className="tooltip-layer"
      style={{
        left: `${tooltip.x}px`,
        top: `${tooltip.y}px`,
        transform
      }}
      role="tooltip"
      aria-hidden
    >
      {tooltip.text}
      <span className={`tooltip-arrow tooltip-arrow-${tooltip.direction}`} />
    </div>,
    document.body
  );
};

export default TooltipLayer;
