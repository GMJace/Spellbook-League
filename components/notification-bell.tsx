"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/app/notifications/actions";
import type { UserNotification } from "@/lib/notifications";

function formatNotificationTimestamp(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-CA", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function NotificationBell({
  notifications,
  unreadCount,
}: {
  notifications: UserNotification[];
  unreadCount: number;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    window.addEventListener("mousedown", handlePointerDown);

    return () => {
      window.removeEventListener("mousedown", handlePointerDown);
    };
  }, []);

  return (
    <div className="notification-menu" ref={rootRef}>
      <button
        type="button"
        className="notification-trigger"
        aria-label={`Open notifications${unreadCount ? ` (${unreadCount} unread)` : ""}`}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M12 3.75a4.75 4.75 0 0 0-4.75 4.75v2.08c0 .78-.2 1.55-.57 2.23l-1.2 2.17a1.5 1.5 0 0 0 1.31 2.22h10.42a1.5 1.5 0 0 0 1.31-2.22l-1.2-2.17a4.7 4.7 0 0 1-.57-2.23V8.5A4.75 4.75 0 0 0 12 3.75Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M9.75 18.75a2.25 2.25 0 0 0 4.5 0"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
        {unreadCount ? (
          <span className="notification-badge">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="notification-dropdown">
          <div className="notification-header">
            <div>
              <strong>Notifications</strong>
              <div className="muted">
                {unreadCount ? `${unreadCount} unread` : "You are all caught up."}
              </div>
            </div>
            {unreadCount ? (
              <form action={markAllNotificationsRead}>
                <button type="submit" className="notification-mark-all">
                  Mark all read
                </button>
              </form>
            ) : null}
          </div>

          <div className="notification-list">
            {notifications.length ? (
              notifications.map((notification) => (
                <article
                  key={notification.id}
                  className={`notification-card${notification.isRead ? "" : " unread"}`}
                >
                  <div className="notification-card-header">
                    <strong>{notification.title}</strong>
                    <span className="muted">
                      {formatNotificationTimestamp(notification.createdAt)}
                    </span>
                  </div>
                  <p className="notification-body">{notification.body}</p>
                  {notification.details.length ? (
                    <dl className="notification-details">
                      {notification.details.map((detail) => (
                        <div key={`${notification.id}-${detail.label}`}>
                          <dt>{detail.label}</dt>
                          <dd>{detail.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : null}
                  <div className="notification-actions-row">
                    {notification.actionHref && notification.actionLabel ? (
                      <Link
                        href={notification.actionHref}
                        className="notification-link"
                        onClick={() => setOpen(false)}
                      >
                        {notification.actionLabel}
                      </Link>
                    ) : (
                      <span />
                    )}
                    {!notification.isRead ? (
                      <form action={markNotificationRead}>
                        <input
                          type="hidden"
                          name="notificationId"
                          value={notification.id}
                        />
                        <button type="submit" className="notification-mark-read">
                          Mark read
                        </button>
                      </form>
                    ) : null}
                  </div>
                </article>
              ))
            ) : (
              <div className="empty">No notifications yet.</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
