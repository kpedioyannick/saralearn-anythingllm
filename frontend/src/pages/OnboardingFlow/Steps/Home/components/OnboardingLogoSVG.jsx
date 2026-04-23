import { useTheme } from "@/hooks/useTheme";

export function OnboardingLogoSVG() {
  const { isLight } = useTheme();
  const opacity = isLight ? 0.5 : 0.28;

  return (
    <svg
      viewBox="0 0 520 520"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-auto"
    >
      <defs>
        <linearGradient id="sara-grad" x1="0" y1="0" x2="520" y2="520" gradientUnits="userSpaceOnUse">
          {isLight ? (
            <>
              <stop stopColor="#118c44" stopOpacity="0.6" />
              <stop offset="0.5" stopColor="#4ade80" stopOpacity="0.3" />
              <stop offset="1" stopColor="#118c44" stopOpacity="0.5" />
            </>
          ) : (
            <>
              <stop stopColor="#118c44" stopOpacity={opacity} />
              <stop offset="0.5" stopColor="#4ade80" stopOpacity={opacity * 0.5} />
              <stop offset="1" stopColor="#0d7a3a" stopOpacity={opacity} />
            </>
          )}
        </linearGradient>
        <filter id="sara-shadow" x="-5%" y="-5%" width="110%" height="120%">
          <feOffset dy="12" />
          <feGaussianBlur stdDeviation="6" />
          <feComposite in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" />
          <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.15 0" />
        </filter>
      </defs>

      {/* Lettre S géante stylisée */}
      <g filter="url(#sara-shadow)">
        <path
          d="
            M340 80
            C290 50 160 55 130 130
            C100 200 160 240 220 265
            L280 288
            C340 312 390 345 380 415
            C370 480 270 470 210 460
            C160 452 120 428 95 400
            L55 440
            C90 475 150 510 240 515
            C360 522 440 465 440 390
            C440 310 370 270 300 245
            L240 222
            C185 202 148 178 155 125
            C162 78 240 72 300 82
            C335 88 368 102 390 122
            L425 80
            C400 58 372 92 340 80
            Z
          "
          fill="url(#sara-grad)"
        />
        {/* Point décoratif / feuille */}
        <path
          d="M390 55 Q430 20 450 40 Q425 65 390 55Z"
          fill="url(#sara-grad)"
          opacity="0.7"
        />
      </g>
    </svg>
  );
}
