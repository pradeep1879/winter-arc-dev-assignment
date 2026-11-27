import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { postsApi } from "../api";
import { getErrorMessage } from "../api/client";
import Comments from "../components/Comments";
import { useAuth } from "../features/auth/AuthContext";

export default function PostDetailPage() {
  const { slug = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data: post, isLoading, error } = useQuery({ queryKey: ["post", slug, user?.id], queryFn: () => postsApi.get(slug) });
  const remove = useMutation({
    mutationFn: () => postsApi.remove(post!.id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["posts"] }); navigate("/"); },
  });

  if (isLoading) return <p className="state">Loading…</p>;
  if (error || !post) return <div className="error">{getErrorMessage(error)}</div>;

  const isOwner = user?.id === post.authorId;

  return (
    <article className="post">
      <h1 className="post-title">{post.title}</h1>
      <div className="meta">
        {post.author.name} · {new Date(post.createdAt).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })}
        {!post.published && <span className="badge">Draft</span>}
      </div>
      {isOwner && (
        <div className="actions">
          <Link className="btn btn-ghost btn-sm" to={`/posts/${post.id}/edit`}>Edit</Link>
          <button className="btn btn-danger btn-sm" disabled={remove.isPending}
            onClick={() => confirm("Delete this post?") && remove.mutate()}>Delete</button>
        </div>
      )}
      {remove.isError && <div className="error">{getErrorMessage(remove.error)}</div>}
      <div className="post-content">{post.content}</div>
      <Comments postId={post.id} postAuthorId={post.authorId} />
    </article>
  );
}
