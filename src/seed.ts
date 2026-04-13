import type { AppData, Member } from "./types";

export const STORAGE_KEY = "volley-vote-app-data";
export const SESSION_KEY = "volley-vote-session";
export const MAX_SUGGESTIONS_PER_MEMBER = 3;
export const MIN_VOTE = 1;
export const MAX_VOTE = 5;

const memberNames = [
  "Kisi 01",
  "Kisi 02",
  "Kisi 03",
  "Kisi 04",
  "Kisi 05",
  "Kisi 06",
  "Kisi 07",
  "Kisi 08",
  "Kisi 09",
  "Kisi 10",
  "Kisi 11",
  "Kisi 12",
  "Kisi 13",
  "Kisi 14",
  "Kisi 15",
  "Kisi 16",
];

export const seedMembers: Member[] = memberNames.map((name, index) => ({
  id: `member-${index + 1}`,
  name,
  role: index === 0 ? "admin" : "member",
  accessCode: `${2000 + index + 1}`,
}));

export const initialAppData: AppData = {
  members: seedMembers,
  suggestions: [
    {
      id: "suggestion-1",
      title: "File Bekcileri",
      note: "Savunma gucu vurgusu olsun.",
      memberId: "member-1",
      createdAt: "2026-04-10T18:00:00.000Z",
    },
    {
      id: "suggestion-2",
      title: "Smac Rotasi",
      note: "Biraz daha enerjik bir isim denemesi.",
      memberId: "member-2",
      createdAt: "2026-04-10T18:15:00.000Z",
    },
  ],
  votes: [
    {
      memberId: "member-1",
      suggestionId: "suggestion-1",
      value: 4,
      updatedAt: "2026-04-10T18:20:00.000Z",
    },
    {
      memberId: "member-2",
      suggestionId: "suggestion-1",
      value: 5,
      updatedAt: "2026-04-10T18:21:00.000Z",
    },
    {
      memberId: "member-3",
      suggestionId: "suggestion-2",
      value: 4,
      updatedAt: "2026-04-10T18:22:00.000Z",
    },
  ],
  comments: [
    {
      id: "comment-1",
      suggestionId: "suggestion-1",
      memberId: "member-4",
      message: "Kulaga guclu geliyor, kisa olmasi da iyi.",
      createdAt: "2026-04-10T18:25:00.000Z",
    },
  ],
  assets: [],
};
