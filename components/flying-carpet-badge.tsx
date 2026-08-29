type FlyingCarpetBadgeProps = {
  className?: string;
};

export function FlyingCarpetBadge({ className }: FlyingCarpetBadgeProps) {
  return (
    <img
      alt="Tome Key Badge early access crest"
      className={className}
      src="/tome key.png"
    />
  );
}
