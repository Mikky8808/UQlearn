import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  Image as ImageIcon, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Upload, 
  Download, 
  Maximize2, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  ShieldCheck, 
  ArrowLeft,
  FileCheck,
  Eye,
  Crop,
  FileText,
  Star,
  Users,
  X
} from 'lucide-react';

export interface CourseImageStandardsPageProps {
  isInline?: boolean;
  onBack?: () => void;
  onClose?: () => void;
  onGoToBuilder?: () => void;
}

export const CourseImageStandardsPage: React.FC<CourseImageStandardsPageProps> = ({
  isInline = false,
  onBack,
  onClose,
  onGoToBuilder
}) => {
  // Interactive Image Checker State
  const [testImageSrc, setTestImageSrc] = useState<string | null>(null);
  const [imageMeta, setImageMeta] = useState<{
    width: number;
    height: number;
    ratio: number;
    ratioLabel: string;
    fileSizeKb: number;
    fileType: string;
    fileName: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileSizeKb = Math.round(file.size / 1024);
    const fileType = file.type;
    const fileName = file.name;

    const reader = new FileReader();
    reader.onload = (event) => {
      const src = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const width = img.width;
        const height = img.height;
        const ratio = parseFloat((width / height).toFixed(2));
        const isSixteenNine = Math.abs(ratio - 1.78) <= 0.05;

        setImageMeta({
          width,
          height,
          ratio,
          ratioLabel: isSixteenNine ? '16:9 (Ideal)' : `${ratio}:1`,
          fileSizeKb,
          fileType,
          fileName
        });
        setTestImageSrc(src);
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const handleDownloadTemplate = () => {
    // Generate a 750x422 canvas template with grid lines and safe zone markers
    const canvas = document.createElement('canvas');
    canvas.width = 750;
    canvas.height = 422;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 750, 422);

    // Subtle Grid pattern
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x <= 750; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 422);
      ctx.stroke();
    }
    for (let y = 0; y <= 422; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(750, y);
      ctx.stroke();
    }

    // Outer Margin Box (10% buffer)
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(38, 21, 674, 380);

    // Center Safe Zone (80% width, 80% height)
    ctx.strokeStyle = '#0d9488';
    ctx.lineWidth = 3;
    ctx.setLineDash([]);
    ctx.strokeRect(75, 42, 600, 338);

    // Center crosshairs
    ctx.strokeStyle = 'rgba(13, 148, 136, 0.3)';
    ctx.beginPath();
    ctx.moveTo(375, 30);
    ctx.lineTo(375, 392);
    ctx.moveTo(60, 211);
    ctx.lineTo(690, 211);
    ctx.stroke();

    // Text labels on canvas
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('UQLEARN COURSE IMAGE TEMPLATE', 375, 190);

    ctx.font = 'bold 16px monospace';
    ctx.fillStyle = '#2dd4bf';
    ctx.fillText('750 x 422 Pixels (16:9 Aspect Ratio)', 375, 220);

    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Safe Area: Keep main subject centered inside the green border', 375, 250);
    ctx.fillText('Strictly NO overlaid text or logos in your final submission', 375, 272);

    const link = document.createElement('a');
    link.download = 'uqlearn-course-image-template-750x422.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className={`${isInline ? 'w-full py-2 bg-transparent' : 'min-h-screen bg-slate-50 dark:bg-slate-950'} text-slate-900 dark:text-slate-100 flex flex-col justify-between font-sans`}>
      <div className={`max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 ${isInline ? 'py-4' : 'py-10'} flex-1 w-full space-y-8`}>
        
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            {!isInline ? (
              <>
                <Link to="/instructor" className="hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition-colors">Instructor Studio</Link>
                <span>/</span>
                <span className="text-slate-400">Teaching Resources</span>
                <span>/</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">Course Image Standards</span>
              </>
            ) : (
              <span className="font-black text-slate-900 dark:text-white uppercase tracking-wider text-xs">Official Course Image Quality & Dimensions Guide</span>
            )}
          </div>

          {isInline ? (
            <button
              type="button"
              onClick={onBack || onClose}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              <span>Close Guide</span>
            </button>
          ) : (
            <Link
              to="/instructor"
              className="inline-flex items-center space-x-1.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Instructor Studio</span>
            </Link>
          )}
        </div>

        {/* Hero Header Banner */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 shadow-xs rounded-none relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 dark:bg-teal-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl space-y-4">


            <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Course Image Quality Standards
            </h1>

            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
              A high-quality course image is the single most impactful factor in attracting learners to your course catalog listing. All submitted course images undergo quality review and must strictly meet the specifications below to be approved for publishing.
            </p>

            <div className="pt-2 flex flex-wrap gap-3">
              <a
                href="#checker"
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs rounded-none inline-flex items-center space-x-2 cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Test Your Image</span>
              </a>

              <button
                type="button"
                onClick={handleDownloadTemplate}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-xs font-bold border border-slate-200 dark:border-slate-700 transition-all rounded-none inline-flex items-center space-x-2 cursor-pointer"
              >
                <Download className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                <span>Download 750×422 Template (.png)</span>
              </button>
            </div>
          </div>
        </div>

        {/* 4 Core Pillars at a Glance */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Dimensions</span>
              <Maximize2 className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">750 × 422 px</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Minimum dimensions. Retina 1500×844px recommended.</p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Aspect Ratio</span>
              <Crop className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">16 : 9 Ratio</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Standard widescreen landscape. No square or portrait images.</p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">File Format</span>
              <FileCheck className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">.JPG, .PNG, .GIF</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">Static images only. Max file size: 10 MB (2 MB ideal).</p>
          </div>

          <div className="p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-rose-500">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Text Policy</span>
              <XCircle className="w-4 h-4" />
            </div>
            <p className="text-xl font-black text-rose-600 dark:text-rose-400 tracking-tight">Zero Text</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">No overlaid titles, price tags, logos, or marketing badges.</p>
          </div>
        </div>

        {/* Section 1: Detailed Specifications & Why They Matter */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Layers className="w-5 h-5 text-teal-600" />
              <span>Technical & Quality Specifications</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Detailed requirements enforced by automated checks and reviewer QA.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-600 dark:text-slate-300">
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Exact 16:9 Aspect Ratio</span>
                </h3>
                <p className="leading-relaxed">
                  Every card in the UQlearn marketplace, learner dashboard, and course landing page displays thumbnails in <strong>16:9 widescreen format</strong>. Non-16:9 images (such as square 1:1 or 4:3 photos) will be automatically cropped at the top and bottom, which often cuts off critical parts of your subject.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>High Resolution & Sharp Focus</span>
                </h3>
                <p className="leading-relaxed">
                  Your source image must be at least <strong>750 pixels wide by 422 pixels tall</strong>. For high-density displays (such as MacBook Retina screens and 4K monitors), we strongly recommend preparing your graphic at <strong>1500 × 844 pixels</strong>. Blurry, low-resolution, or pixelated images are automatically flagged for revision.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Color Profile & Format</span>
                </h3>
                <p className="leading-relaxed">
                  Save your file using the standard <strong>sRGB color profile</strong>. CMYK images designed for print will experience unnatural color shifts when rendered in web browsers. Formats supported are <strong>.jpg, .jpeg, .png, and static .gif</strong> up to 10 MB in file size.
                </p>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 space-y-2">
                <h3 className="font-bold text-slate-900 dark:text-white flex items-center space-x-1.5">
                  <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                  <span>Central Safe Area & Composition</span>
                </h3>
                <p className="leading-relaxed">
                  Keep your main visual subject positioned in the <strong>central 80% of the canvas</strong>. Avoid positioning key elements near the outer edges, as responsive course cards apply subtle corner clipping and UI badges across mobile screen sizes.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Why Text on Images is Prohibited (Crucial Rule) */}
        <div className="bg-white dark:bg-slate-900 border-2 border-rose-200 dark:border-rose-900/60 p-8 shadow-xs space-y-5">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                The Golden Rule: No Text or Floating Logos on Images
              </h2>
              <p className="text-xs text-rose-600 dark:text-rose-400 font-bold uppercase tracking-wider">
                Strict Quality Policy • Most Common Reason for Review Delays
              </p>
            </div>
          </div>

          <div className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 space-y-3 leading-relaxed">
            <p>
              Do <strong>not</strong> include any text on your course image, including your course title, subheadings, instructor name, pricing, or promotional words like <em>"Bestseller"</em>, <em>"Certified"</em>, or <em>"Updated 2026"</em>.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">1. Unreadable on Mobile</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  On smartphone screens, course cards shrink to less than 300px wide. Text on thumbnails becomes illegible and blurry.
                </span>
              </div>

              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">2. Clashing UI Overlays</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  UQlearn dynamically overlays progress bars, favorite hearts, and status badges directly on the image. Text underneath creates visual collision.
                </span>
              </div>

              <div className="p-4 bg-rose-50/50 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/40 space-y-1">
                <span className="font-bold text-slate-900 dark:text-white block">3. Multi-language Consistency</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Course titles are rendered dynamically as live HTML text so they can be indexed by search engines and translated for international learners.
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 italic pt-1">
              * Note: Natural, contextual text that appears as part of a real setting (such as readable code on a laptop screen, markings on chemical equipment, or handwriting on a blackboard in a photograph) is acceptable as long as it is not a digitally added banner or title.
            </p>
          </div>
        </div>

        {/* Section 3: Visual Side-by-Side DOs and DONTs */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Eye className="w-5 h-5 text-teal-600" />
              <span>Visual Guidelines: DOs and DON'Ts</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Review these examples before exporting your final artwork.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* DO Column */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-emerald-600 dark:text-emerald-400 pb-2 border-b border-emerald-100 dark:border-emerald-950">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">DO: Accepted Examples</h3>
              </div>

              {/* Do Example 1 */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="aspect-video bg-gradient-to-tr from-slate-800 to-teal-900 relative flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700">
                  <img 
                    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=750&h=422&q=80" 
                    alt="Accepted DO example" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    ✓ Accepted
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">Clear Focal Point & Real Workspace</p>
                  <p className="text-xs text-slate-500">Subject is centered, sharp, and directly related to coding without text overlays.</p>
                </div>
              </div>

              {/* Do Example 2 */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="aspect-video bg-gradient-to-tr from-slate-800 to-indigo-900 relative flex items-center justify-center overflow-hidden border border-slate-300 dark:border-slate-700">
                  <img 
                    src="https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=750&h=422&q=80" 
                    alt="Accepted DO example 2" 
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-emerald-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    ✓ Accepted
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-900 dark:text-white">High Contrast & Clean Composition</p>
                  <p className="text-xs text-slate-500">Professional studio lighting, rich colors, and uncluttered background space.</p>
                </div>
              </div>
            </div>

            {/* DON'T Column */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 pb-2 border-b border-rose-100 dark:border-rose-950">
                <XCircle className="w-5 h-5 shrink-0" />
                <h3 className="text-sm font-black uppercase tracking-wider">DON'T: Rejected Examples</h3>
              </div>

              {/* Don't Example 1 */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="aspect-video bg-slate-800 relative flex items-center justify-center overflow-hidden border border-rose-300 dark:border-rose-900/60">
                  <img 
                    src="https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=750&h=422&q=80" 
                    alt="Rejected DONT example 1" 
                    className="w-full h-full object-cover opacity-60 filter blur-xs"
                  />
                  <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center p-4 text-center">
                    <span className="bg-amber-400 text-black font-black text-sm px-2 py-1 rotate-[-3deg] uppercase shadow-md">
                      MASTER PYTHON 2026!!
                    </span>
                    <span className="text-white text-xs font-bold mt-1 bg-red-600 px-2 py-0.5">
                      50% OFF TODAY
                    </span>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    ✕ Rejected: Text Overlay
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Digital Text & Promotional Badges</p>
                  <p className="text-xs text-slate-500">Adding titles, slogans, discounts, or badges will cause immediate rejection.</p>
                </div>
              </div>

              {/* Don't Example 2 */}
              <div className="border border-slate-200 dark:border-slate-800 p-4 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="aspect-video bg-slate-900 relative flex items-center justify-center overflow-hidden border border-rose-300 dark:border-rose-900/60">
                  <div className="grid grid-cols-2 grid-rows-2 w-full h-full gap-0.5 opacity-70">
                    <div className="bg-blue-900 flex items-center justify-center text-[9px] text-white font-mono">Photo 1</div>
                    <div className="bg-amber-900 flex items-center justify-center text-[9px] text-white font-mono">Photo 2</div>
                    <div className="bg-emerald-900 flex items-center justify-center text-[9px] text-white font-mono">Photo 3</div>
                    <div className="bg-purple-900 flex items-center justify-center text-[9px] text-white font-mono">Photo 4</div>
                  </div>
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold uppercase tracking-wider">
                    ✕ Rejected: Collage
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Multi-image Collages & Busy Layouts</p>
                  <p className="text-xs text-slate-500">Do not stitch multiple small pictures together. Use one single high-quality photo.</p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Section 4: Interactive Image Tester & Course Card Simulator */}
        <div id="checker" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <ImageIcon className="w-5 h-5 text-teal-600" />
                <span>Interactive Image Validator & Card Simulator</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Upload your draft image to test dimensions, aspect ratio, file size, and see how it looks inside a live UQlearn card.
              </p>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs rounded-none inline-flex items-center space-x-1.5 cursor-pointer shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Select Image to Test</span>
            </button>
            <input 
              ref={fileInputRef}
              type="file" 
              accept="image/png, image/jpeg, image/jpg, image/gif" 
              className="hidden" 
              onChange={handleFileSelect} 
            />
          </div>

          {imageMeta && testImageSrc ? (
            <div className="space-y-6">
              
              {/* Analysis Result Banner */}
              <div className={`p-4 border ${
                imageMeta.width >= 750 && imageMeta.height >= 422 && Math.abs(imageMeta.ratio - 1.78) <= 0.05
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-start space-x-3">
                  {imageMeta.width >= 750 && imageMeta.height >= 422 && Math.abs(imageMeta.ratio - 1.78) <= 0.05 ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p className="font-bold text-sm">
                      {imageMeta.width >= 750 && imageMeta.height >= 422 && Math.abs(imageMeta.ratio - 1.78) <= 0.05
                        ? 'Great work! Image meets UQlearn dimensional requirements.'
                        : 'Attention: Review image dimensions and aspect ratio.'}
                    </p>
                    <div className="text-xs flex flex-wrap gap-x-4 gap-y-1 font-mono">
                      <span>Dimensions: <strong>{imageMeta.width} × {imageMeta.height} px</strong></span>
                      <span>Aspect Ratio: <strong>{imageMeta.ratioLabel}</strong></span>
                      <span>File Size: <strong>{imageMeta.fileSizeKb} KB</strong></span>
                      <span>Type: <strong>{imageMeta.fileType}</strong></span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Live Preview Comparison */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                
                {/* 1. Raw Preview with Grid */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Raw Image (Uploaded)</span>
                  <div className="border border-slate-200 dark:border-slate-800 bg-slate-900 p-2 relative group">
                    <img 
                      src={testImageSrc} 
                      alt="Tested image" 
                      className="w-full aspect-video object-contain bg-slate-950" 
                    />
                    <div className="absolute bottom-4 left-4 bg-black/70 px-2 py-1 text-[10px] text-white font-mono">
                      {imageMeta.width} × {imageMeta.height} ({imageMeta.ratioLabel})
                    </div>
                  </div>
                </div>

                {/* 2. Simulated Course Card Preview */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Live Course Card Mockup</span>
                  <div className="max-w-sm mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-md p-4 space-y-3">
                    <div className="aspect-video relative overflow-hidden bg-slate-800">
                      <img 
                        src={testImageSrc} 
                        alt="Card simulation" 
                        className="w-full h-full object-cover" 
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 bg-teal-600 text-white text-[9px] font-black uppercase tracking-wider">
                        Development
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-left">
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">
                        Complete Web Development Bootcamp: Zero to Hero in Modern Architecture
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">Dr. Alex Kim, Lead Software Architect</p>
                    </div>

                    <div className="flex items-center space-x-1.5 text-xs text-amber-500">
                      <span className="font-black">4.9</span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className="w-3 h-3 fill-amber-400 text-amber-400" />
                        ))}
                      </div>
                      <span className="text-[10px] text-slate-400">(1,842)</span>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900 dark:text-white">KES 4,500</span>
                      <span className="text-[10px] px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold uppercase tracking-wider">
                        All Levels
                      </span>
                    </div>
                  </div>
                </div>

              </div>

            </div>
          ) : (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-400 p-12 text-center space-y-3 cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-800/30"
            >
              <div className="w-12 h-12 bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mx-auto rounded-none">
                <Upload className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Drop your draft course image here or browse files
                </p>
                <p className="text-xs text-slate-500">
                  Supports .JPG, .PNG, or .GIF (min 750×422 pixels)
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-bold transition-all rounded-none"
              >
                Choose File
              </button>
            </div>
          )}
        </div>

        {/* Section 5: Step-by-Step Submission Checklist */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xs space-y-6">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-4">
            <h2 className="text-lg font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <span>Pre-Upload Instructor Checklist</span>
            </h2>
            <p className="text-xs text-slate-500 mt-1">Run through these 5 checks before submitting your course for QA review.</p>
          </div>

          <div className="space-y-3 text-xs sm:text-sm text-slate-700 dark:text-slate-200">
            {[
              {
                title: "1. Dimensional Compliance",
                desc: "My image is cropped exactly to 16:9 aspect ratio and is at least 750 × 422 pixels (1500 × 844 recommended)."
              },
              {
                title: "2. Zero Text Verification",
                desc: "There are no overlaid titles, course names, slogans, pricing numbers, or marketing words on the image."
              },
              {
                title: "3. Single, Clear Subject",
                desc: "The image focuses on a single relevant concept, action, or setting rather than a collage of multiple photos."
              },
              {
                title: "4. Authentic & High Resolution",
                desc: "The picture is not blurry, stretched, pixelated, or using outdated generic 3D clipart."
              },
              {
                title: "5. Safe Margin Spacing",
                desc: "The main subject is centered with adequate breathing room away from the edges."
              }
            ].map((check, idx) => (
              <div key={idx} className="flex items-start space-x-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80">
                <CheckCircle2 className="w-4 h-4 text-teal-600 dark:text-teal-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-white">{check.title}</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{check.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-2 text-xs text-slate-500">
              <HelpCircle className="w-4 h-4 text-teal-600" />
              <span>Need help editing? Use free tools like Canva, Photoshop, or Figma to crop to 750×422px.</span>
            </div>

            <Link
              to="/instructor"
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold transition-all shadow-xs rounded-none cursor-pointer"
            >
              Go to Course Builder
            </Link>
          </div>
        </div>
      </div>

      {!isInline && (
        <footer className="bg-slate-950 text-slate-400 py-8 border-t border-slate-900 mt-12">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
            <p>© 2026 UQlearn Instructor Studio. Quality Assurance & Publishing Standards.</p>
            <div className="flex items-center space-x-6">
              <Link to="/instructor" className="hover:text-indigo-400 text-slate-400 font-bold transition-colors">Instructor Studio</Link>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link to="/terms" className="hover:text-white transition-colors">Terms</Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};
