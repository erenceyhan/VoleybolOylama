import { getVirtualEmailForUsername, normalizeUsername } from "./auth";
import type { RotationConfigPayload } from "./rotations/types";
import { supabase } from "./supabaseClient";
import type {
  AppData,
  Member,
  MemberActivityLog,
  MemberRole,
  SuggestionAsset,
} from "./types";

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

type SuggestionAssetRow = {
  id: string;
  suggestion_id: string;
  member_id: string;
  storage_path: string;
  mime_type: string;
  created_at: string;
};

type MemberActivityLogRow = {
  id: string;
  member_id: string;
  action_type: string;
  target_type: string;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type RotationConfigRow = {
  id: string;
  base_start_order: RotationConfigPayload["baseStartOrder"];
  zone_positions: RotationConfigPayload["zonePositions"];
  frames: RotationConfigPayload["frames"];
  updated_at: string;
  updated_by: string | null;
};

const ASSET_BUCKET = "suggestion-assets";
const DEFAULT_ASSET_MIME_TYPE = "image/svg+xml";

function getAssetMimeType(file: File) {
  const fileType = (file.type || "").toLowerCase();
  const fileName = file.name.toLowerCase();

  if (fileType === "image/png" || fileName.endsWith(".png")) {
    return "image/png";
  }

  if (
    fileType === "image/jpeg" ||
    fileName.endsWith(".jpg") ||
    fileName.endsWith(".jpeg")
  ) {
    return "image/jpeg";
  }

  return DEFAULT_ASSET_MIME_TYPE;
}

function getAssetExtension(mimeType: string, fileName: string) {
  const normalizedName = fileName.toLowerCase();

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/jpeg") {
    return normalizedName.endsWith(".jpeg") ? "jpeg" : "jpg";
  }

  return "svg";
}

export type SuggestionAssetDebug = {
  projectHost: string;
  suggestionId: string;
  memberId: string;
  roleCheck: string;
  approvedCheck: string;
  sessionActiveCheck: string;
  rpcCount: number;
  rpcPaths: string[];
  errors: string[];
};

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase ayarlari eksik.");
  }

  return supabase;
}

