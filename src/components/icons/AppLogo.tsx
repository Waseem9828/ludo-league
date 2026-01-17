import { SVGProps } from 'react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <path d="M3 9h18" />
      <path d="M3 15h18" />
      <path d="M9 3v18" />
      <path d="M15 3v18" />
       <circle cx="9" cy="9" r="1.5" fill="currentColor" stroke="none" />
       <circle cx="15" cy="9" r="1.5" fill="currentColor" stroke="none" />
       <circle cx="9" cy="15" r="1.5" fill="currentColor" stroke="none" />
       <circle cx="15" cy="15" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
