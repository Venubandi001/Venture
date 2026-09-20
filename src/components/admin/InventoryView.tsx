import { buildInventory } from "@/lib/ventures";

export default function InventoryView({ ventureBrand }: { ventureBrand: string }) {
  const rows = buildInventory(ventureBrand);

  return (
    <section>
      <div className="eyebrow">Sales / Plot inventory</div>
      <h1>Plot inventory</h1>
      <div className="card">
        <div className="tabs">
          <button className="tab active">All 240</button>
          <button className="tab">Available 126</button>
          <button className="tab">Hold 11</button>
          <button className="tab">Reserved 18</button>
          <button className="tab">Sold 85</button>
        </div>
        <table className="inventory">
          <thead>
            <tr>
              <th>Plot</th>
              <th>Venture</th>
              <th>Area</th>
              <th>Facing</th>
              <th>Road</th>
              <th>Price</th>
              <th>Status</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.plot}>
                <td>
                  <b>{r.plot}</b>
                </td>
                <td>{r.venture}</td>
                <td>{r.area} Sq.Yds</td>
                <td>{r.facing}</td>
                <td>{r.road} FT</td>
                <td>₹{r.price}L</td>
                <td>
                  <span className={`badge ${r.status}`}>{r.status.toUpperCase()}</span>
                </td>
                <td>{r.updatedMinutes}m</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
