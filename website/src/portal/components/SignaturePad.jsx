import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Eraser, PenLine } from 'lucide-react';

/**
 * Canvas signature capture for driver / consignee sign-off.
 * Handles mouse and touch, and survives device-pixel-ratio scaling so the
 * stored PNG is crisp on a phone.
 */
const SignaturePad = ({ onChange, height = 180, label = 'Sign inside the box' }) => {
  const canvasRef = useRef(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);

  const setupCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = height * ratio;
    const ctx = canvas.getContext('2d');
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  }, [height]);

  useEffect(() => {
    setupCanvas();
    window.addEventListener('resize', setupCanvas);
    return () => window.removeEventListener('resize', setupCanvas);
  }, [setupCanvas]);

  const pointFrom = (event) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const source = event.touches ? event.touches[0] : event;
    return { x: source.clientX - rect.left, y: source.clientY - rect.top };
  };

  const start = (event) => {
    event.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pointFrom(event);
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const move = (event) => {
    if (!drawing.current) return;
    event.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const { x, y } = pointFrom(event);
    ctx.lineTo(x, y);
    ctx.stroke();
    if (!hasInk) setHasInk(true);
  };

  const end = () => {
    if (!drawing.current) return;
    drawing.current = false;
    onChange?.(canvasRef.current.toDataURL('image/png'));
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasInk(false);
    onChange?.(null);
  };

  return (
    <div>
      <div className="relative rounded-xl border-2 border-dashed border-silver-300 bg-silver-50 overflow-hidden">
        <canvas
          ref={canvasRef}
          style={{ width: '100%', height, touchAction: 'none', display: 'block' }}
          onMouseDown={start}
          onMouseMove={move}
          onMouseUp={end}
          onMouseLeave={end}
          onTouchStart={start}
          onTouchMove={move}
          onTouchEnd={end}
        />
        {!hasInk && (
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-silver-400">
            <PenLine size={22} className="mb-2" />
            <p className="text-sm">{label}</p>
          </div>
        )}
      </div>
      <div className="flex justify-between items-center mt-2">
        <p className="text-xs text-silver-400">
          {hasInk ? 'Signature captured.' : 'Use a finger, stylus or mouse.'}
        </p>
        <button
          type="button"
          onClick={clear}
          disabled={!hasInk}
          className="inline-flex items-center gap-1.5 text-xs text-silver-500 hover:text-red-600 disabled:opacity-40 transition-colors"
        >
          <Eraser size={13} />
          Clear
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
