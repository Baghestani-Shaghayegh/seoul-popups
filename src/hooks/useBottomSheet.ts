import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder } from 'react-native';

export interface BottomSheet {
  /** Animated translateY to apply to the sheet (and anything riding above it). */
  y: Animated.Value;
  /** Spread onto the drag handle / header so the sheet follows the finger. */
  panHandlers: ReturnType<typeof PanResponder.create>['panHandlers'];
  /** Y of the sheet's top edge when fully expanded (the map peeks above it). */
  expandedTop: number;
  /** Height of the sheet (from `expandedTop` down to the bottom of the area). */
  sheetHeight: number;
  /** Report the measured height of the always-visible peek (handle + summary). */
  setPeekHeight: (h: number) => void;
}

/**
 * A draggable bottom sheet with three snap points (expanded / mid / collapsed),
 * built on core Animated + PanResponder so it needs no extra native deps.
 *
 * The sheet is a full-height view translated down by `y`: 0 shows the whole
 * list, larger values slide it down to reveal the map. `areaHeight` is the
 * measured height of the map area; `peekHeight` (reported via `setPeekHeight`)
 * is how much stays on screen when collapsed. The map itself lives behind the
 * sheet and isn't this hook's concern.
 */
export function useBottomSheet(
  areaHeight: number,
  topRatio = 0.24,
): BottomSheet {
  const [peekHeight, setPeekHeight] = useState(0);

  const y = useRef(new Animated.Value(0)).current;
  const yVal = useRef(0); // latest value of `y`, for gesture math
  const dragStart = useRef(0);
  const snaps = useRef({ expanded: 0, mid: 0, collapsed: 0 });

  const expandedTop = areaHeight ? Math.round(areaHeight * topRatio) : 0;
  const sheetHeight = areaHeight ? areaHeight - expandedTop : 0;

  useEffect(() => {
    const id = y.addListener(({ value }) => {
      yVal.current = value;
    });
    return () => y.removeListener(id);
  }, [y]);

  // Recompute snap points whenever the geometry is known. Starts expanded
  // (y = 0), so nothing needs to be forced into place.
  useEffect(() => {
    if (!sheetHeight || !peekHeight) return;
    const collapsed = Math.max(0, sheetHeight - peekHeight);
    snaps.current = {
      expanded: 0,
      mid: Math.round(collapsed * 0.5),
      collapsed,
    };
  }, [sheetHeight, peekHeight]);

  const pan = useRef(
    PanResponder.create({
      // Only claim clearly-vertical drags, so horizontal touches still pass through.
      onMoveShouldSetPanResponder: (_, g) =>
        Math.abs(g.dy) > 6 && Math.abs(g.dy) > Math.abs(g.dx),
      onPanResponderGrant: () => {
        y.stopAnimation();
        dragStart.current = yVal.current;
      },
      onPanResponderMove: (_, g) => {
        const { expanded, collapsed } = snaps.current;
        const next = Math.min(
          collapsed,
          Math.max(expanded, dragStart.current + g.dy),
        );
        y.setValue(next);
      },
      onPanResponderRelease: (_, g) => {
        const { expanded, mid, collapsed } = snaps.current;
        const pos = yVal.current;
        let target: number;
        if (g.vy < -0.5) {
          // flinging up
          target = pos > mid + 1 ? mid : expanded;
        } else if (g.vy > 0.5) {
          // flinging down
          target = pos < mid - 1 ? mid : collapsed;
        } else {
          // settle to the nearest snap point
          target = [expanded, mid, collapsed].reduce((a, b) =>
            Math.abs(b - pos) < Math.abs(a - pos) ? b : a,
          );
        }
        Animated.spring(y, {
          toValue: target,
          useNativeDriver: false, // `y` is also driven by setValue during drags
          bounciness: 0,
          speed: 16,
        }).start();
      },
    }),
  ).current;

  return {
    y,
    panHandlers: pan.panHandlers,
    expandedTop,
    sheetHeight,
    setPeekHeight,
  };
}
