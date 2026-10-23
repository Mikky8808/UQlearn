import React, { useRef, useState, useEffect, useCallback } from 'react';
import { 
  Trash2, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  PenTool, 
  Award, 
  Loader2, 
  AlertCircle,
  Eye,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { fetchSignatureApi, saveSignatureApi } from '../../lib/apiConfig';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface SignaturePadProps {
  userId?: string;
  initialSignature?: string;
  onSave?: (signatureData: string) => void;
  title?: string;
  subtitle?: string;
  signerName?: string;
  signerTitle?: string;
}

export const SignaturePad: React.FC<SignaturePadProps> = ({
  userId = 'ceo',
  initialSignature,
  onSave,
  title = 'Digital Signature Pad',
  subtitle = 'Draw your official legal signature using your mouse, trackpad, or touch screen.',
  signerName = 'Sir Rajab Wamuu',
  signerTitle = 'CEO UQlearn'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Customization options
  const [penColor, setPenColor] = useState<string>('#0f172a'); // Default Onyx Ink
  const [penWidth, setPenWidth] = useState<number>(2.5); // Default 2.5px
  
  // Storage and status states
  const [currentSavedSignature, setCurrentSavedSignature] = useState<string | null>(initialSignature || null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Pre-load current signature from /api/v1/signatures.php on mount
  useEffect(() => {
    let isMounted = true;
    const loadSaved = async () => {
      if (initialSignature) {
        setCurrentSavedSignature(initialSignature);
        return;
      }
      if (!userId) return;

      setIsLoading(true);
      try {
        const res = await fetchSignatureApi(userId);
        if (isMounted && res && res.success && res.signatureData) {
          setCurrentSavedSignature(res.signatureData);
        }
      } catch (err) {
        console.warn('Signature loading warning:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadSaved();
    return () => {
      isMounted = false;
    };
  }, [userId, initialSignature]);

  // Adjust canvas resolution for crisp Retina/High-DPI display
  const syncCanvasDimensions = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
      redrawCanvas(strokes, currentStroke, ctx, rect.width, rect.height);
    }
  }, [strokes, currentStroke]);

  useEffect(() => {
    syncCanvasDimensions();
    window.addEventListener('resize', syncCanvasDimensions);
    return () => window.removeEventListener('resize', syncCanvasDimensions);
  }, [syncCanvasDimensions]);

  // Redraw helper that renders strokes with quadratic bezier curves for handwriting realism
  const redrawCanvas = (
    allStrokes: Stroke[],
    liveStroke: Point[] | null,
    context?: CanvasRenderingContext2D,
    width?: number,
    height?: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = context || canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = width || canvas.width / dpr;
    const h = height || canvas.height / dpr;

    ctx.clearRect(0, 0, w, h);

    // Draw guidelines
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, h - 35);
    ctx.lineTo(w - 30, h - 35);
    ctx.stroke();
    ctx.restore();

    const drawSingleStroke = (points: Point[], color: string, strokeWidth: number) => {
      if (points.length === 0) return;

      ctx.save();
      ctx.strokeStyle = color;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (points.length === 1) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, strokeWidth / 2, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);

      for (let i = 1; i < points.length - 1; i++) {
        const xc = (points[i].x + points[i + 1].x) / 2;
        const yc = (points[i].y + points[i + 1].y) / 2;
        ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
      }

      // Curve through the last point
      if (points.length > 1) {
        const last = points[points.length - 1];
        const prev = points[points.length - 2];
        ctx.quadraticCurveTo(prev.x, prev.y, last.x, last.y);
      }

      ctx.stroke();
      ctx.restore();
    };

    allStrokes.forEach((s) => drawSingleStroke(s.points, s.color, s.width));

    if (liveStroke && liveStroke.length > 0) {
      drawSingleStroke(liveStroke, penColor, penWidth);
    }
  };

  const getCanvasCoordinates = (e: React.PointerEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    canvasRef.current?.setPointerCapture(e.pointerId);
    const point = getCanvasCoordinates(e);
    setIsDrawing(true);
    setCurrentStroke([point]);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();
    const point = getCanvasCoordinates(e);
    const updated = [...currentStroke, point];
    setCurrentStroke(updated);

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) redrawCanvas(strokes, updated, ctx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentStroke) return;
    e.preventDefault();
    setIsDrawing(false);

    if (currentStroke.length > 0) {
      const newStroke: Stroke = {
        points: currentStroke,
        color: penColor,
        width: penWidth
      };
      const updatedAll = [...strokes, newStroke];
      setStrokes(updatedAll);
      setCurrentStroke(null);

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) redrawCanvas(updatedAll, null, ctx);
      }
    }
  };

  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke(null);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        redrawCanvas([], null, ctx, canvas.width / dpr, canvas.height / dpr);
      }
    }
    setStatusMessage(null);
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const dpr = window.devicePixelRatio || 1;
        redrawCanvas(updated, null, ctx, canvas.width / dpr, canvas.height / dpr);
      }
    }
  };

  // Convert canvas drawing to high-quality transparent PNG and persist via /api/v1/signatures.php
  const handleSaveSignature = async () => {
    if (strokes.length === 0) {
      setStatusMessage({ text: 'Please draw your signature before saving.', type: 'error' });
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setIsSaving(true);
    setStatusMessage(null);

    try {
      // Export at pristine resolution
      const dataUrl = canvas.toDataURL('image/png');

      // 1. Save to central database via /api/v1/signatures.php
      const result = await saveSignatureApi(userId, dataUrl);

      // 2. Update local state & trigger parent callback
      setCurrentSavedSignature(dataUrl);
      if (onSave) {
        onSave(dataUrl);
      }

      setStatusMessage({
        text: 'Signature saved successfully and ready for certificates!',
        type: 'success'
      });
      setTimeout(() => setStatusMessage(null), 5000);
    } catch (err: any) {
      console.error('Signature save error:', err);
      setStatusMessage({
        text: 'Failed to save signature: ' + (err.message || 'Network error'),
        type: 'error'
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} className="space-y-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <PenTool className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-slate-100">
              {title}
            </h3>
          </div>
          {subtitle ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {subtitle}
            </p>
          ) : null}
        </div>

        {/* Status indicator */}
        <div className="flex items-center space-x-2 text-xs">
          {isLoading ? (
            <span className="inline-flex items-center space-x-1.5 text-slate-500 font-bold">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Fetching from API...</span>
            </span>
          ) : currentSavedSignature ? (
            <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-xl border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Signature Active in DB</span>
            </span>
          ) : (
            <span className="inline-flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-xl border border-amber-200 dark:border-amber-800">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>No Signature Stored Yet</span>
            </span>
          )}
        </div>
      </div>

      {/* Main Canvas Drawing Area */}
      <div className="space-y-3">
        <div className="relative border-2 border-slate-200 dark:border-slate-700 rounded-2xl overflow-hidden bg-white shadow-inner select-none transition-all focus-within:border-indigo-500">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-52 sm:h-56 cursor-crosshair touch-none block"
            style={{ touchAction: 'none' }}
          />

          {/* Guide Overlay text */}
          <div className="absolute bottom-2 left-6 right-6 pointer-events-none flex items-center justify-between text-[11px] font-bold text-slate-400/80">
            <span>Sign above line</span>
            <span className="uppercase tracking-widest text-[10px]">{signerName} • {signerTitle}</span>
          </div>

          {strokes.length === 0 && !isDrawing && (
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center text-slate-300 dark:text-slate-600 space-y-1">
              <PenTool className="w-7 h-7 stroke-1" />
              <span className="text-xs font-bold">Draw your signature here</span>
            </div>
          )}
        </div>
      </div>

      {/* Drawing Toolbar (Pen Colors & Stroke Width) */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
        
        {/* Ink Color Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Ink:</span>
          {[
            { color: '#0f172a', label: 'Onyx Black' },
            { color: '#1e3a8a', label: 'Royal Navy' },
            { color: '#334155', label: 'Dark Charcoal' }
          ].map((c) => (
            <button
              key={c.color}
              type="button"
              onClick={() => setPenColor(c.color)}
              title={c.label}
              className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                penColor === c.color ? 'scale-110 ring-2 ring-indigo-500 ring-offset-2' : 'border-slate-300 opacity-80 hover:opacity-100'
              }`}
              style={{ backgroundColor: c.color }}
            />
          ))}
        </div>

        {/* Pen Width Selection */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Stroke:</span>
          {[
            { width: 1.5, label: 'Fine' },
            { width: 2.5, label: 'Normal' },
            { width: 4.0, label: 'Bold' }
          ].map((w) => (
            <button
              key={w.width}
              type="button"
              onClick={() => setPenWidth(w.width)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                penWidth === w.width 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>

        {/* Action Buttons: Undo & Clear */}
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleUndo}
            disabled={strokes.length === 0}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 disabled:opacity-40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer transition-colors"
            title="Undo last stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Undo</span>
          </button>

          <button
            type="button"
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="p-2 bg-white dark:bg-slate-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400 disabled:opacity-40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 flex items-center space-x-1 cursor-pointer transition-colors"
            title="Clear canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Clear</span>
          </button>
        </div>
      </div>

      {/* Notification status message */}
      {statusMessage && (
        <div className={`p-3.5 rounded-xl border text-xs font-bold flex items-center space-x-2 animate-fadeIn ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 text-emerald-800 dark:text-emerald-300'
            : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 text-rose-800 dark:text-rose-300'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Save Button */}
      <div className="flex justify-end pt-1">
        <button
          type="button"
          onClick={handleSaveSignature}
          disabled={isSaving || strokes.length === 0}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-black rounded-xl text-xs flex items-center space-x-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Saving Signature...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Official Signature</span>
            </>
          )}
        </button>
      </div>

      {/* Live Preview of Current Signature in Database & Certificate Mockup */}
      {currentSavedSignature && (
        <div className="mt-4 pt-5 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-slate-800 dark:text-slate-200 flex items-center space-x-2">
              <Eye className="w-4 h-4 text-teal-600" />
              <span>Current Stored Signature Preview</span>
            </span>
            <span className="text-[10px] font-bold text-slate-400">Directly rendered on Certificates</span>
          </div>

          <div className="p-5 bg-gradient-to-b from-[#FFFDF9] to-[#FDFBF7] border border-amber-200/80 rounded-2xl shadow-xs flex flex-col items-center justify-center text-center space-y-2">
            <div className="h-20 flex items-center justify-center">
              <img
                src={currentSavedSignature}
                alt="Stored Signature"
                className="max-h-20 max-w-full object-contain filter contrast-125"
              />
            </div>
            <div className="w-48 border-t-2 border-slate-800 pt-1">
              <p className="text-xs font-black text-slate-900 tracking-wide uppercase">{signerName}</p>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{signerTitle}</p>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
