import { getVirtualEmailForUsername, normalizeUsername } from "./auth";
import type { RotationConfigPayload } from "./rotations/types";
import { supabase } from "./supabaseClient";
import type {
  TrainingPlanDaySlotMap,
  TrainingPlanEvent,
  TrainingPlanEventInput,
  TrainingPlanResponse,
  TrainingPlanResponseInput,
  TrainingSchoolLink,
  TrainingPlanSettings,
} from "./training-plan/types";
import {
  buildTrainingPlanSlotMapFromLegacy,
  buildTrainingPlanEventTitle,
  normalizeTrainingPlanSlotMap,
  normalizeTrainingPlanLink,
  sortTrainingPlanHours,
} from "./training-plan/utils";
import type {
  AppData,
  Member,
  MemberActivityLog,
  MemberRole,
  SuggestionAsset,
  YoutubeVideoDayMember,
  YoutubeVideoEntry,
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

type YoutubeVideoEntryRow = {
  id: string;
  video_date: string;
  url: string;
  created_at: string;
  created_by: string;
};

type YoutubeVideoDayMemberRow = {
  id: string;
  video_date: string;
  member_id: string;
  created_at: string;
  created_by: string;
};

type TrainingPlanEventRow = {
  id: string;
  title: string;
  description: string | null;
  match_link: string | null;
  match_source: "amator" | "voleyboloyna" | null;
  event_type: TrainingPlanEvent["eventType"];
  created_by: string;
  possible_days: string[] | null;
  possible_hours: string[] | null;
  possible_slots?: TrainingPlanDaySlotMap | null;
  is_locked: boolean;
  locked_day: string | null;
  locked_hour: string | null;
  created_at: string;
};

type TrainingPlanSettingsRow = {
  id: string;
  voleyboloyna_link: string | null;
  amator_match_program_link?: string | null;
  training_school_links?: unknown;
  updated_at: string | null;
  updated_by: string | null;
};

type TrainingPlanMemberProfileRow = {
  display_name: string;
  username: string | null;
};

type TrainingPlanResponseRow = {
  id: string;
  event_id: string;
  member_id: string;
  status: TrainingPlanResponse["status"];
  selected_days: string[] | null;
  selected_hours: string[] | null;
  selected_slots?: TrainingPlanDaySlotMap | null;
  note: string | null;
  updated_at: string;
  member?: TrainingPlanMemberProfileRow | TrainingPlanMemberProfileRow[] | null;
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

function isMissingColumnError(
  error: { message?: string } | null | undefined,
  columnName: string,
) {
  const message = error?.message?.toLowerCase() ?? "";
  const normalizedColumnName = columnName.toLowerCase();

  return (
    message.includes(normalizedColumnName) &&
    (message.includes("schema cache") || message.includes("does not exist"))
  );
}

function isMissingTableError(
  error: { message?: string } | null | undefined,
  tableName: string,
) {
  const message = error?.message?.toLowerCase() ?? "";
  const normalizedTableName = tableName.toLowerCase();

  return (
    message.includes(normalizedTableName) &&
    (message.includes("does not exist") ||
      message.includes("schema cache") ||
      message.includes("relation"))
  );
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

function mapTrainingPlanEventRow(row: TrainingPlanEventRow): TrainingPlanEvent {
  const possibleSlots = normalizeTrainingPlanSlotMap(
    row.possible_slots ??
      buildTrainingPlanSlotMapFromLegacy({
        possibleDays: row.possible_days ?? [],
        possibleHours: row.possible_hours ?? [],
      }),
  );

  return {
    id: row.id,
    title: row.title,
    description: row.description ?? "",
    matchLink: row.match_link ?? "",
    matchSource:
      row.event_type === "match"
        ? row.match_source === "voleyboloyna"
          ? "voleyboloyna"
          : "amator"
        : null,
    eventType: row.event_type,
    createdBy: row.created_by,
    possibleDays: Object.keys(possibleSlots),
    possibleHours: sortTrainingPlanHours([
      ...new Set(Object.values(possibleSlots).flatMap((hours) => hours)),
    ]),
    possibleSlots,
    isLocked: row.is_locked,
    lockedDay: row.locked_day,
    lockedHour: row.locked_hour,
    createdAt: row.created_at,
  };
}

function getDefaultTrainingPlanSettings(): TrainingPlanSettings {
  return {
    voleyboloynaLink: "",
    amatorMatchProgramLink: "",
    schoolLinks: [],
    updatedAt: null,
    updatedBy: null,
  };
}

function mapTrainingSchoolLinks(rawValue: unknown): TrainingSchoolLink[] {
  if (!Array.isArray(rawValue)) {
    return [];
  }

  return rawValue
    .map((item, index) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const rawLink = item as Record<string, unknown>;
      const name = String(rawLink.name ?? "").trim();
      const price = String(rawLink.price ?? "").trim();
      const websiteUrl = normalizeTrainingPlanLink(
        String(rawLink.websiteUrl ?? rawLink.website_url ?? "").trim(),
      );
      const address = String(rawLink.address ?? "").trim();

      if (!name) {
        return null;
      }

      return {
        id: String(rawLink.id ?? `school-${index + 1}`),
        name,
        price,
        websiteUrl,
        address,
      } satisfies TrainingSchoolLink;
    })
    .filter((entry): entry is TrainingSchoolLink => Boolean(entry));
}

function normalizeTrainingSchoolLinks(
  links: TrainingSchoolLink[],
): TrainingSchoolLink[] {
  return links
    .map((link, index) => {
      const name = link.name.trim();

      if (!name) {
        return null;
      }

      return {
        id: link.id?.trim() || `school-${Date.now()}-${index + 1}`,
        name,
        price: link.price.trim(),
        websiteUrl: normalizeTrainingPlanLink(link.websiteUrl),
        address: link.address.trim(),
      } satisfies TrainingSchoolLink;
    })
    .filter((entry): entry is TrainingSchoolLink => Boolean(entry));
}

function mapTrainingPlanResponseRow(
  row: TrainingPlanResponseRow,
): TrainingPlanResponse {
  const memberProfile = Array.isArray(row.member)
    ? row.member[0] ?? null
    : row.member ?? null;

  const selectedSlots = normalizeTrainingPlanSlotMap(
    row.selected_slots ??
      buildTrainingPlanSlotMapFromLegacy({
        possibleDays: row.selected_days ?? [],
        possibleHours: row.selected_hours ?? [],
      }),
  );

  return {
    id: row.id,
    eventId: row.event_id,
    memberId: row.member_id,
    memberDisplayName: memberProfile?.display_name ?? "Uye",
    memberUsername: memberProfile?.username ?? null,
    status: row.status,
    selectedDays: Object.keys(selectedSlots),
    selectedHours: sortTrainingPlanHours([
      ...new Set(Object.values(selectedSlots).flatMap((hours) => hours)),
    ]),
    selectedSlots,
    note: row.note ?? "",
    updatedAt: row.updated_at,
  };
}

function mapYoutubeVideoEntryRow(row: YoutubeVideoEntryRow): YoutubeVideoEntry {
  return {
    id: row.id,
    videoDate: row.video_date,
    url: row.url,
    createdAt: row.created_at,
    createdBy: row.created_by,
  };
}

function mapYoutubeVideoDayMemberRow(
  row: YoutubeVideoDayMemberRow,
): YoutubeVideoDayMember {
  return {
    id: row.id,
    videoDate: row.video_date,
    memberId: row.member_id,
    createdAt: row.created_at,
    createdBy: row.created_by,
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

export async function fetchTrainingPlanEligibleMembers() {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const { data, error } = await client
    .from("profiles")
    .select("id, username, display_name, role, approved")
    .or("approved.eq.true,role.eq.admin")
    .order("username");

  if (error) {
    throw new Error(error.message);
  }

  return (data as ProfileRow[]).map(mapProfileRow);
}

export async function fetchTrainingPlanSettings() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const primaryResult = await client
    .from("training_plan_settings")
    .select(
      "id, voleyboloyna_link, amator_match_program_link, training_school_links, updated_at, updated_by",
    )
    .eq("id", "default")
    .maybeSingle();
  let data = primaryResult.data as TrainingPlanSettingsRow | null;
  let error = primaryResult.error;

  if (error && isMissingColumnError(error, "training_school_links")) {
    const fallbackResult = await client
      .from("training_plan_settings")
      .select(
        "id, voleyboloyna_link, amator_match_program_link, updated_at, updated_by",
      )
      .eq("id", "default")
      .maybeSingle();

    data = fallbackResult.data as TrainingPlanSettingsRow | null;
    error = fallbackResult.error;
  }

  if (error && isMissingColumnError(error, "amator_match_program_link")) {
    const fallbackResult = await client
      .from("training_plan_settings")
      .select("id, voleyboloyna_link, updated_at, updated_by")
      .eq("id", "default")
      .maybeSingle();

    data = fallbackResult.data as TrainingPlanSettingsRow | null;
    error = fallbackResult.error;
  }

  if (error) {
    if (isMissingTableError(error, "training_plan_settings")) {
      return getDefaultTrainingPlanSettings();
    }

    throw new Error(error.message);
  }

  if (!data) {
    return getDefaultTrainingPlanSettings();
  }

  const row = data as TrainingPlanSettingsRow;

  return {
    voleyboloynaLink: row.voleyboloyna_link ?? "",
    amatorMatchProgramLink: row.amator_match_program_link ?? "",
    schoolLinks: mapTrainingSchoolLinks(row.training_school_links),
    updatedAt: row.updated_at,
    updatedBy: row.updated_by,
  } satisfies TrainingPlanSettings;
}

export async function saveTrainingPlanSettings(input: {
  voleyboloynaLink: string;
  amatorMatchProgramLink: string;
  schoolLinks: TrainingSchoolLink[];
}) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Ayarlari kaydetmek icin giris yapman gerekiyor.");
  }

  const normalizedVoleyboloynaLink = normalizeTrainingPlanLink(
    input.voleyboloynaLink,
  );
  const normalizedAmatorMatchProgramLink = normalizeTrainingPlanLink(
    input.amatorMatchProgramLink,
  );
  const normalizedSchoolLinks = normalizeTrainingSchoolLinks(input.schoolLinks);
  const updatedAt = new Date().toISOString();

  let { error } = await client.from("training_plan_settings").upsert(
    {
      id: "default",
      voleyboloyna_link: normalizedVoleyboloynaLink || null,
      amator_match_program_link: normalizedAmatorMatchProgramLink || null,
      training_school_links: normalizedSchoolLinks,
      updated_at: updatedAt,
      updated_by: session.user.id,
    },
    {
      onConflict: "id",
    },
  );

  if (error) {
    if (isMissingTableError(error, "training_plan_settings")) {
      throw new Error(
        "Mac programi ayarlarini kaydetmek icin once training_plan schema guncellemesini bir kez calistirmamiz gerekiyor.",
      );
    }

    if (isMissingColumnError(error, "training_school_links")) {
      if (normalizedSchoolLinks.length > 0) {
        throw new Error(
          "Okul baglantilarini kaydetmek icin once training_plan schema guncellemesini bir kez calistirmamiz gerekiyor.",
        );
      }

      const fallbackResult = await client.from("training_plan_settings").upsert(
        {
          id: "default",
          voleyboloyna_link: normalizedVoleyboloynaLink || null,
          amator_match_program_link: normalizedAmatorMatchProgramLink || null,
          updated_at: updatedAt,
          updated_by: session.user.id,
        },
        {
          onConflict: "id",
        },
      );

      error = fallbackResult.error;
    }

    if (isMissingColumnError(error, "amator_match_program_link")) {
      if (normalizedAmatorMatchProgramLink) {
        throw new Error(
          "Amator mac programini kaydetmek icin once training_plan schema guncellemesini bir kez calistirmamiz gerekiyor.",
        );
      }

      const fallbackResult = await client.from("training_plan_settings").upsert(
        {
          id: "default",
          voleyboloyna_link: normalizedVoleyboloynaLink || null,
          training_school_links: normalizedSchoolLinks,
          updated_at: updatedAt,
          updated_by: session.user.id,
        },
        {
          onConflict: "id",
        },
      );

      error = fallbackResult.error;
    }

    if (error && isMissingColumnError(error, "training_school_links")) {
      if (normalizedSchoolLinks.length > 0) {
        throw new Error(
          "Okul baglantilarini kaydetmek icin once training_plan schema guncellemesini bir kez calistirmamiz gerekiyor.",
        );
      }

      const fallbackResult = await client.from("training_plan_settings").upsert(
        {
          id: "default",
          voleyboloyna_link: normalizedVoleyboloynaLink || null,
          updated_at: updatedAt,
          updated_by: session.user.id,
        },
        {
          onConflict: "id",
        },
      );

      error = fallbackResult.error;
    }
  }

  if (error) {
    throw new Error(error.message);
  }

  return {
    voleyboloynaLink: normalizedVoleyboloynaLink,
    amatorMatchProgramLink: normalizedAmatorMatchProgramLink,
    schoolLinks: normalizedSchoolLinks,
    updatedAt,
    updatedBy: session.user.id,
  } satisfies TrainingPlanSettings;
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
      "panel_view",
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

export async function fetchTrainingPlanEvents() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const primaryResult = await client
    .from("training_plan_events")
    .select(
      "id, title, description, match_link, match_source, event_type, created_by, possible_days, possible_hours, possible_slots, is_locked, locked_day, locked_hour, created_at",
    )
    .order("created_at", { ascending: false });
  let data = primaryResult.data as TrainingPlanEventRow[] | null;
  let error = primaryResult.error;

  if (
    error &&
    (isMissingColumnError(error, "match_link") ||
      isMissingColumnError(error, "match_source") ||
      isMissingColumnError(error, "possible_slots"))
  ) {
    const fallbackSelect =
      isMissingColumnError(error, "match_link") ||
      isMissingColumnError(error, "match_source")
        ? "id, title, description, event_type, created_by, possible_days, possible_hours, is_locked, locked_day, locked_hour, created_at"
        : "id, title, description, match_link, match_source, event_type, created_by, possible_days, possible_hours, is_locked, locked_day, locked_hour, created_at";

    const fallbackResult = await client
      .from("training_plan_events")
      .select(fallbackSelect)
      .order("created_at", { ascending: false });

    data = fallbackResult.data as TrainingPlanEventRow[] | null;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TrainingPlanEventRow[]).map(mapTrainingPlanEventRow);
}

export async function createTrainingPlanEvent(input: TrainingPlanEventInput) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Etkinlik olusturmak icin giris yapman gerekiyor.");
  }

  const normalizedTitle =
    input.title.trim() || buildTrainingPlanEventTitle(input.eventType);
  const normalizedMatchLink =
    input.eventType === "match" && input.matchSource === "amator"
      ? normalizeTrainingPlanLink(input.matchLink)
      : "";

  const insertPayload = {
    title: normalizedTitle,
    description: input.description.trim(),
    match_link: normalizedMatchLink || null,
    match_source: input.eventType === "match" ? input.matchSource : null,
    event_type: input.eventType,
    created_by: session.user.id,
    possible_days: input.isLocked ? [] : input.possibleDays,
    possible_hours: input.isLocked ? [] : input.possibleHours,
    possible_slots: input.isLocked ? {} : input.possibleSlots,
    is_locked: input.isLocked,
    locked_day: input.isLocked ? input.lockedDay : null,
    locked_hour: input.isLocked ? input.lockedHour : null,
  };

  const primaryInsertResult = await client
    .from("training_plan_events")
    .insert(insertPayload)
    .select(
      "id, title, description, match_link, match_source, event_type, created_by, possible_days, possible_hours, possible_slots, is_locked, locked_day, locked_hour, created_at",
    )
    .single();
  let data = primaryInsertResult.data as TrainingPlanEventRow | null;
  let error = primaryInsertResult.error;

  if (
    error &&
    (isMissingColumnError(error, "match_link") ||
      isMissingColumnError(error, "match_source") ||
      isMissingColumnError(error, "possible_slots"))
  ) {
    const isMatchColumnMissing =
      isMissingColumnError(error, "match_link") ||
      isMissingColumnError(error, "match_source");
    const isPossibleSlotsMissing = isMissingColumnError(error, "possible_slots");

    if (
      (normalizedMatchLink || input.matchSource === "voleyboloyna") &&
      isMatchColumnMissing
    ) {
      throw new Error(
        "Mac kaynaklarini kaydetmek icin once training_plan schema guncellemesini bir kez calistirmamiz gerekiyor.",
      );
    }

    const fallbackPayload: Record<string, unknown> = {
      title: normalizedTitle,
      description: input.description.trim(),
      event_type: input.eventType,
      created_by: session.user.id,
      possible_days: input.isLocked ? [] : input.possibleDays,
      possible_hours: input.isLocked ? [] : input.possibleHours,
      is_locked: input.isLocked,
      locked_day: input.isLocked ? input.lockedDay : null,
      locked_hour: input.isLocked ? input.lockedHour : null,
    };

    if (!isMatchColumnMissing) {
      fallbackPayload.match_link = normalizedMatchLink || null;
      fallbackPayload.match_source =
        input.eventType === "match" ? input.matchSource : null;
    }

    if (!isPossibleSlotsMissing) {
      fallbackPayload.possible_slots = input.isLocked ? {} : input.possibleSlots;
    }

    const fallbackSelect = [
      "id",
      "title",
      "description",
      ...(!isMatchColumnMissing ? ["match_link", "match_source"] : []),
      "event_type",
      "created_by",
      "possible_days",
      "possible_hours",
      ...(!isPossibleSlotsMissing ? ["possible_slots"] : []),
      "is_locked",
      "locked_day",
      "locked_hour",
      "created_at",
    ].join(", ");

    const fallbackResult = await client
      .from("training_plan_events")
      .insert(fallbackPayload)
      .select(fallbackSelect)
      .single();

    data = fallbackResult.data as TrainingPlanEventRow | null;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  const event = mapTrainingPlanEventRow(data as TrainingPlanEventRow);

  const { error: responseError } = await client.from("training_plan_responses").upsert(
    {
      event_id: event.id,
      member_id: session.user.id,
      status: "yes",
      selected_days: event.isLocked ? [] : event.possibleDays,
      selected_hours: event.isLocked ? [] : event.possibleHours,
      selected_slots: event.isLocked ? {} : event.possibleSlots,
      note: "",
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "event_id,member_id",
    },
  );

  if (responseError && isMissingColumnError(responseError, "selected_slots")) {
    const fallbackResponse = await client.from("training_plan_responses").upsert(
      {
        event_id: event.id,
        member_id: session.user.id,
        status: "yes",
        selected_days: event.isLocked ? [] : event.possibleDays,
        selected_hours: event.isLocked ? [] : event.possibleHours,
        note: "",
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,member_id",
      },
    );

    if (fallbackResponse.error) {
      throw new Error(fallbackResponse.error.message);
    }
  } else if (responseError) {
    throw new Error(responseError.message);
  }

  return event;
}

