const ITEMS = [
  { label: "Leads & applications", value: "214 active" },
  { label: "Customers", value: "391 records" },
  { label: "Site visits", value: "12 upcoming" },
  { label: "Bookings & payments", value: "73 bookings" },
  { label: "Reports", value: "Monthly / venture / sales" },
  { label: "Documents", value: "Approvals / deeds / layouts" },
  { label: "Users & roles", value: "6 admins" },
  { label: "Audit log", value: "All changes tracked" },
];

export default function OtherView({ title }: { title: string }) {
  return (
    <section>
      <div className="eyebrow">Operations</div>
      <h1>{title}</h1>
      <div className="card">
        <div className="cardhead">
          <b>{title} workspace</b>
        </div>
        <div className="mini-list">
          {ITEMS.map((item) => (
            <p key={item.label}>
              {item.label} <b>{item.value}</b>
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}
