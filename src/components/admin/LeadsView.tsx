const APPLICATIONS = [
  {
    name: "Rahul K.",
    phone: "+91 98•••••210",
    venture: "Green Valley",
    interest: "P-124",
    source: "Website",
    salesPerson: "Ravi Kumar",
    status: "New",
    statusClass: "available",
    received: "3m",
  },
  {
    name: "Priya R.",
    phone: "+91 97•••••842",
    venture: "Green Valley",
    interest: "Site visit",
    source: "Instagram",
    salesPerson: "Anjali Reddy",
    status: "Visit",
    statusClass: "reserved",
    received: "18m",
  },
  {
    name: "Arjun S.",
    phone: "+91 99•••••391",
    venture: "Lakeview",
    interest: "220 Sq.Yds",
    source: "Referral",
    salesPerson: "Suresh Naik",
    status: "Contacted",
    statusClass: "hold",
    received: "42m",
  },
];

const KPIS = [
  { label: "Total applications", value: "486", note: "32 new this week" },
  { label: "New today", value: "19", note: "6 high intent" },
  { label: "Contacted", value: "351", note: "72%" },
  { label: "Site visit requested", value: "57", note: "12 upcoming" },
];

export default function LeadsView() {
  return (
    <section>
      <div className="eyebrow">Sales / Applications</div>
      <h1>Applications & leads</h1>
      <div className="admin-kpis">
        {KPIS.map((k) => (
          <div className="admin-kpi" key={k.label}>
            <small>{k.label}</small>
            <strong>{k.value}</strong>
            <span>{k.note}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <div className="cardhead">
          <b>Recent applications</b>
          <span>Filter · venture · status · date · source</span>
        </div>
        <table className="inventory">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone</th>
              <th>Venture</th>
              <th>Interest</th>
              <th>Source</th>
              <th>Sales Person</th>
              <th>Status</th>
              <th>Received</th>
            </tr>
          </thead>
          <tbody>
            {APPLICATIONS.map((a) => (
              <tr key={a.name}>
                <td>{a.name}</td>
                <td>{a.phone}</td>
                <td>{a.venture}</td>
                <td>{a.interest}</td>
                <td>{a.source}</td>
                <td>
                  <b>{a.salesPerson}</b>
                </td>
                <td>
                  <span className={`badge ${a.statusClass}`}>{a.status}</span>
                </td>
                <td>{a.received}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
