"use client";

import { useEffect, useState } from "react";

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
}

/**
 * Generates and displays a QR code as an image.
 * Uses the `qrcode` library to generate a data URL on the client.
 */
export default function QRCodeDisplay({ value, size = 200, className = "" }: QRCodeDisplayProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    import("qrcode").then((QRCode) => {
      QRCode.toDataURL(value, {
        width: size,
        margin: 2,
        color: { dark: "#1A1A2E", light: "#FFFFFF" },
        errorCorrectionLevel: "M",
      }).then((url: string) => {
        if (!cancelled) setDataUrl(url);
      });
    });
    return () => { cancelled = true; };
  }, [value, size]);

  if (!dataUrl) {
    return (
      <div
        className={`skeleton rounded-xl ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code"
      width={size}
      height={size}
      className={`rounded-xl ${className}`}
    />
  );
}
