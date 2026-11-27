export interface User {
  id: number;
  name: string;
  email: string;
  createdAt: string;
}

export interface AuthorSummary {
  id: number;
  name: string;
}

export interface Post {
  id: number;
  title: string;
  slug: string;
  content: string;
  published: boolean;
  authorId: number;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
  _count: { comments: number };
}

export interface Comment {
  id: number;
  content: string;
  postId: number;
  authorId: number;
  author: AuthorSummary;
  createdAt: string;
  updatedAt: string;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface PostInput {
  title: string;
  content: string;
  published: boolean;
}
