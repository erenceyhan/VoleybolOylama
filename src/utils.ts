import { initialAppData, MAX_VOTE, MIN_VOTE } from "./seed";
import type { AppData, Comment, Suggestion, Vote } from "./types";

export function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getInitialAppData(): AppData {
  return JSON.parse(JSON.stringify(initialAppData)) as AppData;
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(date));
}

export function clampVote(value: number) {
  return Math.max(MIN_VOTE, Math.min(MAX_VOTE, value));
}

export function getSuggestionVotes(votes: Vote[], suggestionId: string) {
  return votes.filter((vote) => vote.suggestionId === suggestionId);
}

export function getSuggestionComments(comments: Comment[], suggestionId: string) {
  return comments.filter((comment) => comment.suggestionId === suggestionId);
}

export function getSuggestionSummary(votes: Vote[], suggestionId: string) {
  const suggestionVotes = getSuggestionVotes(votes, suggestionId);
  const totalScore = suggestionVotes.reduce((sum, vote) => sum + vote.value, 0);
  const averageScore =
    suggestionVotes.length > 0 ? totalScore / suggestionVotes.length : 0;

  return {
    totalScore,
    averageScore,
    voteCount: suggestionVotes.length,
  };
}

export function getMemberSuggestionCount(
  suggestions: Suggestion[],
  memberId: string,
) {
  return suggestions.filter((suggestion) => suggestion.memberId === memberId).length;
}
