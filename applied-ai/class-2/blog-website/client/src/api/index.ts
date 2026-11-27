import type { AuthResponse, Comment, Paginated, Post, PostInput, User } from "../types";
import { http } from "./client";

export const authApi = {
  register: (d: { name: string; email: string; password: string }) =>
    http.post<AuthResponse>("/auth/register", d).then((r) => r.data),
  login: (d: { email: string; password: string }) => http.post<AuthResponse>("/auth/login", d).then((r) => r.data),
  me: () => http.get<{ user: User }>("/auth/me").then((r) => r.data.user),
};

export const postsApi = {
  list: (params: { page?: number; limit?: number; search?: string; authorId?: number }) =>
    http.get<Paginated<Post>>("/posts", { params }).then((r) => r.data),
  get: (idOrSlug: string) => http.get<{ post: Post }>(`/posts/${idOrSlug}`).then((r) => r.data.post),
  create: (d: PostInput) => http.post<{ post: Post }>("/posts", d).then((r) => r.data.post),
  update: (id: number, d: Partial<PostInput>) => http.put<{ post: Post }>(`/posts/${id}`, d).then((r) => r.data.post),
  remove: (id: number) => http.delete(`/posts/${id}`),
};

export const commentsApi = {
  list: (postId: number) => http.get<{ comments: Comment[] }>(`/posts/${postId}/comments`).then((r) => r.data.comments),
  create: (postId: number, content: string) =>
    http.post<{ comment: Comment }>(`/posts/${postId}/comments`, { content }).then((r) => r.data.comment),
  update: (postId: number, id: number, content: string) =>
    http.put<{ comment: Comment }>(`/posts/${postId}/comments/${id}`, { content }).then((r) => r.data.comment),
  remove: (postId: number, id: number) => http.delete(`/posts/${postId}/comments/${id}`),
};
