'use client';

const HEX_COLOR_REGEX = /^#([0-9a-f]{3}){1,2}$/i;

export const isValidHexColor = (value) => HEX_COLOR_REGEX.test(`${value ?? ''}`);

export const normalizeHexColor = (value) => {
  if (!isValidHexColor(value)) return null;

  let sanitized = value.replace('#', '');

  if (sanitized.length === 3) {
    sanitized = sanitized
      .split('')
      .map((char) => char + char)
      .join('');
  }

  return `#${sanitized.toLowerCase()}`;
};

export const hexToRgb = (hex) => {
  const normalized = normalizeHexColor(hex);
  if (!normalized) return null;

  const sanitized = normalized.replace('#', '');
  const intValue = parseInt(sanitized, 16);

  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255
  };
};

const toLinear = (value) => {
  const channel = value / 255;
  return channel <= 0.03928
    ? channel / 12.92
    : Math.pow((channel + 0.055) / 1.055, 2.4);
};

export const getRelativeLuminance = (hex) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const r = toLinear(rgb.r);
  const g = toLinear(rgb.g);
  const b = toLinear(rgb.b);

  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const getContrastingTextColor = (
  hex,
  { light = '#f9fafb', dark = '#111827', threshold = 0.55 } = {}
) => {
  const luminance = getRelativeLuminance(hex);
  return luminance > threshold ? dark : light;
};

export const getBorderColorFromHex = (hex, alpha = 0.4) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};
