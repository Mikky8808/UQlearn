import React, { useState, useEffect, useRef } from 'react';
import { 
  Award, 
  X, 
  Download, 
  Printer, 
  Share2, 
  FileText,
  Lock,
  Code2
} from 'lucide-react';
import { Course } from '../../../types';
import { useApp } from '../../../context/AppContext';
import { ROOT_URL } from '../../../lib/apiConfig';
import { instructorSignatureService } from '../../../services/instructor-signature-service';
import { resolveCertificateLogo, convertImageUrlToDataUri } from '../../../lib/certificateLogo';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
import { UqlearnCertificateSvg, CertificateData } from '../../common/UqlearnCertificateSvg';

interface LearningCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  course: Course;
  studentName: string;
  progressPercentage: number;
  completedCount: number;
  totalLessons: number;
}

export const LearningCertificateModal: React.FC<LearningCertificateModalProps> = ({
  isOpen,
  onClose,
  course,
  studentName,
  progressPercentage,
  completedCount,
  totalLessons
}) => {
  const { openShareCourseModal, courseConfig, logoUrl } = useApp();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [certLogo, setCertLogo] = useState<string>(() => resolveCertificateLogo(logoUrl));
  const [downloadingPng, setDownloadingPng] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingSvg, setDownloadingSvg] = useState(false);

  // Dynamic signatures
  const cachedCeoSig = typeof localStorage !== 'undefined' ? localStorage.getItem('uq_sig_ceo') || '' : '';
  const [liveCeoSignature, setLiveCeoSignature] = useState<string>(courseConfig.ceoSignature || cachedCeoSig || '');
  const [liveInstructorSignature, setLiveInstructorSignature] = useState<string>('');

  const isEligible = progressPercentage >= 100;
  const credentialId = `UQL-CERT-${course.id.replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const completionDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  const CEO_NAME = courseConfig.ceoName || 'SIR, RAJAB WAMUU';
  const CEO_TITLE = courseConfig.ceoTitle || 'CEO UQLEARN';
  const CEO_SIGNATURE_URL = liveCeoSignature || courseConfig.ceoSignature || cachedCeoSig || '';
  const INSTRUCTOR_NAME = (course.instructor || 'Michael Kenyanya').toUpperCase();

  useEffect(() => {
    if (!isOpen || !isEligible) return;

    // 1. Generate QR Code
    const verificationUrl = `${ROOT_URL}/verify-certificate/${encodeURIComponent(credentialId)}`;
    QRCode.toDataURL(verificationUrl, {
      width: 240,
      margin: 1,
      errorCorrectionLevel: 'H',
      color: {
        dark: '#0f172a',
        light: '#ffffff'
      }
    }).then(setQrDataUrl).catch(() => {});

    // 2. Load CEO Signature
    instructorSignatureService.getInstructorSignature('ceo').then((res) => {
      if (res && res.success && res.signatureData) setLiveCeoSignature(res.signatureData);
    }).catch(() => {});

    // 3. Load Instructor Signature if available
    // Correctly resolve instructorId from various possible course property names
    const instructorId = 
      (course as any).createdBy || 
      (course as any).created_by || 
      (course as any).instructorId || 
      (course as any).instructor_id ||
      (typeof course.instructor === 'object' ? (course.instructor as any).id : null);
    
    if (instructorId) {
      instructorSignatureService.getInstructorSignature(instructorId).then((res) => {
        if (res && res.success && res.signatureData) setLiveInstructorSignature(res.signatureData);
      }).catch(() => {});
    }

    // 4. Resolve and convert site logo to Data URI for seamless SVG & Canvas rendering
    convertImageUrlToDataUri(resolveCertificateLogo(logoUrl)).then(setCertLogo).catch(() => {});
  }, [isOpen, isEligible, credentialId, course, logoUrl]);

  if (!isOpen) return null;

  const certData: CertificateData = {
    studentName: studentName || 'Learner',
    courseTitle: course.title,
    completionDate: completionDate,
    instructorName: INSTRUCTOR_NAME,
    instructorSignature: liveInstructorSignature,
    ceoName: CEO_NAME,
    ceoTitle: CEO_TITLE,
    ceoSignature: CEO_SIGNATURE_URL,
    credentialId: credentialId,
    verificationUrl: `${ROOT_URL}/verify-certificate/${encodeURIComponent(credentialId)}`,
    qrDataUrl: qrDataUrl,
    logoUrl: certLogo || resolveCertificateLogo(logoUrl)
  };

  const getSvgString = (): string | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svg);
    if (!source.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    return source;
  };

  const renderSvgToCanvas = async (scale = 2): Promise<HTMLCanvasElement | null> => {
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
  };

  const handleDownloadPNG = async () => {
    setDownloadingPng(true);
    try {
      const canvas = await renderSvgToCanvas(3); // Higher quality
      if (canvas) {
        const pngUrl = canvas.toDataURL('image/png', 1.0);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `UQlearn-Certificate-${credentialId}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingPng(false), 600);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      const canvas = await renderSvgToCanvas(2);
      if (canvas) {
        const imgData = canvas.toDataURL('image/png', 1.0);
        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });
        pdf.addImage(imgData, 'PNG', 0, 0, 297, 210, undefined, 'FAST');
        pdf.save(`UQlearn-Certificate-${credentialId}.pdf`);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setTimeout(() => setDownloadingPdf(false), 600);
    }
  };

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
            <title>UQlearn Certificate - ${course.title}</title>
            <style>
              @page { size: landscape; margin: 0; }
              html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: white; display: flex; align-items: center; justify-content: center; }
              img { width: 100vw; height: auto; max-height: 100vh; object-fit: contain; }
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

  const handleShare = () => {
    openShareCourseModal(course, {
      customUrl: `${ROOT_URL}/verify-certificate/${credentialId}`,
      customTitle: `Share Certificate: "${course.title}"`,
      customText: `I successfully earned a Certificate of Completion for "${course.title}" on UQlearn!`
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/95 backdrop-blur-md select-none animate-fadeIn p-4 sm:p-8">
      {/* Floating Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="fixed top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-all z-[70] cursor-pointer border border-white/10 backdrop-blur-md shadow-2xl"
        title="Close"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main Content Area */}
      {!isEligible ? (
        <div className="text-center space-y-6 max-w-md bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800">
          <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mx-auto">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xl font-bold text-slate-900 dark:text-white">Certificate Locked</h4>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Please complete all lessons and quizzes to earn your certificate.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-all"
          >
            Back to Course
          </button>
        </div>
      ) : (
        <div className="relative w-full max-w-4xl h-full flex flex-col items-center justify-center">
          {/* Certificate Image Container - Reduced size for better visibility */}
          <div className="relative group max-h-[70vh] w-full flex items-center justify-center drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <UqlearnCertificateSvg
              data={certData}
              svgRef={svgRef}
              className="max-w-full max-h-full w-auto h-auto block rounded-lg overflow-hidden transition-transform duration-500"
            />
          </div>

          {/* Floating Action Bar - Only PNG and PDF as requested */}
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 p-2.5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] z-[70] animate-slideUp">
            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={downloadingPng}
              className="px-8 py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:bg-slate-600 text-white text-sm font-black transition-all flex items-center gap-2.5 shadow-lg cursor-pointer min-w-[180px] justify-center"
            >
              <Download className="w-4 h-4" />
              <span>{downloadingPng ? 'Processing...' : 'Download PNG'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={downloadingPdf}
              className="px-8 py-3.5 rounded-xl bg-purple-700 hover:bg-purple-600 disabled:bg-slate-600 text-white text-sm font-black transition-all flex items-center gap-2.5 shadow-lg cursor-pointer min-w-[180px] justify-center"
            >
              <FileText className="w-4 h-4" />
              <span>{downloadingPdf ? 'Processing...' : 'Download PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
