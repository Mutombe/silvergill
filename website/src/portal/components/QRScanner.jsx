import React, { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, CameraOff, Keyboard, Check } from 'lucide-react';
import { Button, Input, Field } from './ui';

/**
 * QR / barcode scanning for shipment and container codes.
 *
 * Uses the browser's native BarcodeDetector where it exists (Chrome, Edge and
 * Android WebView — which covers the handsets field staff actually carry). Any
 * browser without it, or any device that refuses camera permission, falls back
 * to keyed entry so the workflow is never blocked.
 */
const QRScanner = ({ onScan, expectedPrefix = 'SHP-', hint = 'Point at the shipment label' }) => {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const rafRef = useRef(null);
  const detectorRef = useRef(null);

  const [state, setState] = useState('idle'); // idle | starting | scanning | unsupported | denied
  const [manual, setManual] = useState('');
  const [lastCode, setLastCode] = useState(null);

  const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setState('idle');
  }, []);

  // Always release the camera when the component goes away.
  useEffect(() => stop, [stop]);

  // A hoisted declaration rather than a memoised const: the scan loop
  // re-schedules itself, and a `const tick = useCallback(…)` referencing `tick`
  // from inside its own initializer is a temporal-dead-zone hazard.
  async function tick() {
    const video = videoRef.current;
    if (!video || !detectorRef.current || video.readyState < 2) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    try {
      const codes = await detectorRef.current.detect(video);
      if (codes.length) {
        const value = codes[0].rawValue;
        setLastCode(value);
        onScan?.(value);
        stop();
        return;
      }
    } catch {
      // A single failed frame is not fatal — keep scanning.
    }
    rafRef.current = requestAnimationFrame(tick);
  }

  const start = async () => {
    if (!supported) {
      setState('unsupported');
      return;
    }
    setState('starting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      detectorRef.current = new window.BarcodeDetector({
        formats: ['qr_code', 'code_128', 'code_39', 'ean_13'],
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setState('scanning');
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setState('denied');
    }
  };

  const submitManual = () => {
    const code = manual.trim().toUpperCase();
    if (!code) return;
    setLastCode(code);
    onScan?.(code);
    setManual('');
  };

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden bg-silver-900 aspect-[4/3]">
        <video
          ref={videoRef}
          playsInline
          muted
          className={`w-full h-full object-cover ${state === 'scanning' ? '' : 'hidden'}`}
        />

        {state === 'scanning' && (
          <>
            {/* Reticle */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-48 h-48 border-2 border-white/80 rounded-2xl relative">
                <span className="absolute -top-px -left-px w-8 h-8 border-t-4 border-l-4 border-primary-400 rounded-tl-2xl" />
                <span className="absolute -top-px -right-px w-8 h-8 border-t-4 border-r-4 border-primary-400 rounded-tr-2xl" />
                <span className="absolute -bottom-px -left-px w-8 h-8 border-b-4 border-l-4 border-primary-400 rounded-bl-2xl" />
                <span className="absolute -bottom-px -right-px w-8 h-8 border-b-4 border-r-4 border-primary-400 rounded-br-2xl" />
              </div>
            </div>
            <p className="absolute bottom-3 inset-x-0 text-center text-xs text-white/80">{hint}</p>
          </>
        )}

        {state !== 'scanning' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            {state === 'denied' ? (
              <>
                <CameraOff size={26} className="text-white/60 mb-3" />
                <p className="text-sm text-white/80 mb-1">Camera unavailable</p>
                <p className="text-xs text-white/50 max-w-xs">
                  Permission was refused or no camera was found. Key the code in below instead.
                </p>
              </>
            ) : state === 'unsupported' ? (
              <>
                <CameraOff size={26} className="text-white/60 mb-3" />
                <p className="text-sm text-white/80 mb-1">Scanning not supported here</p>
                <p className="text-xs text-white/50 max-w-xs">
                  This browser has no barcode detector. Use Chrome on the handset, or key the code in.
                </p>
              </>
            ) : (
              <>
                <QrCode size={30} className="text-white/70 mb-3" />
                <p className="text-sm text-white/80 mb-4">Scan a shipment, container or seal</p>
                <Button size="sm" variant="primary" onClick={start} disabled={state === 'starting'}>
                  {state === 'starting' ? 'Starting camera…' : 'Open camera'}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {state === 'scanning' && (
        <Button size="sm" variant="secondary" className="mt-3 w-full" onClick={stop}>
          Stop scanning
        </Button>
      )}

      {lastCode && (
        <div className="mt-3 flex items-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-800">
          <Check size={15} />
          Scanned <span className="font-semibold tabular-nums">{lastCode}</span>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-silver-200">
        <Field label="Or key the code in" hint={`Shipment codes look like ${expectedPrefix}24118`}>
          <div className="flex gap-2">
            <Input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              placeholder={`${expectedPrefix}24118`}
            />
            <Button variant="secondary" icon={Keyboard} onClick={submitManual}>
              Use
            </Button>
          </div>
        </Field>
      </div>
    </div>
  );
};

export default QRScanner;