export async function fetchTrainingPlanResponses(eventId: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const primaryResult = await client
    .from("training_plan_responses")
    .select(
      "id, event_id, member_id, status, selected_days, selected_hours, selected_slots, note, updated_at, member:profiles!training_plan_responses_member_id_fkey(display_name, username)",
    )
    .eq("event_id", eventId)
    .order("updated_at", { ascending: false });
  let data = primaryResult.data as TrainingPlanResponseRow[] | null;
  let error = primaryResult.error;

  if (error && isMissingColumnError(error, "selected_slots")) {
    const fallbackResult = await client
      .from("training_plan_responses")
      .select(
        "id, event_id, member_id, status, selected_days, selected_hours, note, updated_at, member:profiles!training_plan_responses_member_id_fkey(display_name, username)",
      )
      .eq("event_id", eventId)
      .order("updated_at", { ascending: false });

    data = fallbackResult.data as TrainingPlanResponseRow[] | null;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TrainingPlanResponseRow[]).map(
    mapTrainingPlanResponseRow,
  );
}

export async function fetchTrainingPlanResponseSummaries() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { data, error } = await client
    .from("training_plan_responses")
    .select("event_id, status");

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as Array<{
    event_id: string;
    status: TrainingPlanResponse["status"];
  }>).reduce<Record<string, { total: number; yes: number; maybe: number; no: number }>>(
    (accumulator, row) => {
      const current = accumulator[row.event_id] ?? {
        total: 0,
        yes: 0,
        maybe: 0,
        no: 0,
      };

      current.total += 1;

      if (row.status === "yes") {
        current.yes += 1;
      } else if (row.status === "maybe") {
        current.maybe += 1;
      } else {
        current.no += 1;
      }

      accumulator[row.event_id] = current;
      return accumulator;
    },
    {},
  );
}

