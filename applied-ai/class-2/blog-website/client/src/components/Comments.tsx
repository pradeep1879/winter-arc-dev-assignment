import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { commentsApi } from "../api";
import { getErrorMessage } from "../api/client";
import { useAuth } from "../features/auth/AuthContext";
import type { Comment } from "../types";

function CommentItem({ c, postId, postAuthorId }: { c: Comment; postId: number; postAuthorId: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(c.content);
  const refresh = () => qc.invalidateQueries({ queryKey: ["comments", postId] });

  const update = useMutation({
    mutationFn: () => commentsApi.update(postId, c.id, text),
    onSuccess: () => { setEditing(false); refresh(); },
  });
  const remove = useMutation({ mutationFn: () => commentsApi.remove(postId, c.id), onSuccess: refresh });

  const isOwner = user?.id === c.authorId;
  const canDelete = isOwner || user?.id === postAuthorId;

  return (
    <li className="comment">
      <div className="meta"><strong>{c.author.name}</strong> · {new Date(c.createdAt).toLocaleString()}</div>
      {editing ? (
        <>
          <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} />
          {update.isError && <div className="error">{getErrorMessage(update.error)}</div>}
          <div className="actions">
            <button className="btn" onClick={() => update.mutate()} disabled={update.isPending || !text.trim()}>Save</button>
            <button className="btn btn-ghost" onClick={() => { setEditing(false); setText(c.content); }}>Cancel</button>
          </div>
        </>
      ) : (
        <p>{c.content}</p>
      )}
      {!editing && (isOwner || canDelete) && (
        <div className="actions">
          {isOwner && <button className="link-btn" onClick={() => setEditing(true)}>Edit</button>}
          {canDelete && (
            <button className="link-btn danger" onClick={() => confirm("Delete this comment?") && remove.mutate()}>Delete</button>
          )}
        </div>
      )}
    </li>
  );
}

export default function Comments({ postId, postAuthorId }: { postId: number; postAuthorId: number }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const { data, isLoading, error } = useQuery({ queryKey: ["comments", postId], queryFn: () => commentsApi.list(postId) });

  const add = useMutation({
    mutationFn: () => commentsApi.create(postId, text),
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["comments", postId] });
      qc.invalidateQueries({ queryKey: ["post"] });
      qc.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (text.trim()) add.mutate();
  };

  return (
    <section className="comments">
      <h2>Comments <span className="muted">({data?.length ?? 0})</span></h2>
      {user ? (
        <form onSubmit={submit} className="form">
          <textarea rows={3} placeholder="Write a comment…" value={text} onChange={(e) => setText(e.target.value)} />
          {add.isError && <div className="error">{getErrorMessage(add.error)}</div>}
          <button className="btn" disabled={add.isPending || !text.trim()}>Post comment</button>
        </form>
      ) : (
        <p className="muted"><Link to="/login">Log in</Link> to join the discussion.</p>
      )}
      {isLoading && <p className="state">Loading comments…</p>}
      {error && <div className="error">{getErrorMessage(error)}</div>}
      <ul className="comment-list">
        {data?.map((c) => <CommentItem key={c.id} c={c} postId={postId} postAuthorId={postAuthorId} />)}
      </ul>
    </section>
  );
}
