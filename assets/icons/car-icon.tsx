import * as React from "react";
import Svg, { Path } from "react-native-svg";

interface type {
  size?: number | 24,
  color?: string
}

const CarIcon: React.FC<type> = ({ color = '#111', size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Path
      fill={color}
      d="M7.47 6.802 6.492 9.6h11.017l-.979-2.798A1.2 1.2 0 0 0 15.398 6H8.603a1.2 1.2 0 0 0-1.133.802M3.885 9.78l1.32-3.77A3.6 3.6 0 0 1 8.603 3.6h6.795a3.6 3.6 0 0 1 3.397 2.41l1.32 3.77A2.405 2.405 0 0 1 21.6 12v7.2c0 .663-.536 1.2-1.2 1.2h-1.2c-.663 0-1.2-.537-1.2-1.2V18H6v1.2c0 .663-.536 1.2-1.2 1.2H3.6c-.663 0-1.2-.537-1.2-1.2V12c0-1.002.615-1.86 1.485-2.22M7.2 13.8c0-.664-.536-1.2-1.2-1.2s-1.2.536-1.2 1.2S5.337 15 6 15c.664 0 1.2-.537 1.2-1.2M18 15a1.199 1.199 0 1 0-1.2-1.2c0 .663.537 1.2 1.2 1.2"
    />
  </Svg>
);
export default CarIcon;