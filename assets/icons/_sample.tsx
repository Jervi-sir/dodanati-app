import * as React from "react";
import Svg, { Path } from "react-native-svg";

interface type {
  type?: 'test',
  size?: number | 24,
  color?: string
}

const SampleIcon: React.FC<type> = ({ type = 'test', color = '#111', size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    {type === 'test'
      &&
      <>

      </>
    }
  </Svg>
);
export default SampleIcon;