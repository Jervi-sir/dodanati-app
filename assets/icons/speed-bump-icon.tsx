import * as React from "react";
import Svg, { ClipPath, Defs, G, Path } from "react-native-svg";

interface type {
  type?: 'bump-1' | 'bump-2' | 'bump-3',
  size?: number | 24,
  color?: string
}

const SpeedBumpIcon: React.FC<type> = ({ type = 'bump-1', color = '#111', size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    {type === 'bump-1'
      &&
      <Path
        fill={color}
        d="M0 16h24v1.6H0zm12-8a7.19 7.19 0 0 1 7.2 7.2H4.8A7.19 7.19 0 0 1 12 8"
      />
    }

    {type === 'bump-2'
      &&
      <>
        <G clipPath="url(#a)">
          <Path
            fill="#ED171F"
            d="M13.389 3.842a1.61 1.61 0 0 0-1.395-.817c-.571 0-1.103.312-1.392.814L2.237 18.54c-.14.248-.214.531-.214.82 0 .902.72 1.632 1.61 1.632h16.722c.892 0 1.612-.73 1.612-1.633 0-.285-.076-.568-.217-.816z"
          />
          <Path fill="#FEB82F" d="m4.06 19.113 7.93-13.945 7.935 13.945z" />
          <Path
            fill="#000"
            d="M11.993 18.486h6.145V16.85h-.669a2.5 2.5 0 0 1-.456-.048 1.09 1.09 0 0 1-.635-.5 11 11 0 0 0-.175-.345 5 5 0 0 0-.343-.646 1.31 1.31 0 0 0-1.091-.596c-.439 0-.85.223-1.091.594l-.844 1.213a1.07 1.07 0 0 1-.841.454 1.08 1.08 0 0 1-.84-.451l-.842-1.216a1.31 1.31 0 0 0-1.091-.594c-.439 0-.847.223-1.091.594a3.6 3.6 0 0 0-.273.5l-.175.347c-.21.389-.438.569-.705.646a2.5 2.5 0 0 1-.456.048h-.672v1.636z"
          />
        </G>
        <Defs>
          <ClipPath id="a">
            <Path fill="#fff" d="M2 3h20v18H2z" />
          </ClipPath>
        </Defs>

      </>
    }

  </Svg>
);
export default SpeedBumpIcon;