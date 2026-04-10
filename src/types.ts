export type MemberRole = "admin" | "member";

export type Member = {
  id: string;
  name: string;
  username?: string;
  role: MemberRole;
  approved?: boolean;
  accessCode?: string;
};

export type Suggestion = {
  id: string;
  title: string;
  note: string;
  memberId: string;
  createdAt: string;
};

export type Vote = {
  memberId: string;
  suggestionId: string;
  value: number;
  updatedAt: string;
};

export type Comment = {
  id: string;
  suggestionId: string;
  memberId: string;
  message: string;
  createdAt: string;
};

export type AppData = {
  members: Member[];
  suggestions: Suggestion[];
  votes: Vote[];
  comments: Comment[];
};
