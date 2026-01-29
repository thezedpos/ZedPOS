"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X } from "lucide-react";

interface BarcodeScannerProps {
  onScan: (decodedText: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initialize Scanner with Formats (moved here)
    const scanner = new Html5Qrcode("reader", {
        formatsToSupport: [
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8,
            Html5QrcodeSupportedFormats.UPC_A,
            Html5QrcodeSupportedFormats.UPC_E,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.CODE_39,
        ],
        verbose: false
    });
    
    scannerRef.current = scanner;

    // 2. Start Scanner
    scanner
      .start(
        { facingMode: "environment" }, // Prefer back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 }, // Rectangular box for barcodes
          aspectRatio: 1.0,
          // formatsToSupport REMOVED from here (it caused the error)
        },
        (decodedText) => {
          // Success Callback
          onScan(decodedText);
          stopScanner(); // Stop immediately after scan
        },
        (errorMessage) => {
          // Ignore parse errors, they happen every frame
        }
      )
      .catch((err) => {
        setError("Could not start camera. Please check permissions.");
        console.error(err);
      });

    // Cleanup when component unmounts
    return () => {
      stopScanner();
    };
  }, []); // Run once on mount

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (err) {
        console.error("Failed to stop scanner", err);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className="p-4 flex justify-between items-center border-b border-gray-100">
          <h3 className="font-bold text-gray-900">Scan Barcode</h3>
          <button 
            onClick={() => { stopScanner(); onClose(); }}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Camera Viewport */}
        <div className="relative bg-black min-h-[300px] flex flex-col items-center justify-center">
          <div id="reader" className="w-full"></div>
          
          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 text-white p-6 text-center">
              <p>{error}</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="p-4 text-center text-sm text-gray-500 bg-gray-50">
          Point camera at a barcode to scan.
        </div>

      </div>
    </div>
  );
}