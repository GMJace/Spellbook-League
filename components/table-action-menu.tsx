import type { CSSProperties, ReactNode } from "react";

export function TableActionMenu({
  children,
  label = "Actions",
  panelStyle,
  summaryClassName,
}: {
  children: ReactNode;
  label?: string;
  panelStyle?: CSSProperties;
  summaryClassName?: string;
}) {
  return (
    <details className="table-action-menu">
      <summary
        className={[
          "button button-secondary button-small table-action-menu-summary",
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
