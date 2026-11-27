import { Link } from "react-router-dom";
import type { Post } from "../types";

const fmt = (d: string) => new Date(d).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });

export default function PostCard({ post }: { post: Post }) {
  const n = post._count.comments;
  return (
    <article className="post-item">
      <h2>
        <Link to={`/posts/${post.slug}`}>{post.title}</Link>
        {!post.published && <span className="badge">Draft</span>}
      </h2>
      <p className="excerpt">{post.content.length > 180 ? post.content.slice(0, 180).trimEnd() + "…" : post.content}</p>
      <div className="meta">
        <span>{post.author.name}</span>
        <span className="dot" aria-hidden="true">·</span>
        <time dateTime={post.createdAt}>{fmt(post.createdAt)}</time>
        <span className="dot" aria-hidden="true">·</span>
        <span>{n} {n === 1 ? "comment" : "comments"}</span>
      </div>
    </article>
  );
}
