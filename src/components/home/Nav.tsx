import Link from "next/link";

export default function Nav() {
  return (
    <nav>
      <div className="brand">
        VENTURE<span>.</span>
      </div>
      <div className="navlinks">
        <a href="#explore">Explore</a>
        <a href="#finder">Find My Plot</a>
        <a href="#approach">Our Approach</a>
      </div>
      <div>
        <Link className="btn ghost" href="/admin">
          Admin Preview
        </Link>
        <a className="btn" href="#explore">
          Explore
        </a>
      </div>
    </nav>
  );
}
