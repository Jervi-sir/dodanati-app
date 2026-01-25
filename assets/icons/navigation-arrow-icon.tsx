import * as React from "react";
import Svg, { Path, Circle } from "react-native-svg";

interface NavigationArrowIconProps {
  size?: number;
  color?: string;
}

const NavigationArrowIcon: React.FC<NavigationArrowIconProps> = ({ color = '#2563EB', size = 48 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Circle cx="12" cy="12" r="10" fill="white" stroke="white" strokeWidth="2" />
    <Path
      d="M12 3L4.5 20.5L12 17L19.5 20.5L12 3Z"
      fill={color}
    />
  </Svg>
);

export default NavigationArrowIcon;
