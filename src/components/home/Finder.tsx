"use client";

import { useToast } from "../ToastProvider";

export default function Finder() {
  const showToast = useToast();

  return (
    <section className="section" id="finder">
      <div className="finder">
        <div className="eyebrow">02 / Discover</div>
        <h2>Find your plot.</h2>
        <p>Tell us what matters. We’ll highlight the plots that match.</p>
        <div className="filters">
          <label>
            Budget
            <select>
              <option>₹30L – ₹40L</option>
              <option>₹40L – ₹50L</option>
              <option>₹50L+</option>
            </select>
          </label>
          <label>
            Plot size
            <select>
              <option>150 – 220 Sq.Yds</option>
              <option>220 – 300 Sq.Yds</option>
              <option>300+ Sq.Yds</option>
            </select>
          </label>
          <label>
            Facing
            <select>
              <option>Any facing</option>
              <option>East</option>
              <option>North</option>
              <option>West</option>
            </select>
          </label>
          <label>
            Corner
            <select>
              <option>Any</option>
              <option>Corner only</option>
            </select>
          </label>
        </div>
        <button
          className="btn"
          onClick={() => showToast("8 matching plots highlighted on the layout")}
        >
          Find matching plots →
        </button>
      </div>
    </section>
  );
}
