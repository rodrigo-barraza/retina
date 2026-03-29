"use client";

import Link from "next/link";

/**
 * CountLinkComponent — renders a count as a navigable link with an icon,
 * or a muted "0" when the count is zero. Replaces 6 identical inline
 * renderers in the admin dashboard tables.
 *
 * @param {number}    count     — the numeric value to display
 * @param {string}    href      — navigation target
 * @param {Component} icon      — lucide-react icon component
 * @param {string}    className — CSS class for the link
 */
export default function CountLinkComponent({
  count,
  href,
  icon: Icon,
  className,
}) {
  if (!count || count <= 0) {
    return <span style={{ color: "var(--text-muted)" }}>0</span>;
  }

  return (
    <Link href={href} className={className}>
      <Icon size={12} />
      {count}
    </Link>
  );
}
