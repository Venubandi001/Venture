"use client";

import { AdminView, SIDEBAR_SECTIONS, MOBILE_NAV } from "@/lib/adminViews";

export function AdminMobileNav({
  active,
  onSelect,
}: {
  active: AdminView;
  onSelect: (view: AdminView) => void;
}) {
  return (
    <nav className="admin-mobile-nav" aria-label="Admin navigation">
      {MOBILE_NAV.map((item) => (
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
}: {
  active: AdminView;
  onSelect: (view: AdminView) => void;
}) {
  return (
    <aside className="side">
      {SIDEBAR_SECTIONS.map((section, i) => (
        <div key={i}>
          {section.title ? <div className="navtitle">{section.title}</div> : null}
          {section.items.map((item) =>
            i === 0 ? (
              <b
                key={item.view}
                data-view={item.view}
                className={active === item.view ? "active" : ""}
                onClick={() => onSelect(item.view)}
              >
                {item.label}
              </b>
            ) : (
              <div
                key={item.view}
                data-view={item.view}
                className={active === item.view ? "active" : ""}
                onClick={() => onSelect(item.view)}
              >
                {item.label}
              </div>
            )
          )}
        </div>
      ))}
    </aside>
  );
}
