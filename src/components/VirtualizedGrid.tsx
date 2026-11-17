import { useLayoutEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { RefObject, ReactNode } from 'react';

interface VirtualizedGridProps<T> {
  items: T[];
  scrollElementRef: RefObject<HTMLDivElement | null>;
  minItemWidth: number;
  itemHeight: number;
  className: string;
  renderItem: (item: T, index: number) => ReactNode;
}

export default function VirtualizedGrid<T>({
  items,
  scrollElementRef,
  minItemWidth,
  itemHeight,
  className,
  renderItem,
}: VirtualizedGridProps<T>) {
  const gridRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState({
    columns: 1,
    columnGap: 0,
    rowGap: 0,
    paddingTop: 0,
    paddingBottom: 0,
    scrollMargin: 0,
  });

  // El número de columnas se deduce del CSS, no se fija a mano: así el
  // mismo componente respeta los media queries de cada vista. Se mide
  // antes del paint (useLayoutEffect) para evitar un salto visible.
  useLayoutEffect(() => {
    const grid = gridRef.current;
    const scrollElement = scrollElementRef.current;
    if (!grid) return;

    const updateLayout = () => {
      const style = window.getComputedStyle(grid);
      const columnGap = Number.parseFloat(style.columnGap) || 0;
      const rowGap = Number.parseFloat(style.rowGap) || 0;
      const availableWidth =
        grid.clientWidth -
        (Number.parseFloat(style.paddingLeft) || 0) -
        (Number.parseFloat(style.paddingRight) || 0);
      const columns = Math.max(
        1,
        Math.floor((availableWidth + columnGap) / (minItemWidth + columnGap)),
      );
      // El desplazamiento de la rejilla respecto al contenedor de scroll es
      // constante (ambos se mueven juntos al hacer scroll), así que se mide
      // aquí y no en cada render, donde forzaba un layout sincrónico.
      const scrollMargin = scrollElement
        ? grid.getBoundingClientRect().top -
          scrollElement.getBoundingClientRect().top +
          scrollElement.scrollTop
        : 0;
      const next = {
        columns,
        columnGap,
        rowGap,
        paddingTop: Number.parseFloat(style.paddingTop) || 0,
        paddingBottom: Number.parseFloat(style.paddingBottom) || 0,
        scrollMargin,
      };

      setLayout((current) =>
        current.columns === next.columns &&
        current.columnGap === next.columnGap &&
        current.rowGap === next.rowGap &&
        current.paddingTop === next.paddingTop &&
        current.paddingBottom === next.paddingBottom &&
        current.scrollMargin === next.scrollMargin
          ? current
          : next,
      );
    };

    updateLayout();
    const observer = new ResizeObserver(updateLayout);
    observer.observe(grid);
    if (scrollElement) observer.observe(scrollElement);
    return () => observer.disconnect();
  }, [minItemWidth, scrollElementRef]);

  const scrollMargin = layout.scrollMargin;
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollElementRef.current,
    estimateSize: () => itemHeight,
    overscan: layout.columns * 2,
    lanes: layout.columns,
    gap: layout.rowGap,
    paddingStart: layout.paddingTop,
    paddingEnd: layout.paddingBottom,
    scrollMargin,
  });

  return (
    <div
      ref={gridRef}
      className={`${className} virtualized-grid`}
      style={{ height: Math.max(0, virtualizer.getTotalSize() - scrollMargin) }}
    >
      {virtualizer.getVirtualItems().map((virtualItem) => {
        const item = items[virtualItem.index];
        if (item === undefined) return null;
        const left = `calc((100% + ${layout.columnGap}px) * ${virtualItem.lane} / ${layout.columns})`;
        const width = `calc((100% - ${layout.columnGap * (layout.columns - 1)}px) / ${layout.columns})`;

        return (
          <div
            key={virtualItem.key}
            className="virtualized-grid-item"
            style={{
              left,
              top: 0,
              width,
              height: itemHeight,
              transform: `translateY(${virtualItem.start - scrollMargin}px)`,
            }}
          >
            {renderItem(item, virtualItem.index)}
          </div>
        );
      })}
    </div>
  );
}
