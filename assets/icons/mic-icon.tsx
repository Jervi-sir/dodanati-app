import * as React from 'react';
import Svg, { Path, SvgProps } from 'react-native-svg';

const MicIcon = (props: SvgProps & { size?: number, color?: string }) => {
  const { size = 24, color = "currentColor", ...rest } = props;
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...rest}>
      <Path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Path d="M12 19v4" />
      <Path d="M8 23h8" />
    </Svg>
  );
};

export default MicIcon;
