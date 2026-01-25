import * as React from "react";
import Svg, { Path } from "react-native-svg";

interface type {
  size?: number | 24,
  color?: string
}

const StopIcon: React.FC<type> = ({ color = '#111', size = 24 }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
  >
    <Path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={0.856}
      d="M15.355 3.502h-6.71a.4.4 0 0 0-.283.117L3.617 8.364a.4.4 0 0 0-.117.283v6.71a.4.4 0 0 0 .117.283l4.745 4.745a.4.4 0 0 0 .283.117h6.71a.4.4 0 0 0 .283-.117l4.745-4.745a.4.4 0 0 0 .117-.283v-6.71a.4.4 0 0 0-.117-.283l-4.745-4.745a.4.4 0 0 0-.283-.117"
    />
    <Path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={0.856}
      d="M8.057 11.168c-.082-.319-.437-.559-.861-.559-.486 0-.88.314-.88.7 0 .387.394.7.88.7l-.018.003c.485 0 .879.313.879.7s-.394.7-.88.7c-.424 0-.779-.24-.86-.559m3.14-2.242h1.6m-.8 0v2.8m5.66 0v-2.8h1.067a.697.697 0 1 1 0 1.394h-1.068m-2.588 1.406a1 1 0 0 1-1-1v-.8a1 1 0 0 1 2 0v.8a1 1 0 0 1-1 1"
    />
    <Path
      fill="#D22F27"
      d="M15.976 2H8.024a.4.4 0 0 0-.283.117L2.117 7.741A.4.4 0 0 0 2 8.024v7.952a.4.4 0 0 0 .117.283l5.624 5.624a.4.4 0 0 0 .283.117h7.952a.4.4 0 0 0 .283-.117l5.624-5.624a.4.4 0 0 0 .117-.283V8.024a.4.4 0 0 0-.117-.283l-5.624-5.624A.4.4 0 0 0 15.976 2"
    />
    <Path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={0.856}
      d="M15.355 3.502h-6.71a.4.4 0 0 0-.283.117L3.617 8.364a.4.4 0 0 0-.117.283v6.71a.4.4 0 0 0 .117.283l4.745 4.745a.4.4 0 0 0 .283.117h6.71a.4.4 0 0 0 .283-.117l4.745-4.745a.4.4 0 0 0 .117-.283v-6.71a.4.4 0 0 0-.117-.283l-4.745-4.745a.4.4 0 0 0-.283-.117"
    />
    <Path
      stroke="#fff"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={0.856}
      d="M8.057 11.168c-.082-.319-.437-.559-.861-.559-.486 0-.88.314-.88.7 0 .387.394.7.88.7l-.018.003c.485 0 .879.313.879.7s-.394.7-.88.7c-.424 0-.779-.24-.86-.559m3.14-2.242h1.6m-.8 0v2.8m5.66 0v-2.8h1.067a.697.697 0 1 1 0 1.394h-1.068m-2.588 1.406a1 1 0 0 1-1-1v-.8a1 1 0 0 1 2 0v.8a1 1 0 0 1-1 1"
    />
    <Path
      stroke="#000"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeMiterlimit={10}
      strokeWidth={0.856}
      d="M15.976 2H8.024a.4.4 0 0 0-.283.117L2.117 7.741A.4.4 0 0 0 2 8.024v7.952a.4.4 0 0 0 .117.283l5.624 5.624a.4.4 0 0 0 .283.117h7.952a.4.4 0 0 0 .283-.117l5.624-5.624a.4.4 0 0 0 .117-.283V8.024a.4.4 0 0 0-.117-.283l-5.624-5.624A.4.4 0 0 0 15.976 2"
    />
  </Svg>
);
export default StopIcon;