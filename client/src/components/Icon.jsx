const paths = {
  image: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8" cy="8" r="2" />
      <path d="m3 17 6-6 4 4 3-3 5 5" />
    </>
  ),
  wifi: (
    <>
      <path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0m-10 4a5 5 0 0 1 6 0" />
      <circle cx="12" cy="20" r="1" />
    </>
  ),
  board: (
    <>
      <path d="M3 3h18v13H3zm9 13v5m-5 0 5-5 5 5M7 7h10M7 11h6" />
    </>
  ),
  projector: (
    <>
      <rect x="3" y="7" width="18" height="11" rx="2" />
      <circle cx="16" cy="12.5" r="3" />
      <path d="M6 11h3m-3 4h3M6 18v3m12-3v3" />
    </>
  ),
  chair: (
    <>
      <path d="M7 12V4h10v8M4 12h16v6H4zm3 6v4m10-4v4" />
    </>
  ),
  screen: (
    <>
      <rect x="3" y="4" width="18" height="13" rx="2" />
      <path d="M12 17v4m-5 0h10" />
    </>
  ),
  plug: (
    <>
      <path d="M8 3v5m8-5v5M5 8h14v4a7 7 0 0 1-14 0zm7 11v3" />
    </>
  ),
  climate: (
    <>
      <path d="M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M9 4l3 3 3-3m-6 16 3-3 3 3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1 1m12 12 1 1M5 19l1-1M18 6l1-1" />
    </>
  ),
  window: (
    <>
      <path d="M4 3h16v18H4zm8 0v18M4 10h16M7 4v5m10-5v5" />
    </>
  ),
  quiet: (
    <>
      <path d="m11 4-5 5H3v6h3l5 5zm4 5 6 6m0-6-6 6" />
    </>
  ),
  water: <path d="M12 2s-7 8-7 13a7 7 0 0 0 14 0C19 10 12 2 12 2Z" />,
  video: (
    <>
      <rect x="3" y="5" width="12" height="14" rx="2" />
      <path d="m15 10 6-4v12l-6-4" />
    </>
  ),
  access: (
    <>
      <circle cx="12" cy="4" r="2" />
      <path d="M4 9h16m-8-3v8m0 0-5 8m5-8 5 8" />
    </>
  ),
  rooms: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4m10-4v4M3 11h18m-13 5h2m4 0h2" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 21v-3a6 6 0 0 1 12 0v3m2-16a3 3 0 0 1 0 6m2 10v-3a6 6 0 0 0-2-4" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
    </>
  ),
  logout: (
    <>
      <path d="M9 4H4v16h5m6-13 5 5-5 5m-7-5h12" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  check: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  pause: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9 9v6m6-6v6" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5M4 17v-5h5" />
      <path d="M6 6a8 8 0 0 1 14 6M4 12a8 8 0 0 0 14 6" />
    </>
  ),
  pin: (
    <>
      <path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  trash: (
    <>
      <path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7" />
    </>
  ),
  edit: (
    <>
      <path d="m15 4 5 5M4 20l5-1L21 7l-5-5L4 14Z" />
    </>
  ),
};
export default function Icon({ name }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.rooms}
    </svg>
  );
}
