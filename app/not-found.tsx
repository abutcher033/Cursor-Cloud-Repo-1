import Link from "next/link";

export default function NotFound() {
  return (
    <>
      <h1>Not in the catalog</h1>
      <p className="sub">That listing isn’t in the local fixture set.</p>
      <Link className="primary" href="/results">Back to explore</Link>
    </>
  );
}
