import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Download, Printer, Award, X, FileText, Code2, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { fetchSignatureApi, ROOT_URL } from '../../lib/apiConfig';
import { resolveCertificateLogo, convertImageUrlToDataUri } from '../../lib/certificateLogo';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { UqlearnCertificateSvg, CertificateData } from './UqlearnCertificateSvg';

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

export const CanvasCertificateGenerator: React.FC<CanvasCertificateGeneratorProps> = ({
  isOpen,
  onClose,
  certificateData
}) => {
  const { courseConfig, logoUrl } = useApp();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [certLogo, setCertLogo] = useState<string>(() => resolveCertificateLogo(logoUrl));
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingSvg, setDownloadingSvg] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Signatures loaded dynamically from /api/v1/signatures.php
  const cachedCeoSig = typeof localStorage !== 'undefined' ? localStorage.getItem('uq_sig_ceo') || '' : '';
  const [liveCeoSignature, setLiveCeoSignature] = useState<string>(courseConfig.ceoSignature || cachedCeoSig || '');
  const [liveInstructorSignature, setLiveInstructorSignature] = useState<string>(certificateData.instructorSignature || '');

  const CEO_NAME = courseConfig.ceoName || 'SIR, RAJAB WAMUU';
  const CEO_TITLE = courseConfig.ceoTitle || 'CEO UQLEARN';
  const CEO_SIGNATURE_URL = liveCeoSignature || courseConfig.ceoSignature || cachedCeoSig || '';
  const INSTRUCTOR_SIGNATURE_URL = liveInstructorSignature || certificateData.instructorSignature || '';
  const credentialId = certificateData.credentialId || `UQL-CERT-${Math.floor(1000 + Math.random() * 9000)}`;

  // Generate dynamic QR Code and fetch signatures on modal open
  useEffect(() => {
    if (!isOpen) return;

    // 1. Generate stylized QR Code
    const verificationUrl = `${ROOT_URL}/verify-certificate/${encodeURIComponent(credentialId)}`;
    QRCode.toDataURL(verificationUrl, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then((dataUrl) => {
      setQrDataUrl(dataUrl);
    }).catch((err) => {
      console.warn('QR Code generation fallback:', err);
    });

    // 2. Fetch CEO signature dynamically
    fetchSignatureApi('ceo').then((res) => {
      if (res && res.signatureData) {
        setLiveCeoSignature(res.signatureData);
      }
    }).catch((e) => console.warn('Could not dynamically fetch CEO signature:', e));

    // 3. Fetch Instructor signature dynamically if instructorId provided
    if (certificateData.instructorId) {
      fetchSignatureApi(certificateData.instructorId).then((res) => {
        if (res && res.signatureData) {
          setLiveInstructorSignature(res.signatureData);
        }
      }).catch((e) => console.warn('Could not dynamically fetch instructor signature:', e));
    }

    // 4. Resolve and convert site logo to Data URI for seamless SVG & Canvas rendering
    convertImageUrlToDataUri(resolveCertificateLogo(logoUrl)).then((dataUri) => {
      setCertLogo(dataUri);
    }).catch(() => {});
  }, [isOpen, credentialId, certificateData.instructorId, logoUrl]);

  const certData: CertificateData = {
    studentName: certificateData.studentName,
    courseTitle: certificateData.courseTitle,
    completionDate: certificateData.completionDate,
    instructorName: certificateData.instructorName,
    instructorSignature: INSTRUCTOR_SIGNATURE_URL,
    ceoName: CEO_NAME,
    ceoTitle: CEO_TITLE,
    ceoSignature: CEO_SIGNATURE_URL,
    credentialId: credentialId,
    verificationUrl: `${ROOT_URL}/verify-certificate/${encodeURIComponent(credentialId)}`,
    qrDataUrl: qrDataUrl,
    logoUrl: certLogo || resolveCertificateLogo(logoUrl)
  };

  // Helper to serialize the SVG element to a standalone XML string
  const getSvgString = useCallback((): string | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    // Add namespace if missing
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return source;
  }, []);

  // Helper to convert SVG into a high-DPI canvas
  const renderSvgToCanvas = useCallback(async (scale = 2): Promise<HTMLCanvasElement | null> => {
    const svgString = getSvgString();
    if (!svgString) return null;

    return new Promise((resolve) => {
      const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1600 * scale;
        canvas.height = 1131 * scale;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        }
        URL.revokeObjectURL(url);
        resolve(canvas);
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    });
  }, [getSvgString]);

  // 1. Download SVG vector directly
  const handleDownloadSVG = () => {
    const svgString = getSvgString();
    if (!svgString) return;

    setDownloadingSvg(true);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `UQlearn-Certificate-${credentialId}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setTimeout(() => setDownloadingSvg(false), 600);
  };

  // 2. Download High-Res PNG (3200 x 2262 for 300 DPI print quality)
  const handleDownloadPNG = async () => {
    setDownloadingPng(true);
    try {
      const canvas = await renderSvgToCanvas(2);
      if (canvas) {
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `UQlearn-Certificate-${credentialId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('PNG export failed:', err);
    } finally {
      setTimeout(() => setDownloadingPng(false), 600);
    }
  };

  // 3. Download Print-Ready PDF
  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const canvas = await renderSvgToCanvas(2);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png', 1.0);
        // A4 Landscape is 297mm x 210mm
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
        pdf.save(`UQlearn-Certificate-${credentialId}.pdf`);
      }
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 600);
    }
  };

  // 4. Print Certificate directly
  const handlePrint = async () => {
    const canvas = await renderSvgToCanvas(2);
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png', 1.0);
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(`
        <!DOCTYPE html>
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
            <img src="${dataUrl}" onload="window.print();" />
          </body>
        </html>
      `);
      win.document.close();
    }
  };

  const copyCredentialId = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(credentialId);
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2500);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 backdrop-blur-md animate-fadeIn select-none">
      <div className="bg-white dark:bg-slate-900 w-screen h-screen overflow-hidden flex flex-col transition-colors">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/80 dark:bg-slate-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-200 dark:border-purple-800">
              <Award className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <span>Official UQlearn Certificate of Completion</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  Verified
                </span>
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Official credential with cryptographic QR validation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close certificate viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Certificate SVG Canvas Container */}
        <div className="p-4 sm:p-6 overflow-auto flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-950/80">
          <div className="w-full max-w-5xl shadow-2xl rounded-2xl overflow-hidden border border-slate-300 dark:border-slate-800 bg-white">
            <UqlearnCertificateSvg
              data={certData}
              svgRef={svgRef}
              className="w-full h-auto block"
            />
          </div>
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900">
          <button
            type="button"
            onClick={copyCredentialId}
            className="text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 flex items-center gap-1.5 cursor-pointer bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700"
            title="Click to copy Credential ID"
          >
            {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> : <Award className="w-3.5 h-3.5 text-purple-500" />}
            <span>ID: <strong>{credentialId}</strong></span>
          </button>

          <div className="flex flex-wrap items-center gap-2">
            {/* Print */}
            <button
              onClick={handlePrint}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200 dark:border-slate-700"
            >
              <Printer className="w-3.5 h-3.5 text-slate-600 dark:text-slate-400" />
              <span>Print</span>
            </button>

            {/* Download High-Res PNG */}
            <button
              onClick={handleDownloadPNG}
              disabled={downloadingPng}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPng ? 'Generating PNG...' : 'Download PNG'}</span>
            </button>

            {/* Download PDF */}
            <button
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <FileText className="w-4 h-4" />
              <span>{downloadingPdf ? 'Generating PDF...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
