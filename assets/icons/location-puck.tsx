// components/LocationPuck.tsx
import React, { memo, useMemo } from "react";
import { View, ViewStyle } from "react-native";
import Svg, { Defs, RadialGradient, Stop, Circle, Path, G } from "react-native-svg";

type Props = {
  /** heading in degrees (0..360), 0 = north/up */
  heading?: number;
  /** show the direction cone */
  showCone?: boolean;
  /** cone width in degrees (bigger = less accuracy) */
  coneAngleDeg?: number;
  /** overall size (px) */
  size?: number;
  /** main blue color (defaults like Google-ish) */
  color?: string;
  /** opacity of the cone fill */
  coneOpacity?: number;
  style?: ViewStyle;
};

const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const deg2rad = (d: number) => (d * Math.PI) / 180;

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const a = deg2rad(angleDeg - 90);
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
}

/**
 * Build a wedge/cone path. Angles are in degrees, 0 = north/up.
 * The cone starts at inner radius and ends at outer radius.
 */
function buildConePath(
  cx: number,
  cy: number,
  innerR: number,
  outerR: number,
  startAngle: number,
  endAngle: number
) {
  const sOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const eOuter = polarToCartesian(cx, cy, outerR, endAngle);
  const sInner = polarToCartesian(cx, cy, innerR, startAngle);
  const eInner = polarToCartesian(cx, cy, innerR, endAngle);

  const sweep = ((endAngle - startAngle) % 360 + 360) % 360;
  const largeArc = sweep > 180 ? 1 : 0;

  // outer arc (clockwise), then line to inner, inner arc back, close
  return [
    `M ${sInner.x} ${sInner.y}`,
    `L ${sOuter.x} ${sOuter.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${eOuter.x} ${eOuter.y}`,
    `L ${eInner.x} ${eInner.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${sInner.x} ${sInner.y}`,
    "Z",
  ].join(" ");
}

export const LocationPuck = memo(function LocationPuck({
  heading = 0,
  showCone = true,
  coneAngleDeg = 70,
  size = 46,
  color = "#2F6BFF",
  coneOpacity = 0.22,
  style,
}: Props) {
  const h = ((heading % 360) + 360) % 360;
  const coneAngle = clamp(coneAngleDeg, 10, 140);

  const {
    vb,
    cx,
    cy,
    dotR,
    ringR,
    ringStroke,
    glowR,
    coneOuterR,
    coneInnerR,
  } = useMemo(() => {
    // Use a square viewBox. Scale geometry from size.
    const vb = 100;
    const cx = 50;
    const cy = 50;

    const dotR = 9.2;
    const ringR = 15.5;
    const ringStroke = 4.0;
    const glowR = 22;

    // cone behind dot
    const coneOuterR = 46;
    const coneInnerR = 14;

    return { vb, cx, cy, dotR, ringR, ringStroke, glowR, coneOuterR, coneInnerR };
  }, []);

  const conePath = useMemo(() => {
    const half = coneAngle / 2;
    const start = h - half;
    const end = h + half;
    return buildConePath(cx, cy, coneInnerR, coneOuterR, start, end);
  }, [h, coneAngle, cx, cy, coneInnerR, coneOuterR]);

  // A tiny direction nub (like the small notch on some UIs)
  const nubPath = useMemo(() => {
    // a small triangle pointing up, rotated with heading by wrapping in <G rotation>
    const topY = cy - ringR - 3;
    return `M ${cx} ${topY} L ${cx - 5} ${topY + 10} L ${cx + 5} ${topY + 10} Z`;
  }, [cx, cy, ringR]);

  return (
    <View style={[{ width: size, height: size }, style]}>
      <Svg
        width={size}
        height={size}
        viewBox={`0 0 ${vb} ${vb}`}
      >
        <Defs>
          <RadialGradient id="puckGlow" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <Stop offset="55%" stopColor={color} stopOpacity="0.12" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </RadialGradient>

          <RadialGradient id="dotGrad" cx="35%" cy="35%" r="75%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.95" />
            <Stop offset="35%" stopColor={color} stopOpacity="0.95" />
            <Stop offset="100%" stopColor={color} stopOpacity="1.0" />
          </RadialGradient>
        </Defs>

        {/* Cone (behind everything), rotated by heading */}
        {showCone && (
          <G origin={`${cx},${cy}`}>
            <Path d={conePath} fill={color} opacity={coneOpacity} />
          </G>
        )}

        {/* Soft glow */}
        <Circle cx={cx} cy={cy} r={glowR} fill="url(#puckGlow)" />

        {/* White ring */}
        <Circle
          cx={cx}
          cy={cy}
          r={ringR}
          fill="none"
          stroke="#FFFFFF"
          strokeWidth={ringStroke}
          opacity={0.95}
        />

        {/* Direction nub (optional), rotate with heading */}
        {showCone && (
          <G rotation={h} origin={`${cx},${cy}`}>
            <Path d={nubPath} fill="#FFFFFF" opacity={0.95} />
          </G>
        )}

        {/* Blue dot */}
        <Circle cx={cx} cy={cy} r={dotR} fill="url(#dotGrad)" />
        {/* tiny inner highlight */}
        <Circle cx={cx - 2.6} cy={cy - 3.0} r={2.2} fill="#FFFFFF" opacity={0.8} />
      </Svg>
    </View>
  );
});
