import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../features/auth/AuthContext";
import ThemeToggle from "./ThemeToggle";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="shell">
      <header className="navbar">
        <div className="container nav-inner">
          <Link to="/" className="brand">BlogSpace</Link>
          <nav className="nav-links">
            <NavLink to="/" end>Home</NavLink>
            {user ? (
              <>
                <NavLink to="/posts/new">Write</NavLink>
                <span className="nav-user">{user.name}</span>
                <button className="btn btn-ghost btn-sm" onClick={() => { logout(); navigate("/"); }}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login">Log in</NavLink>
                <Link to="/register" className="btn btn-sm">Sign up</Link>
              </>
            )}
            <ThemeToggle />
          </nav>
        </div>
      </header>
      <main className="container main">
        <Outlet />
      </main>
      <footer className="footer">
        <div className="container">© {new Date().getFullYear()} BlogSpace</div>
      </footer>
    </div>
  );
}
