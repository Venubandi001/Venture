export default function LayoutsView() {
  return (
    <section>
      <div className="eyebrow">GIS / Layouts</div>
      <h1>Master layout & spatial data</h1>
      <div className="card">
        <div className="cardhead">
          <b>Green Valley GIS assets</b>
          <div className="layout-tools">
            <button>Upload KML / KMZ</button>
            <button>Upload GeoJSON</button>
            <button>Upload CAD</button>
            <button>Upload layout image</button>
          </div>
        </div>
        <p style={{ fontSize: 11, color: "#7b867f" }}>
          For production accuracy, upload the surveyed plot boundaries. These
          coordinates will drive both the customer map and admin map.
        </p>
        <div className="upload" style={{ marginTop: 15 }}>
          Drop master layout / KML / GeoJSON here
          <br />
          <b>Boundary → Roads → Amenities → Plot polygons</b>
        </div>
      </div>
    </section>
  );
}
