import React from "react";

export function ApertureMark({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="4" stroke="#0F5C5E" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="1.4" fill="#0F5C5E" />
    </svg>
  );
}
