export function SearchIcon({ className = "search-icon" }: { className?: string }) {
  return (
    <svg aria-hidden="true" className={className} viewBox="0 0 24 24">
      <path
        d="M10.8 5.2a5.6 5.6 0 1 1 0 11.2 5.6 5.6 0 0 1 0-11.2Zm0-2.2a7.8 7.8 0 1 0 4.85 13.9l3.72 3.73 1.56-1.56-3.73-3.72A7.8 7.8 0 0 0 10.8 3Z"
        fill="currentColor"
      />
    </svg>
  );
}