async function beginCurrentSession(
  client: NonNullable<typeof supabase>,
  actionType: string,
) {
  const { error } = await client.rpc("begin_member_session", {
    action_type_input: actionType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function logMemberActivity(
  client: NonNullable<typeof supabase>,
  actionType: string,
  targetType = "",
  targetId: string | null = null,
  details: Record<string, unknown> = {},
) {
  const { error } = await client.rpc("log_member_activity", {
    action_type_input: actionType,
    target_type_input: targetType,
    target_id_input: targetId,
    details_input: details,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function endCurrentSession(
  client: NonNullable<typeof supabase>,
  actionType = "logout",
) {
  const { error } = await client.rpc("end_member_session", {
    action_type_input: actionType,
  });

  if (error) {
    throw new Error(error.message);
  }
}

async function ensureActiveSession(client: NonNullable<typeof supabase>) {
  const { data, error } = await client.rpc("current_profile_session_is_active");

  if (error) {
    throw new Error(error.message);
  }

  if (data !== true) {
    try {
      await endCurrentSession(client, "session_timeout");
    } catch {
      // Oturum zaten kapanmis veya timeout logu daha once dusmus olabilir.
    }

    throw new Error("SESSION_TIMEOUT");
  }
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

function mapMemberActivityLogRow(row: MemberActivityLogRow): MemberActivityLog {
  return {
    id: row.id,
    memberId: row.member_id,
    actionType: row.action_type,
    targetType: row.target_type,
    targetId: row.target_id,
    details:
      row.details && typeof row.details === "object" ? row.details : {},
    createdAt: row.created_at,
  };
}

async function resolveSuggestionAssetUrl(
  client: NonNullable<typeof supabase>,
  storagePath: string,
) {
  const { data: downloadData, error: downloadError } = await client.storage
    .from(ASSET_BUCKET)
    .download(storagePath);

  if (!downloadError && downloadData && typeof URL !== "undefined") {
    return URL.createObjectURL(downloadData);
  }

  const fallbackUrl = client.storage.from(ASSET_BUCKET).getPublicUrl(storagePath)
    .data.publicUrl;
  const { data, error } = await client.storage
    .from(ASSET_BUCKET)
    .createSignedUrl(storagePath, 60 * 60);

  return error ? fallbackUrl : data.signedUrl;
}

async function mapSuggestionAssetRow(
  client: NonNullable<typeof supabase>,
  row: SuggestionAssetRow,
): Promise<SuggestionAsset> {
  const assetUrl = await resolveSuggestionAssetUrl(client, row.storage_path);

  return {
    id: row.id,
    suggestionId: row.suggestion_id,
    memberId: row.member_id,
    storagePath: row.storage_path,
    mimeType: row.mime_type,
    publicUrl: assetUrl,
    createdAt: row.created_at,
  };
}

export async function fetchSuggestionAssetsForSuggestion(
  suggestionId: string,
  memberId: string,
) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const errors: string[] = [];
  const projectHost = (() => {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
      return url ? new URL(url).host : "unknown";
    } catch {
      return "unknown";
    }
  })();

  const [roleResult, approvedResult, sessionActiveResult] = await Promise.all([
    client.rpc("current_profile_role"),
    client.rpc("current_profile_is_approved"),
    client.rpc("current_profile_session_is_active"),
  ]);

  if (roleResult.error) {
    errors.push(`role:${roleResult.error.message}`);
  }

  if (approvedResult.error) {
    errors.push(`approved:${approvedResult.error.message}`);
  }

  if (sessionActiveResult.error) {
    errors.push(`session_active:${sessionActiveResult.error.message}`);
  }

  const { data, error } = await client.rpc("get_suggestion_assets", {
    suggestion_id_input: suggestionId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const tableRows = (data ?? []) as SuggestionAssetRow[];
  const rpcPaths = tableRows.map((row) => row.storage_path);

  const tableAssets = await Promise.all(
    tableRows.map((row) => mapSuggestionAssetRow(client, row)),
  );

  const assets = [...tableAssets].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt),
  );

  return {
    assets,
    debug: {
      projectHost,
      suggestionId,
      memberId,
      roleCheck: roleResult.data ? String(roleResult.data) : "unknown",
      approvedCheck:
        approvedResult.data === null || approvedResult.data === undefined
          ? "unknown"
          : String(approvedResult.data),
      sessionActiveCheck:
        sessionActiveResult.data === null || sessionActiveResult.data === undefined
          ? "unknown"
          : String(sessionActiveResult.data),
      rpcCount: tableRows.length,
      rpcPaths,
      errors,
    } satisfies SuggestionAssetDebug,
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

  await ensureActiveSession(client);

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
  await ensureActiveSession(client);

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

  const suggestionRows = suggestionsResult.data as SuggestionRow[];

  return {
    members: (profilesResult.data as ProfileRow[]).map(mapProfileRow),
    suggestions: suggestionRows.map((row) => ({
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
    assets: [],
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

  await beginCurrentSession(client, "login_success");
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

  await beginCurrentSession(client, "login_success");
}

export async function signOutRemote() {
  const client = requireSupabase();
  try {
    await endCurrentSession(client);
  } catch {
    // Oturum daha once dusmusse auth cikisina devam et.
  }
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

  const { data: assetRows, error: assetSelectError } = await client
    .from("suggestion_assets")
    .select("storage_path")
    .eq("suggestion_id", suggestionId);

  if (assetSelectError) {
    throw new Error(assetSelectError.message);
  }

  const { error } = await client.from("suggestions").delete().eq("id", suggestionId);

  if (error) {
    throw new Error(error.message);
  }

  const storagePaths = (assetRows ?? [])
    .map((row) => row.storage_path)
    .filter(Boolean) as string[];

  if (storagePaths.length > 0) {
    await client.storage.from(ASSET_BUCKET).remove(storagePaths);
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

export async function recordRemoteActivity(
  actionType: string,
  targetType = "",
  targetId: string | null = null,
  details: Record<string, unknown> = {},
) {
  const client = requireSupabase();
  await logMemberActivity(client, actionType, targetType, targetId, details);
}

export async function uploadRemoteSuggestionAsset(
  suggestionId: string,
  file: File,
) {
  const client = requireSupabase();
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Gorsel yuklemek icin giris yapman gerekiyor.");
  }

  const mimeType = getAssetMimeType(file);
  const assetId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}`;
  const extension = getAssetExtension(mimeType, file.name);
  const storagePath = `${session.user.id}/${suggestionId}/${assetId}.${extension}`;

  const { error: uploadError } = await client.storage
    .from(ASSET_BUCKET)
    .upload(storagePath, file, {
      contentType: mimeType,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data, error } = await client.rpc("insert_suggestion_asset", {
    suggestion_id_input: suggestionId,
    storage_path_input: storagePath,
    mime_type_input: mimeType,
  });

  if (error) {
    await client.storage.from(ASSET_BUCKET).remove([storagePath]);
    throw new Error(error.message);
  }

  return mapSuggestionAssetRow(client, data as SuggestionAssetRow);
}

export async function deleteRemoteSuggestionAsset(asset: SuggestionAsset) {
  const client = requireSupabase();
  const { data, error } = await client.rpc("remove_suggestion_asset", {
    asset_id_input: asset.id,
  });

  if (error) {
    throw new Error(error.message);
  }

  const storagePath =
    typeof data === "string" && data.trim().length > 0 ? data : asset.storagePath;

  await client.storage.from(ASSET_BUCKET).remove([storagePath]);
}

export async function fetchPendingMembers() {
  const client = requireSupabase();
  await ensureActiveSession(client);
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

export async function fetchRemoteRotationConfig() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { data, error } = await client
    .from("rotation_configs")
    .select("id, base_start_order, zone_positions, frames, updated_at, updated_by")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const row = data as RotationConfigRow;

  return {
    baseStartOrder: row.base_start_order,
    zonePositions: row.zone_positions,
    frames: row.frames,
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  } satisfies RotationConfigPayload;
}

export async function saveRemoteRotationConfig(payload: RotationConfigPayload) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Rotasyonlari kaydetmek icin giris yapman gerekiyor.");
  }

  const { error } = await client.from("rotation_configs").upsert(
    {
      id: "default",
      base_start_order: payload.baseStartOrder,
      zone_positions: payload.zonePositions,
      frames: payload.frames,
      updated_at: new Date().toISOString(),
      updated_by: session.user.id,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchMemberActivityLogs(memberId: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const { data, error } = await client
    .from("member_activity_logs")
    .select("id, member_id, action_type, target_type, target_id, details, created_at")
    .eq("member_id", memberId)
    .in("action_type", [
      "login_success",
      "suggestion_open",
      "logout",
      "session_timeout",
    ])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as MemberActivityLogRow[]).map(mapMemberActivityLogRow);
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
