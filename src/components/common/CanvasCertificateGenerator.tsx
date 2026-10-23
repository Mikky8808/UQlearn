import React, { useEffect, useRef, useState } from 'react';
import { Download, Printer, Award, X, FileText } from 'lucide-react';
import { resolveBrandingLogoUrl } from '../../lib/branding';
import { useApp } from '../../context/AppContext';
import { fetchSignatureApi } from '../../lib/apiConfig';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';

interface CanvasCertificateGeneratorProps {
  isOpen: boolean;
  onClose: () => void;
  certificateData: {
    studentName: string;
    courseTitle: string;
    completionDate: string;
    instructorName: string;
    instructorSignature?: string;
    credentialId: string;
    instructorId?: string;
  };
}

/**
 * UQlearn Certificate
 *
 * The certificate is rendered at 1600 x 1125 so the exported PNG/PDF
 * stays sharp while preserving the landscape proportions of the reference.
 *
 * Fixed:
 * - UQlearn logo position
 * - Certificate wording/layout
 * - CEO name/title/signature
 * - Gold wave decoration
 *
 * Dynamic:
 * - Student name
 * - Course title
 * - Completion date
 * - Instructor name
 * - Instructor signature
 * - Credential/verification QR
 */
export const CanvasCertificateGenerator: React.FC<CanvasCertificateGeneratorProps> = ({
  isOpen,
  onClose,
  certificateData
}) => {
  const { logoUrl, courseConfig } = useApp();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // CEO & Instructor signature states loaded dynamically from /api/v1/signatures.php
  const cachedCeoSig = typeof localStorage !== 'undefined' ? localStorage.getItem('uq_sig_ceo') || '' : '';
  const [liveCeoSignature, setLiveCeoSignature] = useState<string>(courseConfig.ceoSignature || cachedCeoSig || '');
  const [liveInstructorSignature, setLiveInstructorSignature] = useState<string>(certificateData.instructorSignature || '');

  // Dynamically fetch latest signatures from /api/v1/signatures.php on certificate modal open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Fetch CEO signature dynamically
    fetchSignatureApi('ceo').then((res) => {
      if (res && res.signatureData) {
        setLiveCeoSignature(res.signatureData);
      }
    }).catch((e) => console.warn('Could not dynamically fetch CEO signature:', e));

    // 2. Fetch Instructor signature dynamically if instructorId provided
    if (certificateData.instructorId) {
      fetchSignatureApi(certificateData.instructorId).then((res) => {
        if (res && res.signatureData) {
          setLiveInstructorSignature(res.signatureData);
        }
      }).catch((e) => console.warn('Could not dynamically fetch instructor signature:', e));
    }
  }, [isOpen, certificateData.instructorId]);

  const CEO_NAME = courseConfig.ceoName || 'SIR, RAJAB WAMUU';
  const CEO_TITLE = courseConfig.ceoTitle || 'CEO UQLEARN';
  const CEO_SIGNATURE_URL = liveCeoSignature || courseConfig.ceoSignature || cachedCeoSig || '';
  const INSTRUCTOR_SIGNATURE_URL = liveInstructorSignature || certificateData.instructorSignature || '';

  const WIDTH = 1600;
  const HEIGHT = 1125;

  useEffect(() => {
    if (!isOpen) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // -----------------------------
    // Palette from the reference
    // -----------------------------
    const PAPER = '#FFFCF5';
    const INK = '#111111';
    const GOLD = '#E8C95D';
    const GOLD_LIGHT = '#F4E7A9';

    // Reset
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    ctx.fillStyle = PAPER;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    // -----------------------------
    // Helpers
    // -----------------------------
    const centerText = (
      text: string,
      y: number,
      font: string,
      fill = INK
    ) => {
      ctx.save();
      ctx.font = font;
      ctx.fillStyle = fill;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(text, WIDTH / 2, y);
      ctx.restore();
    };

    const fitText = (
      text: string,
      maxWidth: number,
      startSize: number,
      family = 'Arial'
    ) => {
      let size = startSize;
      while (size > 22) {
        ctx.font = `500 ${size}px ${family}`;
        if (ctx.measureText(text).width <= maxWidth) return size;
        size -= 1;
      }
      return size;
    };

    const drawWave = (
      side: 'left' | 'right',
      yOffset: number,
      opacity: number,
      amplitude: number,
      spacing: number
    ) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.strokeStyle = GOLD;
      ctx.lineWidth = 1.35;

      for (let i = 0; i < 13; i++) {
        ctx.beginPath();

        const startX = side === 'left' ? -80 : WIDTH + 80;
        const endX = side === 'left' ? 850 : WIDTH - 850;
        const baseY = yOffset + i * spacing;

        if (side === 'left') {
          ctx.moveTo(startX, baseY);
          ctx.bezierCurveTo(
            100, baseY + amplitude,
            90, baseY - amplitude * 1.4,
            330, baseY - amplitude * 0.5
          );
          ctx.bezierCurveTo(
            570, baseY + amplitude * 0.7,
            590, baseY - amplitude * 0.8,
            endX,
            baseY
          );
        } else {
          ctx.moveTo(startX, baseY);
          ctx.bezierCurveTo(
            WIDTH - 100, baseY + amplitude,
            WIDTH - 90, baseY - amplitude * 1.4,
            WIDTH - 330, baseY - amplitude * 0.5
          );
          ctx.bezierCurveTo(
            WIDTH - 570, baseY + amplitude * 0.7,
            WIDTH - 590, baseY - amplitude * 0.8,
            endX,
            baseY
          );
        }

        ctx.stroke();
      }

      ctx.restore();
    };

    const drawSignatureText = (name: string, x: number, y: number) => {
      ctx.save();
      ctx.font = 'italic 31px "Brush Script MT", "Segoe Script", cursive';
      ctx.fillStyle = '#161616';
      ctx.textAlign = 'center';
      ctx.fillText(name, x, y);
      ctx.restore();
    };

    const drawImageCover = (
      img: HTMLImageElement,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      const ratio = Math.max(w / img.width, h / img.height);
      const sw = w / ratio;
      const sh = h / ratio;
      const sx = (img.width - sw) / 2;
      const sy = (img.height - sh) / 2;
      ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
    };

    const drawImageContain = (
      img: HTMLImageElement,
      x: number,
      y: number,
      w: number,
      h: number
    ) => {
      const ratio = Math.min(w / img.width, h / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    };

    // -----------------------------
    // Background
    // -----------------------------
    drawWave('left', 455, 0.48, 115, 9);
    drawWave('right', 380, 0.40, 125, 9);

    // Very soft central decorative wave.
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = GOLD_LIGHT;
    ctx.lineWidth = 1.2;

    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      ctx.moveTo(480, 590 + i * 9);
      ctx.bezierCurveTo(
        620, 510 + i * 8,
        690, 700 + i * 8,
        820, 600 + i * 8
      );
      ctx.bezierCurveTo(
        950, 500 + i * 8,
        1060, 680 + i * 8,
        1220, 590 + i * 8
      );
      ctx.stroke();
    }
    ctx.restore();

    // -----------------------------
    // Logo on top of CERTIFICATE OF COMPLETION
    // -----------------------------
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous'; // Necessary for canvas security (taint-free)
    const fullLogoUrl = resolveBrandingLogoUrl(logoUrl);
    // Add cache buster to force fresh fetch
    const timestamp = new Date().getTime();
    const separator = fullLogoUrl.includes('?') ? '&' : '?';
    logoImg.src = `${fullLogoUrl}${separator}_=${timestamp}`;

    logoImg.onload = () => {
      console.log('Logo loaded successfully');
      ctx.save();
      const logoW = 150;
      const logoH = 55;
      drawImageContain(
        logoImg,
        WIDTH / 2 - logoW / 2,
        80,
        logoW,
        logoH
      );
      ctx.restore();

      drawCertificateContent();
    };

    logoImg.onerror = (e) => {
      console.error('Logo failed to load', e);
      drawCertificateContent();
    };

    // -----------------------------
    // Main certificate content
    // -----------------------------
    function drawCertificateContent() {
      // Certificate heading
      centerText(
        'CERTIFICATE',
        170,
        '400 82px Georgia, "Times New Roman", serif'
      );

      centerText(
        'OF COMPLETION',
        230,
        '400 34px Georgia, "Times New Roman", serif'
      );

      // Recipient label
      centerText(
        'PROUDLY PRESENTED TO:',
        390,
        '400 32px Georgia, "Times New Roman", serif'
      );

      // Student name
      const studentSize = fitText(
        certificateData.studentName || 'Student Name',
        950,
        78,
        'Arial'
      );

      centerText(
        certificateData.studentName || 'Student Name',
        485,
        `400 ${studentSize}px Arial, Helvetica, sans-serif`
      );

      // Divider below name
      ctx.save();
      ctx.strokeStyle = '#1A1A1A';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(210, 515);
      ctx.lineTo(1390, 515);
      ctx.stroke();
      ctx.restore();

      // Completion wording
      centerText(
        'In Recognition of Successfully Completing',
        575,
        '400 28px Arial, Helvetica, sans-serif'
      );

      // Course title — dynamic and fitted
      const courseSize = fitText(
        certificateData.courseTitle || 'Course Title',
        1050,
        34,
        'Arial'
      );

      centerText(
        certificateData.courseTitle || 'Course Title',
        635,
        `700 ${courseSize}px Arial, Helvetica, sans-serif`
      );

      // Dynamic completion date
      centerText(
        `on ${certificateData.completionDate || 'Completion Date'}.`,
        675,
        '700 27px Arial, Helvetica, sans-serif'
      );

      // -----------------------------
      // Bottom signatures
      // -----------------------------
      const signatureY = 880;
      const signatureLineY = 920;
      const labelY = 945;
      const titleY = 970;

      const leftX = 400; // Instructor position
      const rightX = 1200; // CEO position

      ctx.save();
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1.2;

      // Instructor signature line
      ctx.beginPath();
      ctx.moveTo(leftX - 150, signatureLineY);
      ctx.lineTo(leftX + 150, signatureLineY);
      ctx.stroke();

      // CEO signature line
      ctx.beginPath();
      ctx.moveTo(rightX - 150, signatureLineY);
      ctx.lineTo(rightX + 150, signatureLineY);
      ctx.stroke();

      ctx.restore();

      // Helper to draw signature text
      const drawSignatureText = (text: string, x: number, y: number) => {
        ctx.save();
        ctx.font = 'italic 30px "Dancing Script", cursive, Arial'; // Stylish signature font
        ctx.fillStyle = INK;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.restore();
      };

      // Helper to draw signature labels
      const drawSignatureLabel = (text: string, x: number, y: number, isTitle: boolean = false) => {
        ctx.save();
        ctx.font = isTitle ? '400 15px Arial, Helvetica, sans-serif' : '700 18px Arial, Helvetica, sans-serif';
        ctx.fillStyle = isTitle ? '#555555' : INK;
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.restore();
      };

      // 1. Instructor Signature/Name
      if (INSTRUCTOR_SIGNATURE_URL) {
        const instructorSignatureImg = new Image();
        instructorSignatureImg.crossOrigin = 'anonymous'; // Required for canvas
        const timestamp = new Date().getTime();
        const separator = INSTRUCTOR_SIGNATURE_URL.includes('?') ? '&' : '?';
        instructorSignatureImg.src = `${INSTRUCTOR_SIGNATURE_URL}${separator}_=${timestamp}`;

        instructorSignatureImg.onload = () => {
          console.log('Instructor signature loaded');
          ctx.save();
          drawImageCover(
            instructorSignatureImg,
            leftX - 135,
            signatureY - 80,
            270,
            80
          );
          ctx.restore();
          
          drawSignatureLabel(certificateData.instructorName || 'Instructor', leftX, labelY);
          drawSignatureLabel('COURSE INSTRUCTOR', leftX, titleY, true);
        };

        instructorSignatureImg.onerror = (e) => {
          console.error('Instructor signature failed to load', e);
          drawSignatureLabel(certificateData.instructorName || 'Instructor', leftX, labelY);
          drawSignatureLabel('COURSE INSTRUCTOR', leftX, titleY, true);
        };
      } else {
        drawSignatureLabel(certificateData.instructorName || 'Instructor', leftX, labelY);
        drawSignatureLabel('COURSE INSTRUCTOR', leftX, titleY, true);
      }

      // 2. CEO Signature/Name
      if (CEO_SIGNATURE_URL) {
        const ceoSignatureImg = new Image();
        ceoSignatureImg.crossOrigin = 'anonymous'; // Required for canvas
        const timestamp = new Date().getTime();
        const separator = CEO_SIGNATURE_URL.includes('?') ? '&' : '?';
        ceoSignatureImg.src = `${CEO_SIGNATURE_URL}${separator}_=${timestamp}`;

        ceoSignatureImg.onload = () => {
          console.log('CEO signature loaded');
          ctx.save();
          drawImageCover(
            ceoSignatureImg,
            rightX - 135,
            signatureY - 80,
            270,
            80
          );
          ctx.restore();
          drawSignatureLabel(CEO_NAME, rightX, labelY);
          drawSignatureLabel(CEO_TITLE, rightX, titleY, true);
        };
        ceoSignatureImg.onerror = (e) => {
          console.error('CEO signature failed to load', e);
          drawSignatureLabel(CEO_NAME, rightX, labelY);
          drawSignatureLabel(CEO_TITLE, rightX, titleY, true);
        };
      } else {
        drawSignatureLabel(CEO_NAME, rightX, labelY);
        drawSignatureLabel(CEO_TITLE, rightX, titleY, true);
      }

      // 3. QR Code always drawn at bottom center
      drawQR();
    }

    // -----------------------------
    // Real dynamic QR code
    // -----------------------------
    async function drawQR() {
      const qrSize = 120;
      const qrX = WIDTH / 2 - qrSize / 2;
      const qrY = 815;

      const verificationUrl =
        `https://uqlearn.co.ke/verify/${encodeURIComponent(
          certificateData.credentialId || 'certificate'
        )}`;

      try {
        const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
          width: qrSize,
          margin: 0,
          errorCorrectionLevel: 'H',
          color: {
            dark: '#111111',
            light: '#FFFCF5'
          }
        });

        const qrImg = new Image();
        qrImg.onload = () => {
          ctx.save();

          ctx.fillStyle = PAPER;
          ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

          ctx.strokeStyle = '#111111';
          ctx.lineWidth = 2;
          ctx.strokeRect(
            qrX - 8,
            qrY - 8,
            qrSize + 16,
            qrSize + 16
          );

          ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);
          ctx.restore();
        };

        qrImg.src = qrDataUrl;
      } catch (error) {
        console.error('QR code generation error:', error);
      }
    }
  }, [isOpen, certificateData, logoUrl, courseConfig, liveCeoSignature, liveInstructorSignature]);

  const handleDownloadPNG = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloading(true);

    const link = document.createElement('a');
    link.download = `UQlearn-Certificate-${certificateData.credentialId || 'certificate'}.png`;
    link.href = canvas.toDataURL('image/png', 1);
    link.click();

    setTimeout(() => setDownloading(false), 800);
  };

  const handleDownloadPDF = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setDownloadingPdf(true);

    try {
      const imgData = canvas.toDataURL('image/png', 1);

      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'px',
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(
        imgData,
        'PNG',
        0,
        0,
        canvas.width,
        canvas.height
      );

      pdf.save(
        `UQlearn-Certificate-${certificateData.credentialId || 'certificate'}.pdf`
      );
    } catch (err) {
      console.error('PDF generation error:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 800);
    }
  };

  const handlePrint = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL('image/png', 1);
    const win = window.open('', '_blank');

    if (win) {
      win.document.write(`
        <html>
          <head>
            <title>UQlearn Certificate - ${certificateData.courseTitle}</title>
            <style>
              @page {
                size: landscape;
                margin: 0;
              }

              html, body {
                margin: 0;
                padding: 0;
                width: 100%;
                height: 100%;
                background: white;
              }

              body {
                display: flex;
                align-items: center;
                justify-content: center;
              }

              img {
                width: 100vw;
                height: auto;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img
              src="${dataUrl}"
              onload="window.print();"
            />
          </body>
        </html>
      `);

      win.document.close();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="p-3.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="w-5 h-5 text-[#6D1BEA]" />
            <span className="text-sm font-bold text-slate-700">
              UQlearn Certificate of Completion
            </span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-sm font-bold cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-slate-100">
          <canvas
            ref={canvasRef}
            className="w-full max-w-3xl h-auto shadow-xl border border-slate-200 rounded-xl"
          />
        </div>

        {/* Actions */}
        <div className="p-3.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-white">
          <div className="text-[11px] text-slate-500 font-mono">
            ID: {certificateData.credentialId || '—'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>

            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="px-4 py-2 bg-[#6D1BEA] hover:bg-[#5B16C7] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              {downloadingPdf ? 'PDF...' : 'Download PDF'}
            </button>

            <button
              onClick={handleDownloadPNG}
              disabled={downloading}
              className="px-4 py-2 bg-[#10C7C9] hover:bg-[#0FAEB0] text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-4 h-4" />
              {downloading ? 'PNG...' : 'Download PNG'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
