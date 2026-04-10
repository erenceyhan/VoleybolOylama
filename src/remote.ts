import { getVirtualEmailForUsername, normalizeUsername } from "./auth";
import { supabase } from "./supabaseClient";
import type { AppData, Member, MemberRole } from "./types";

type ProfileRow = {
  id: string;
  username: string;
  display_name: string;
  role: MemberRole;
  approved: boolean;
};

type SuggestionRow = {
  id: string;
  title: string;
  note: string | null;
  member_id: string;
  created_at: string;
};

type VoteRow = {
  member_id: string;
  suggestion_id: string;
  value: number;
  updated_at: string;
};

type CommentRow = {
  id: string;
  suggestion_id: string;
  member_id: string;
  message: string;
  created_at: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase ayarlari eksik.");
  }

  return supabase;
}

function mapProfileRow(row: ProfileRow): Member {
  return {
    id: row.id,
    name: row.display_name,
    username: row.username,
    role: row.role,
    approved: row.approved,
  };
}

export async function getRemoteSessionMember() {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    return null;
  }

  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, role, approved")
    .eq("id", session.user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data ? mapProfileRow(data as ProfileRow) : null;
}

export async function fetchRemoteAppData(): Promise<AppData> {
  const client = requireSupabase();

  const [profilesResult, suggestionsResult, votesResult, commentsResult] =
    await Promise.all([
      client
        .from("profiles")
        .select("id, username, display_name, role, approved")
        .order("username"),
      client.from("suggestions").select("id, title, note, member_id, created_at"),
      client.from("votes").select("member_id, suggestion_id, value, updated_at"),
      client.from("comments").select("id, suggestion_id, member_id, message, created_at"),
    ]);

  const error =
    profilesResult.error ??
    suggestionsResult.error ??
    votesResult.error ??
    commentsResult.error;

  if (error) {
    throw new Error(error.message);
  }

  return {
    members: (profilesResult.data as ProfileRow[]).map(mapProfileRow),
    suggestions: (suggestionsResult.data as SuggestionRow[]).map((row) => ({
      id: row.id,
      title: row.title,
      note: row.note ?? "",
      memberId: row.member_id,
      createdAt: row.created_at,
    })),
    votes: (votesResult.data as VoteRow[]).map((row) => ({
      memberId: row.member_id,
      suggestionId: row.suggestion_id,
      value: row.value,
      updatedAt: row.updated_at,
    })),
    comments: (commentsResult.data as CommentRow[]).map((row) => ({
      id: row.id,
      suggestionId: row.suggestion_id,
      memberId: row.member_id,
      message: row.message,
      createdAt: row.created_at,
    })),
  };
}

export async function signInWithUsernamePassword(
  username: string,
  password: string,
) {
  const client = requireSupabase();
  const { error } = await client.auth.signInWithPassword({
    email: getVirtualEmailForUsername(username),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpPendingMember(input: {
  username: string;
  password: string;
}) {
  const client = requireSupabase();
  const normalizedUsername = normalizeUsername(input.username);
  const { data, error } = await client.auth.signUp({
    email: getVirtualEmailForUsername(normalizedUsername),
    password: input.password,
    options: {
      data: {
        username: normalizedUsername,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session) {
    throw new Error(
      "Supabase Auth ayarlarinda email dogrulamasini kapatman gerekiyor.",
    );
  }

  const { error: completeError } = await client.rpc("complete_signup", {
    display_name_input: normalizedUsername,
  });

  if (completeError) {
    await client.auth.signOut();
    throw new Error(completeError.message);
  }
}

export async function signOutRemote() {
  const client = requireSupabase();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}

export async function addRemoteSuggestion(title: string, note: string) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Oneri eklemek icin giris yapman gerekiyor.");
  }

  const { error } = await client.from("suggestions").insert({
    title: title.trim(),
    note: note.trim(),
    member_id: session.user.id,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRemoteSuggestion(suggestionId: string) {
  const client = requireSupabase();
  const { error } = await client.from("suggestions").delete().eq("id", suggestionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateRemoteSuggestionNote(
  suggestionId: string,
  note: string,
) {
  const client = requireSupabase();
  const { error } = await client
    .from("suggestions")
    .update({
      note: note.trim(),
    })
    .eq("id", suggestionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function upsertRemoteVote(suggestionId: string, value: number) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Oy vermek icin giris yapman gerekiyor.");
  }

  const { error } = await client.from("votes").upsert(
    {
      member_id: session.user.id,
      suggestion_id: suggestionId,
      value,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "member_id,suggestion_id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRemoteVote(suggestionId: string) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Oy silmek icin giris yapman gerekiyor.");
  }

  const { error } = await client
    .from("votes")
    .delete()
    .eq("member_id", session.user.id)
    .eq("suggestion_id", suggestionId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function addRemoteComment(suggestionId: string, message: string) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Yorum eklemek icin giris yapman gerekiyor.");
  }

  const { error } = await client.from("comments").insert({
    suggestion_id: suggestionId,
    member_id: session.user.id,
    message: message.trim(),
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteRemoteComment(commentId: string) {
  const client = requireSupabase();
  const { error } = await client.from("comments").delete().eq("id", commentId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchPendingMembers() {
  const client = requireSupabase();
  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, role, approved")
    .eq("approved", false)
    .order("username");

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileRow[]).map(mapProfileRow);
}

export async function updateMemberApproval(memberId: string, approved: boolean) {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_set_member_approval", {
    member_id_input: memberId,
    approved_input: approved,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function rejectRemoteMember(memberId: string) {
  const client = requireSupabase();
  const { error } = await client.rpc("admin_reject_member", {
    member_id_input: memberId,
  });

  if (error) {
    throw new Error(error.message);
  }
}
