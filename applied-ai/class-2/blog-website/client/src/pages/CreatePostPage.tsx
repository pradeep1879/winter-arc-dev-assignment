import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { postsApi } from "../api";
import PostForm from "../components/PostForm";

export default function CreatePostPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  return (
    <>
      <h1 className="page-title">New post</h1>
      <PostForm
        submitLabel="Create post"
        onSubmit={async (data) => {
          const post = await postsApi.create(data);
          qc.invalidateQueries({ queryKey: ["posts"] });
          navigate(`/posts/${post.slug}`);
        }}
      />
    </>
  );
}
