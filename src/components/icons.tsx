import type { ReactNode } from 'react';

interface P {
  className?: string;
}

function svg(children: ReactNode, className?: string) {
  return (
    <svg
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className ?? 'h-5 w-5'}
    >
      {children}
    </svg>
  );
}

export const IconCheck = ({ className }: P) => svg(<path d="M5 12.5l4.5 4.5L19 7.5" />, className);
export const IconX = ({ className }: P) => svg(<path d="M6 6l12 12M18 6L6 18" />, className);
export const IconPlus = ({ className }: P) => svg(<path d="M12 5v14M5 12h14" />, className);
export const IconUp = ({ className }: P) => svg(<path d="M6 15l6-6 6 6" />, className);
export const IconDown = ({ className }: P) => svg(<path d="M6 9l6 6 6-6" />, className);
export const IconArrowRight = ({ className }: P) => svg(<path d="M5 12h14M13 6l6 6-6 6" />, className);
export const IconArrowLeft = ({ className }: P) => svg(<path d="M19 12H5M11 6l-6 6 6 6" />, className);
export const IconTrash = ({ className }: P) =>
  svg(<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a1 1 0 001 1h8a1 1 0 001-1l1-12M9 7V4h6v3" />, className);
export const IconEdit = ({ className }: P) => svg(<path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17l-1 3z" />, className);
export const IconCopy =({ className }: P) =>
  svg(
    <>
      <rect x="9" y="9" width="11" height="11" rx="2" />
      <path d="M5 15V6a2 2 0 012-2h9" />
    </>,
    className,
  );
export const IconShare = ({ className }: P) =>
  svg(<path d="M12 16V4M7 9l5-5 5 5M5 14v4a2 2 0 002 2h10a2 2 0 002-2v-4" />, className);
export const IconEye = ({ className }: P) =>
  svg(
    <>
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </>,
    className,
  );
export const IconWhatsapp = ({ className }: P) =>
  svg(<path d="M20 12a8 8 0 01-11.6 7.1L4 20l1-4.2A8 8 0 1120 12zM9.5 9c.3 2 1.8 3.8 4 5l1.3-1.1-1.6-1-.7.6c-.7-.4-1.3-1-1.6-1.7l.6-.7-.9-1.7z" />, className);
export const IconInstagram = ({ className }: P) =>
  svg(
    <>
      <rect x="4" y="4" width="16" height="16" rx="5" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="17.2" cy="6.8" r=".6" fill="currentColor" />
    </>,
    className,
  );
export const IconRefresh = ({ className }: P) =>
  svg(<path d="M20 11a8 8 0 00-14.5-4M4 5v4h4M4 13a8 8 0 0014.5 4M20 19v-4h-4" />, className);
