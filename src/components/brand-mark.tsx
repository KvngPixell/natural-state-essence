/**
 * Natural State brand mark — the Arkansas outline with pines, drawn from real
 * state geography: the Missouri bootheel notch in the north-east, the
 * Mississippi River's south-west taper down the east side, and the step in the
 * south-west where the Texas line sits east of the Oklahoma line.
 */
const AR = "M 0.0,0.0 L 89.9,0.0 L 89.9,14.29 L 100.0,14.29 L 99.58,20.0 L 93.56,25.71 L 95.04,31.43 L 90.12,37.14 L 92.5,42.86 L 86.68,48.57 L 87.76,54.29 L 81.14,60.0 L 83.22,65.71 L 78.2,71.43 L 79.98,77.14 L 74.66,82.86 L 75.44,88.57 L 69.42,94.29 L 70.6,100.0 L 11.6,100.0 L 11.6,83.8 L 0.0,80.0 Z M 24,50 L 27.68,58.64 L 26.08,58.64 L 29.6,66.78 L 27.2,66.78 L 32.0,75.42 L 25.28,75.42 L 25.28,81 L 22.72,81 L 22.72,75.42 L 16.0,75.42 L 20.8,66.78 L 18.4,66.78 L 21.92,58.64 L 20.32,58.64 Z M 38,37 L 43.06,49.27 L 40.86,49.27 L 45.7,60.81 L 42.4,60.81 L 49.0,73.08 L 39.76,73.08 L 39.76,81 L 36.24,81 L 36.24,73.08 L 27.0,73.08 L 33.6,60.81 L 30.3,60.81 L 35.14,49.27 L 32.94,49.27 Z M 52,48 L 56.14,57.2 L 54.34,57.2 L 58.3,65.86 L 55.6,65.86 L 61.0,75.06 L 53.44,75.06 L 53.44,81 L 50.56,81 L 50.56,75.06 L 43.0,75.06 L 48.4,65.86 L 45.7,65.86 L 49.66,57.2 L 47.86,57.2 Z";

export function BrandMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="-4 -4 108 108" className={className} role="img" aria-label="Natural State Peptides">
      <path fill="currentColor" fillRule="evenodd" d={AR} />
    </svg>
  );
}

/** Circular seal treatment: forest disc, thin gold ring, ivory state. */
export function BrandSeal({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 140 140" className={className} role="img" aria-label="Natural State Peptides">
      <circle cx="70" cy="70" r="68" fill="var(--forest)" />
      <circle cx="70" cy="70" r="59" fill="none" stroke="var(--gold)" strokeWidth="1.1" />
      <g transform="translate(70,70) scale(0.78) translate(-50,-50)">
        <path fill="var(--ivory)" fillRule="evenodd" d={AR} />
      </g>
    </svg>
  );
}
