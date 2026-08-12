import React from 'react';
import Svg, { Path } from 'react-native-svg';

export function BrandIcon({ path, color, size = 22 }: { path: string; color: string; size?: number }) {
  return (
    <Svg viewBox="0 0 24 24" width={size} height={size}>
      <Path d={path} fill={color} />
    </Svg>
  );
}
