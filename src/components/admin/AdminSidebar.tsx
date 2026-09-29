"use client";

import { AdminView, SIDEBAR_SECTIONS, MOBILE_NAV } from "@/shared/adminViews";

export function AdminMobileNav({
  active,
  onSelect,
  hidden,
}: {
  active: AdminView;
  onSelect: (view: AdminView) => void;
  hidden: AdminView[];
}) {
  return (
    <nav className="admin-mobile-nav" aria-label="Admin navigation">
      {MOBILE_NAV.filter((item) => !hidden.includes(item.view)).map((item) => (
        <button
          key={item.view}
          className={active === item.view ? "active" : ""}
          onClick={() => onSelect(item.view)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

export function AdminSideNav({
  active,
  onSelect,
  hidden,
}: {
  active: AdminView;
  onSelect: (view: AdminView) => void;
  hidden: AdminView[];
}) {
  return (
    <aside className="side">
      {SIDEBAR_SECTIONS.map((section, i) => (
        <div key={i}>
          {section.title ? <div className="navtitle">{section.title}</div> : null}
          {section.items.filter((item) => !hidden.includes(item.view)).map((item) => (
            <button
              key={item.view}
              type="button"
              data-view={item.view}
              className={`side-item ${i === 0 ? "first" : ""} ${active === item.view ? "active" : ""}`}
              aria-current={active === item.view ? "page" : undefined}
              onClick={() => onSelect(item.view)}
            >
              {item.label}
            </button>
          ))}
        </div>
      ))}
    </aside>
  );
}
