import { useState, type FormEvent } from "react";
import { getErrorMessage } from "../api/client";
import type { PostInput } from "../types";

interface Props {
  initial?: PostInput;
  submitLabel: string;
  onSubmit: (data: PostInput) => Promise<void>;
}

export default function PostForm({ initial, submitLabel, onSubmit }: Props) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [content, setContent] = useState(initial?.content ?? "");
  const [published, setPublished] = useState(initial?.published ?? true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (title.trim().length < 3) return setError("Title must be at least 3 characters");
    if (content.trim().length < 10) return setError("Content must be at least 10 characters");
    setBusy(true);
    try {
      await onSubmit({ title, content, published });
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="error">{error}</div>}
      <label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} /></label>
      <label>Content<textarea rows={12} value={content} onChange={(e) => setContent(e.target.value)} /></label>
      <label className="checkbox">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Publish
      </label>
      <button className="btn" disabled={busy}>{busy ? "Saving…" : submitLabel}</button>
    </form>
  );
}
