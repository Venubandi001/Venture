"use client";

import { useState } from "react";

const FAQS = [
  {
    q: "Is the availability shown really live?",
    a: "Yes. Every time our team marks a plot on hold, reserved or sold in the admin console, the map and plot list update instantly for anyone viewing the page.",
  },
  {
    q: "Can I visit the site before booking?",
    a: "Absolutely. Selecting any plot gives you a \"Request Site Visit\" option that reaches our sales team directly.",
  },
  {
    q: "What documents will I need for booking?",
    a: "A valid ID and PAN are required to start a booking application. Our team will guide you through the rest during KYC.",
  },
  {
    q: "Do the plots shown match the real boundaries?",
    a: "Yes, plot polygons are drawn against the satellite imagery of the actual surveyed venture location.",
  },
  {
    q: "Can I pay in installments?",
    a: "Yes, both self-funded and bank-finance payment plans are supported and can be discussed during the booking application.",
  },
];

export default function Faq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="section" id="faq">
      <div className="sectionhead">
        <div>
          <div className="eyebrow">06 / Questions</div>
          <h2>Frequently asked.</h2>
        </div>
        <p>Still unsure? Reach out and our team will help directly.</p>
      </div>
      <div className="faq-list">
        {FAQS.map((item, i) => {
          const open = openIndex === i;
          return (
            <div className={`faq-item ${open ? "open" : ""}`} key={item.q}>
              <button
                className="faq-question"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
              >
                {item.q}
                <span className="faq-toggle">{open ? "−" : "+"}</span>
              </button>
              {open ? <p className="faq-answer">{item.a}</p> : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
