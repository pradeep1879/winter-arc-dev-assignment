import { useQuery } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { postsApi } from "../api";
import { getErrorMessage } from "../api/client";
import Pagination from "../components/Pagination";
import PostCard from "../components/PostCard";
import { useAuth } from "../features/auth/AuthContext";

export default function HomePage() {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["posts", page, search, user?.id],
    queryFn: () => postsApi.list({ page, limit: 6, search: search || undefined }),
    placeholderData: (prev) => prev,
  });

  const onSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(input.trim());
  };

  return (
    <>
      <h1 className="page-title">Latest posts</h1>
      <form className="search" onSubmit={onSearch}>
        <input type="search" aria-label="Search posts" placeholder="Search posts…" value={input} onChange={(e) => setInput(e.target.value)} />
        <button className="btn">Search</button>
      </form>
      {isLoading && <p className="state">Loading posts…</p>}
      {error && <div className="error">{getErrorMessage(error)}</div>}
      {data && data.items.length === 0 && <p className="state">No posts found.</p>}
      <div className="post-list">{data?.items.map((p) => <PostCard key={p.id} post={p} />)}</div>
      {data && <Pagination page={data.page} totalPages={data.totalPages} onChange={setPage} />}
    </>
  );
}
