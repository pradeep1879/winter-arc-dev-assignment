import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { postsApi } from "../api";
import { getErrorMessage } from "../api/client";
import PostForm from "../components/PostForm";
import { useAuth } from "../features/auth/AuthContext";

export default function EditPostPage() {
  const { id = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: post, isLoading, error } = useQuery({ queryKey: ["post", id, user?.id], queryFn: () => postsApi.get(id) });

  if (isLoading) return <p className="state">Loading…</p>;
  if (error || !post) return <div className="error">{getErrorMessage(error)}</div>;
  if (post.authorId !== user?.id) return <Navigate to="/" replace />;

  return (
    <>
      <h1 className="page-title">Edit post</h1>
      <PostForm
        initial={{ title: post.title, content: post.content, published: post.published }}
        submitLabel="Save changes"
        onSubmit={async (data) => {
          const updated = await postsApi.update(post.id, data);
          qc.invalidateQueries({ queryKey: ["posts"] });
          qc.invalidateQueries({ queryKey: ["post"] });
          navigate(`/posts/${updated.slug}`);
        }}
      />
    </>
  );
}
