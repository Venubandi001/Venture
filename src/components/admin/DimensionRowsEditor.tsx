"use client";

import { DimensionRow } from "@/lib/types";

const FACINGS = [
  "East", "West", "North", "South",
  "North-East", "North-West", "South-East", "South-West",
];

export default function DimensionRowsEditor({
  rows,
  onChange,
}: {
  rows: DimensionRow[];
  onChange: (rows: DimensionRow[]) => void;
}) {
  function update(index: number, patch: Partial<DimensionRow>) {
    onChange(rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function remove(index: number) {
    onChange(rows.filter((_, i) => i !== index));
  }

  function add() {
    onChange([
      ...rows,
      { area: "", dims: "", price: "", road: "", facing: "East" },
    ]);
  }

  return (
    <div>
      <div className="dimension-toolbar">
        <button type="button" className="btn ghost" onClick={add}>
          + Add dimension
        </button>
        <span>
          {rows.length} dimension type{rows.length === 1 ? "" : "s"} configured
        </span>
      </div>
      <div className="dimension-list">
        {rows.map((row, i) => (
          <div className="dimension-row" key={i}>
            <div>
              <label>Area (Sq.Yds)</label>
              <input
                value={row.area}
                placeholder="150"
                onChange={(e) => update(i, { area: e.target.value })}
              />
            </div>
            <div>
              <label>Dimensions (FT)</label>
              <input
                value={row.dims}
                placeholder="30 × 45"
                onChange={(e) => update(i, { dims: e.target.value })}
              />
            </div>
            <div>
              <label>Price</label>
              <input
                value={row.price}
                placeholder="₹32L"
                onChange={(e) => update(i, { price: e.target.value })}
              />
            </div>
            <div>
              <label>Road width (FT)</label>
              <input
                value={row.road}
                placeholder="30"
                onChange={(e) => update(i, { road: e.target.value })}
              />
            </div>
            <div>
              <label>Facing</label>
              <select
                value={row.facing}
                onChange={(e) => update(i, { facing: e.target.value })}
              >
                {FACINGS.map((f) => (
                  <option key={f}>{f}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="dimension-remove"
              onClick={() => remove(i)}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
