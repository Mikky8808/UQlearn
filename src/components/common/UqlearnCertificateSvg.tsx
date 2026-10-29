import React, { useId } from 'react';
import { resolveCertificateLogo } from '../../lib/certificateLogo';
import { instructorSignatureService } from '../../services/instructor-signature-service';

export interface CertificateData {
  studentName: string;
  courseTitle: string;
  completionDate: string;
  instructorName: string;
  instructorSignature?: string;
  ceoName?: string;
  ceoTitle?: string;
  ceoSignature?: string;
  credentialId?: string;
  verificationUrl?: string;
  qrDataUrl?: string;
  logoUrl?: string;
}

interface UqlearnCertificateSvgProps {
  data: CertificateData;
  className?: string;
  svgRef?: React.Ref<SVGSVGElement>;
}

export const UqlearnCertificateSvg: React.FC<UqlearnCertificateSvgProps> = ({
  data,
  className = 'w-full h-auto shadow-2xl rounded-xl',
  svgRef,
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');

  const studentName = data.studentName?.trim() || 'ALBRIGHT JUMA';
  const courseTitle = data.courseTitle?.trim() || 'Virtual Assistant';
  const completionDate = data.completionDate?.trim() || 'July 1, 2026';
  const instructorName = (data.instructorName?.trim() || 'MICHAEL KENYANYA').toUpperCase();
  const ceoName = (data.ceoName?.trim() || 'SIR, RAJAB WAMUU').toUpperCase();
  const ceoTitle = (data.ceoTitle?.trim() || 'CEO UQLEARN').toUpperCase();
  const credentialId = data.credentialId || 'UQL-CERT-2026';
  const effectiveLogoUrl = resolveCertificateLogo(data.logoUrl);

  const hasCustomInstructorSig = instructorSignatureService.isValidSignature(data.instructorSignature);
  const hasCustomCeoSig = instructorSignatureService.isValidSignature(data.ceoSignature);

  // Responsive font sizing for long student names
  let studentFontSize = 62;
  if (studentName.length > 28) studentFontSize = 42;
  else if (studentName.length > 22) studentFontSize = 48;
  else if (studentName.length > 16) studentFontSize = 54;

  // Responsive font sizing for long course titles
  let courseFontSize = 22;
  if (courseTitle.length > 40) courseFontSize = 18;
  else if (courseTitle.length > 30) courseFontSize = 20;

  return (
    <svg
      ref={svgRef}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      viewBox="0 0 1600 1131"
      width="100%"
      height="100%"
      className={className}
      style={{ shapeRendering: 'geometricPrecision', textRendering: 'geometricPrecision' }}
    >
      <defs>
        {/* Web fonts for certificate typography */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800;900&family=Dancing+Script:wght@700&family=Montserrat:wght@400;500;600;700&display=swap');
          .uql-cinzel { font-family: 'Cinzel', Georgia, 'Times New Roman', serif; }
          .uql-body { font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
          .uql-script { font-family: 'Dancing Script', 'Brush Script MT', 'Segoe Script', cursive; }
        `}</style>

        {/* Paper Background Gradient */}
        <linearGradient id={`paper-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fffdfa" />
          <stop offset="50%" stopColor="#fdfbf5" />
          <stop offset="100%" stopColor="#faf5e9" />
        </linearGradient>

        {/* Brand Royal Purple Gradient */}
        <linearGradient id={`purpleGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4c1d95" />
          <stop offset="50%" stopColor="#581c87" />
          <stop offset="100%" stopColor="#6b21a8" />
        </linearGradient>

        {/* Text Purple Gradient for Recipient Name */}
        <linearGradient id={`namePurple-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#310e68" />
          <stop offset="50%" stopColor="#4c1d95" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>

        {/* Metallic Gold Gradient */}
        <linearGradient id={`goldGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e9c864" />
          <stop offset="35%" stopColor="#d4af37" />
          <stop offset="70%" stopColor="#c59b27" />
          <stop offset="100%" stopColor="#e9c864" />
        </linearGradient>

        {/* Deep Teal Ribbon Gradient */}
        <linearGradient id={`tealGrad-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#08545e" />
          <stop offset="50%" stopColor="#044e54" />
          <stop offset="100%" stopColor="#023337" />
        </linearGradient>

        {/* Circular Logo defs (from official UQlearn crest) */}
        <linearGradient id={`logoGrad0-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id={`logoGrad1-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="50%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#6d28d9" />
        </linearGradient>
        <linearGradient id={`logoGrad2-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7c3aed" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>
        <linearGradient id={`logoGrad3-${uid}`} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="45%" stopColor="#9333ea" />
          <stop offset="100%" stopColor="#5b21b6" />
        </linearGradient>
        <linearGradient id={`logoGrad4-${uid}`} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#14b8a6" />
          <stop offset="50%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#a855f7" />
        </linearGradient>
        <linearGradient id={`logoGrad5-${uid}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="100%" stopColor="#0d9488" />
        </linearGradient>

        {/* QR Code Teal/Purple Border Gradient */}
        <linearGradient id={`qrBorder-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="50%" stopColor="#0d9488" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {/* ======================================================== */}
      {/* 1. BACKGROUND PARCHMENT                                  */}
      {/* ======================================================== */}
      <rect x="0" y="0" width="1600" height="1131" fill={`url(#paper-${uid})`} />

      {/* Delicate Guilloche Security Waves (Background fine art engraving) */}
      <g stroke="#d4af37" strokeWidth="0.8" opacity="0.22" fill="none">
        <path d="M 40,320 C 350,220 500,420 800,320 C 1100,220 1250,420 1560,320" />
        <path d="M 40,340 C 350,240 500,440 800,340 C 1100,240 1250,440 1560,340" />
        <path d="M 40,360 C 350,260 500,460 800,360 C 1100,260 1250,460 1560,360" />
        <path d="M 40,380 C 350,280 500,480 800,380 C 1100,280 1250,480 1560,380" />
        <path d="M 40,740 C 350,640 500,840 800,740 C 1100,640 1250,840 1560,740" />
        <path d="M 40,760 C 350,660 500,860 800,760 C 1100,660 1250,860 1560,760" />
        <path d="M 40,780 C 350,680 500,880 800,780 C 1100,680 1250,880 1560,780" />
        <path d="M 40,800 C 350,700 500,900 800,800 C 1100,700 1250,900 1560,800" />
      </g>

      {/* ======================================================== */}
      {/* 2. OUTER & INNER GOLD BORDERS                            */}
      {/* ======================================================== */}
      {/* Outer Gold Frame */}
      <rect
        x="32"
        y="32"
        width="1536"
        height="1067"
        rx="6"
        fill="none"
        stroke={`url(#goldGrad-${uid})`}
        strokeWidth="3.2"
      />
      {/* Inner Thin Gold Frame */}
      <rect
        x="44"
        y="44"
        width="1512"
        height="1043"
        rx="3"
        fill="none"
        stroke={`url(#goldGrad-${uid})`}
        strokeWidth="1.2"
        opacity="0.85"
      />

      {/* Corner Diamond Pin Accents */}
      <polygon points="44,38 50,44 44,50 38,44" fill="#d4af37" />
      <polygon points="1556,38 1562,44 1556,50 1550,44" fill="#d4af37" />
      <polygon points="44,1081 50,1087 44,1093 38,1087" fill="#d4af37" />
      <polygon points="1556,1081 1562,1087 1556,1093 1550,1087" fill="#d4af37" />

      {/* ======================================================== */}
      {/* 3. CORNER GRAPHICS (Circuits, Honeycomb, Ribbons)        */}
      {/* ======================================================== */}

      {/* --- TOP-LEFT CORNER: Circuit Board Tech Traces & Gold Matrix --- */}
      <g stroke="#044e54" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 44,100 L 80,64 L 280,64" />
        <path d="M 44,140 L 90,94 L 240,94" />
        <path d="M 44,180 L 100,124 L 260,124" />
        <path d="M 44,220 L 110,154 L 220,154" />
        <path d="M 44,260 L 120,184 L 195,184" />
        <path d="M 44,300 L 130,214 L 165,214" />
      </g>
      {/* Circuit Nodes (terminal dots & bend rings) */}
      <g fill="#044e54">
        {/* Terminal solid dots */}
        <circle cx="280" cy="64" r="5" />
        <circle cx="240" cy="94" r="4.5" />
        <circle cx="260" cy="124" r="5" />
        <circle cx="220" cy="154" r="4.5" />
        <circle cx="195" cy="184" r="4" />
        <circle cx="165" cy="214" r="4" />
        {/* Bend ring nodes */}
        <circle cx="80" cy="64" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="90" cy="94" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="100" cy="124" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="110" cy="154" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="120" cy="184" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="130" cy="214" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
      </g>
      {/* Top-Left Gold Dot Matrix */}
      <g fill="#d4af37" opacity="0.85">
        {[0, 1, 2, 3, 4, 5].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle key={`tl-dot-${row}-${col}`} cx={68 + col * 20} cy={370 + row * 18} r="2.2" />
          ))
        )}
      </g>

      {/* --- TOP-RIGHT CORNER: Honeycomb + Geometric Ribbons + Matrix --- */}
      {/* Top-Right Gold Dot Matrix */}
      <g fill="#d4af37" opacity="0.85">
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4, 5, 6, 7, 8].map((col) => {
            if (row === 1 && col > 7) return null;
            if (row === 2 && col > 5) return null;
            if (row === 3 && col > 3) return null;
            return (
              <circle key={`tr-dot-${row}-${col}`} cx={1060 + col * 20} cy={60 + row * 18} r="2.2" />
            );
          })
        )}
      </g>

      {/* Top-Right Geometric Ribbon Layers (Exact layer design from Bottom-Left: Teal -> Gold -> White -> Purple) */}
      <g>
        {/* Outer Deep Teal Corner Polygon at (1556, 44) */}
        <polygon points="1430,44 1556,44 1556,170" fill={`url(#tealGrad-${uid})`} />
        {/* Gold Stripe */}
        <polygon points="1415,44 1430,44 1556,170 1556,185" fill="#d4af37" />
        {/* Crisp White Separator Stripe */}
        <polygon points="1403,44 1415,44 1556,185 1556,197" fill="#ffffff" />
        {/* Royal Purple Diagonal Stripe */}
        <polygon points="1345,44 1403,44 1556,197 1556,255" fill={`url(#purpleGrad-${uid})`} />
        {/* Inner Gold Accent Stroke */}
        <line x1="1345" y1="44" x2="1556" y2="255" stroke="#d4af37" strokeWidth="2.5" />
        <line x1="1335" y1="44" x2="1556" y2="265" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
      </g>

      {/* --- BOTTOM-LEFT CORNER: Geometric Ribbons + Matrix --- */}
      {/* Bottom-Left Geometric Ribbon Layers */}
      <g>
        {/* Outer Deep Teal Corner Polygon at (44, 1087) */}
        <polygon points="44,970 44,1087 161,1087" fill={`url(#tealGrad-${uid})`} />
        {/* Gold Stripe */}
        <polygon points="44,955 44,970 161,1087 176,1087" fill="#d4af37" />
        {/* Crisp White Separator Stripe */}
        <polygon points="44,943 44,955 176,1087 188,1087" fill="#ffffff" />
        {/* Royal Purple Diagonal Stripe */}
        <polygon points="44,885 44,943 188,1087 246,1087" fill={`url(#purpleGrad-${uid})`} />
        {/* Inner Gold Accent Stroke */}
        <line x1="44" y1="885" x2="246" y2="1087" stroke="#d4af37" strokeWidth="2.5" />
        <line x1="44" y1="875" x2="256" y2="1087" stroke="#ffffff" strokeWidth="1" opacity="0.6" />
      </g>

      {/* Bottom-Left Gold Dot Matrix */}
      <g fill="#d4af37" opacity="0.85">
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4, 5, 6].map((col) => {
            if (row === 0 && col < 3) return null;
            if (row === 1 && col < 2) return null;
            return (
              <circle key={`bl-dot-${row}-${col}`} cx={270 + col * 20} cy={1000 + row * 18} r="2.2" />
            );
          })
        )}
      </g>

      {/* --- BOTTOM-RIGHT CORNER: Circuit Board Tech Traces & Gold Matrix --- */}
      <g stroke="#044e54" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 1556,1031 L 1520,1067 L 1320,1067" />
        <path d="M 1556,991 L 1510,1037 L 1360,1037" />
        <path d="M 1556,951 L 1500,1007 L 1340,1007" />
        <path d="M 1556,911 L 1490,977 L 1380,977" />
        <path d="M 1556,871 L 1480,947 L 1405,947" />
        <path d="M 1556,831 L 1470,917 L 1435,917" />
      </g>
      {/* Terminal Nodes & Bend Rings */}
      <g fill="#044e54">
        {/* Terminal solid dots */}
        <circle cx="1320" cy="1067" r="5" />
        <circle cx="1360" cy="1037" r="4.5" />
        <circle cx="1340" cy="1007" r="5" />
        <circle cx="1380" cy="977" r="4.5" />
        <circle cx="1405" cy="947" r="4" />
        <circle cx="1435" cy="917" r="4" />
        {/* Bend ring nodes */}
        <circle cx="1520" cy="1067" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="1510" cy="1037" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="1500" cy="1007" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="1490" cy="977" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="1480" cy="947" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
        <circle cx="1470" cy="917" r="3.5" fill="#ffffff" stroke="#044e54" strokeWidth="2" />
      </g>
      {/* Bottom-Right Gold Dot Matrix */}
      <g fill="#d4af37" opacity="0.85">
        {[0, 1, 2, 3, 4, 5].map((row) =>
          [0, 1, 2, 3].map((col) => (
            <circle key={`br-dot-${row}-${col}`} cx={1460 + col * 20} cy={660 + row * 18} r="2.2" />
          ))
        )}
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <circle key={`br-dot-low-${row}-${col}`} cx={1230 + col * 20} cy={1025 + row * 18} r="2.2" />
          ))
        )}
      </g>

      {/* ======================================================== */}
      {/* 4. TOP LOGO EMBLEM (UQLEARN OFFICIAL SITE LOGO)         */}
      {/* ======================================================== */}
      <g id="uql-crest-emblem">
        {/* Render the site's official logo directly with dual href and xlinkHref attributes */}
        <image
          href={effectiveLogoUrl}
          xlinkHref={effectiveLogoUrl}
          x="730"
          y="72"
          width="140"
          height="140"
          preserveAspectRatio="xMidYMid meet"
        />
      </g>

      {/* ======================================================== */}
      {/* 5. TYPOGRAPHY & HEADER WIDGETS                           */}
      {/* ======================================================== */}

      {/* Brand Label: UQLEARN */}
      <text
        x="800"
        y="262"
        textAnchor="middle"
        className="uql-cinzel"
        fontWeight="700"
        fontSize="28"
        letterSpacing="8"
        fill="#0f172a"
      >
        UQLEARN
      </text>

      {/* Main Heading: CERTIFICATE */}
      <text
        x="800"
        y="350"
        textAnchor="middle"
        className="uql-cinzel"
        fontWeight="800"
        fontSize="66"
        letterSpacing="4"
        fill="#0c192c"
      >
        CERTIFICATE
      </text>

      {/* Subheading: —— OF COMPLETION —— */}
      <g>
        <line x1="410" y1="400" x2="560" y2="400" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
        <text
          x="800"
          y="408"
          textAnchor="middle"
          className="uql-cinzel"
          fontWeight="700"
          fontSize="26"
          letterSpacing="8"
          fill="#0c192c"
        >
          OF COMPLETION
        </text>
        <line x1="1040" y1="400" x2="1190" y2="400" stroke="#d4af37" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Awarded To Label */}
      <text
        x="800"
        y="472"
        textAnchor="middle"
        className="uql-cinzel"
        fontWeight="600"
        fontSize="19"
        letterSpacing="5"
        fill="#475569"
      >
        AWARDED TO:
      </text>

      {/* Recipient Full Name (in Bold Royal Imperial Purple) */}
      <text
        x="800"
        y="565"
        textAnchor="middle"
        className="uql-cinzel"
        fontWeight="800"
        fontSize={studentFontSize}
        letterSpacing="3"
        fill={`url(#namePurple-${uid})`}
      >
        {studentName}
      </text>

      {/* Decorative Gold Divider with Center Diamond below name */}
      <g>
        <line x1="330" y1="605" x2="775" y2="605" stroke="#d4af37" strokeWidth="1.6" strokeLinecap="round" />
        <polygon points="800,597 808,605 800,613 792,605" fill="#d4af37" />
        <line x1="825" y1="605" x2="1270" y2="605" stroke="#d4af37" strokeWidth="1.6" strokeLinecap="round" />
      </g>

      {/* Recognition Statement */}
      <text
        x="800"
        y="652"
        textAnchor="middle"
        className="uql-body"
        fontWeight="400"
        fontSize="21"
        fill="#334155"
      >
        In Recognition for Successfully Completing
      </text>

      {/* Course Title and Completion Date Line */}
      <text
        x="800"
        y="690"
        textAnchor="middle"
        className="uql-body"
        fontSize={courseFontSize}
        fill="#334155"
      >
        <tspan fontWeight="700" fill="#044e54">
          {courseTitle}
        </tspan>
        {' '}Course on {completionDate}.
      </text>

      {/* ======================================================== */}
      {/* 6. SIGNATURES & QR VERIFICATION SECTION                 */}
      {/* ======================================================== */}

      {/* --- LEFT: COURSE INSTRUCTOR --- */}
      <g id="instructor-signature-group">
        {hasCustomInstructorSig ? (
          <image
            href={data.instructorSignature}
            xlinkHref={data.instructorSignature}
            x="210"
            y="715"
            width="340"
            height="120"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          /* Text-based Script Signature Fallback */
          <text
            x="380"
            y="810"
            textAnchor="middle"
            className="uql-script"
            fontSize="32"
            fill="#1e293b"
            opacity="0.8"
          >
            {data.instructorName || 'Michael Kenyanya'}
          </text>
        )}

        {/* Gold Separator Line with Diamond */}
        <line x1="220" y1="835" x2="365" y2="835" stroke="#d4af37" strokeWidth="1.6" />
        <polygon points="380,829 386,835 380,841 374,835" fill="#d4af37" />
        <line x1="395" y1="835" x2="540" y2="835" stroke="#d4af37" strokeWidth="1.6" />

        {/* Instructor Full Name - Always visible for professional clarity */}
        <text
          x="380"
          y="872"
          textAnchor="middle"
          className="uql-cinzel"
          fontWeight="700"
          fontSize="17"
          letterSpacing="2"
          fill="#0f172a"
        >
          {instructorName}
        </text>

        {/* Instructor Role Title */}
        <text
          x="380"
          y="897"
          textAnchor="middle"
          className="uql-body"
          fontWeight="600"
          fontSize="12"
          letterSpacing="2.5"
          fill="#475569"
        >
          COURSE INSTRUCTOR
        </text>
      </g>

      {/* --- CENTER: VERIFICATION QR CODE --- */}
      <g id="verification-qr-group">
        {/* Outer Styled Rounded Frame */}
        <rect
          x="735"
          y="738"
          width="130"
          height="130"
          rx="14"
          fill="#ffffff"
          stroke={`url(#qrBorder-${uid})`}
          strokeWidth="3.2"
          filter="drop-shadow(0 4px 6px rgba(0,0,0,0.06))"
        />

        {/* QR Code Matrix */}
        {data.qrDataUrl && (
          <image
            href={data.qrDataUrl}
            xlinkHref={data.qrDataUrl}
            x="745"
            y="748"
            width="110"
            height="110"
            preserveAspectRatio="none"
          />
        )}

        {/* Small Center QR Site Logo Badge */}
        <circle cx="800" cy="803" r="16" fill="#ffffff" stroke={`url(#purpleGrad-${uid})`} strokeWidth="1.5" />
        <image
          href={effectiveLogoUrl}
          xlinkHref={effectiveLogoUrl}
          x="786"
          y="789"
          width="28"
          height="28"
          preserveAspectRatio="xMidYMid meet"
        />

        {/* Scan to Verify text */}
        <text
          x="800"
          y="898"
          textAnchor="middle"
          className="uql-body"
          fontWeight="500"
          fontSize="16"
          fill="#1e293b"
        >
          Scan to verify.
        </text>

        {/* Credential ID */}
        <text
          x="800"
          y="924"
          textAnchor="middle"
          className="uql-body"
          fontWeight="600"
          fontSize="11"
          letterSpacing="1"
          fill="#64748b"
        >
          ID: {credentialId}
        </text>
      </g>

      {/* --- RIGHT: CEO UQLEARN SIGNATURE --- */}
      <g id="ceo-signature-group">
        {hasCustomCeoSig ? (
          <image
            href={data.ceoSignature}
            xlinkHref={data.ceoSignature}
            x="1050"
            y="715"
            width="340"
            height="120"
            preserveAspectRatio="xMidYMid meet"
          />
        ) : (
          /* Text-based Script Signature Fallback */
          <text
            x="1220"
            y="810"
            textAnchor="middle"
            className="uql-script"
            fontSize="32"
            fill="#1e293b"
            opacity="0.8"
          >
            {data.ceoName || 'Sir Rajab Wamuu'}
          </text>
        )}

        {/* Gold Separator Line with Diamond */}
        <line x1="1060" y1="835" x2="1205" y2="835" stroke="#d4af37" strokeWidth="1.6" />
        <polygon points="1220,829 1226,835 1220,841 1214,835" fill="#d4af37" />
        <line x1="1235" y1="835" x2="1380" y2="835" stroke="#d4af37" strokeWidth="1.6" />

        {/* CEO Full Name - Always visible */}
        <text
          x="1220"
          y="872"
          textAnchor="middle"
          className="uql-cinzel"
          fontWeight="700"
          fontSize="17"
          letterSpacing="2"
          fill="#0f172a"
        >
          {ceoName}
        </text>

        {/* CEO Role Title */}
        <text
          x="1220"
          y="897"
          textAnchor="middle"
          className="uql-body"
          fontWeight="600"
          fontSize="12"
          letterSpacing="2.5"
          fill="#475569"
        >
          {ceoTitle}
        </text>
      </g>
    </svg>
  );
};
