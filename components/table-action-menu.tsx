import type { CSSProperties, ReactNode } from "react";

export function TableActionMenu({
  children,
  label = "Actions",
  panelStyle,
  summaryClassName,
  summarySmall = true,
}: {
  children: ReactNode;
  label?: string;
  panelStyle?: CSSProperties;
  summaryClassName?: string;
  summarySmall?: boolean;
}) {
  return (
    <details className="table-action-menu">
      <summary
        className={[
          "button button-secondary table-action-menu-summary",
          summarySmall ? "button-small" : "",
          summaryClassName ?? "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {label}
      </summary>
      <div className="table-action-menu-panel stack" style={panelStyle}>
        {children}
      </div>
    </details>
  );
}