export async function upsertTrainingPlanResponse(
  input: TrainingPlanResponseInput,
) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Oy gondermek icin giris yapman gerekiyor.");
  }

  const payload = {
    event_id: input.eventId,
    member_id: session.user.id,
    status: input.status,
    selected_days: input.selectedDays,
    selected_hours: input.selectedHours,
    selected_slots: input.selectedSlots,
    note: input.note.trim(),
    updated_at: new Date().toISOString(),
  };

  const primaryResult = await client.from("training_plan_responses").upsert(payload, {
    onConflict: "event_id,member_id",
  });
  let error = primaryResult.error;

  if (error && isMissingColumnError(error, "selected_slots")) {
    const fallbackResult = await client.from("training_plan_responses").upsert(
      {
        event_id: input.eventId,
        member_id: session.user.id,
        status: input.status,
        selected_days: input.selectedDays,
        selected_hours: input.selectedHours,
        note: input.note.trim(),
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "event_id,member_id",
      },
    );

    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(error.message);
  }
}

export async function lockTrainingPlanEvent(
  eventId: string,
  day: string,
  hour: string,
) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { error } = await client
    .from("training_plan_events")
    .update({
      is_locked: true,
      locked_day: day,
      locked_hour: hour,
    })
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function deleteTrainingPlanEvent(eventId: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { error } = await client
    .from("training_plan_events")
    .delete()
    .eq("id", eventId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchYoutubeVideoEntries() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { data, error } = await client
    .from("youtube_video_entries")
    .select("id, video_date, url, created_at, created_by")
    .order("video_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as YoutubeVideoEntryRow[]).map(mapYoutubeVideoEntryRow);
}

export async function addYoutubeVideoEntry(videoDate: string, url: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Video eklemek icin giris yapman gerekiyor.");
  }

  const { data, error } = await client
    .from("youtube_video_entries")
    .insert({
      video_date: videoDate,
      url: url.trim(),
      created_by: session.user.id,
    })
    .select("id, video_date, url, created_at, created_by")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return mapYoutubeVideoEntryRow(data as YoutubeVideoEntryRow);
}

export async function deleteYoutubeVideoEntry(entryId: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { error } = await client
    .from("youtube_video_entries")
    .delete()
    .eq("id", entryId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function fetchYoutubeVideoDayMembers() {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { data, error } = await client
    .from("youtube_video_day_members")
    .select("id, video_date, member_id, created_at, created_by")
    .order("video_date", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) {
    if (isMissingTableError(error, "youtube_video_day_members")) {
      return [];
    }

    throw new Error(error.message);
  }

  return ((data ?? []) as YoutubeVideoDayMemberRow[]).map(
    mapYoutubeVideoDayMemberRow,
  );
}

export async function addYoutubeVideoDayMember(
  videoDate: string,
  memberId: string,
) {
  const client = requireSupabase();
  await ensureActiveSession(client);
  const {
    data: { session },
  } = await client.auth.getSession();

  if (!session?.user) {
    throw new Error("Kisi eklemek icin giris yapman gerekiyor.");
  }

  const { data, error } = await client
    .from("youtube_video_day_members")
    .insert({
      video_date: videoDate,
      member_id: memberId,
      created_by: session.user.id,
    })
    .select("id, video_date, member_id, created_at, created_by")
    .single();

  if (error) {
    if (isMissingTableError(error, "youtube_video_day_members")) {
      throw new Error(
        "Gun bazli kisi ekleme ozelligi icin youtube_video_day_members tablosu henuz kurulmamis.",
      );
    }

    throw new Error(error.message);
  }

  return mapYoutubeVideoDayMemberRow(data as YoutubeVideoDayMemberRow);
}

export async function deleteYoutubeVideoDayMember(entryId: string) {
  const client = requireSupabase();
  await ensureActiveSession(client);

  const { error } = await client
    .from("youtube_video_day_members")
    .delete()
    .eq("id", entryId);

  if (error) {
    if (isMissingTableError(error, "youtube_video_day_members")) {
      throw new Error(
        "Gun bazli kisi ekleme ozelligi icin youtube_video_day_members tablosu henuz kurulmamis.",
      );
    }

    throw new Error(error.message);
  }
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
