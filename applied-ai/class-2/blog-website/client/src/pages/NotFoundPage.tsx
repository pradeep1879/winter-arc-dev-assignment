import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="state">
      <h1 className="page-title">404</h1>
      <p>Page not found.</p>
      <Link to="/">Go home</Link>
    </div>
  );
}
