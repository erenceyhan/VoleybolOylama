const USERNAME_PATTERN = /^[a-z0-9._-]{3,24}$/;
const PASSWORD_PATTERN = /^(?=(?:.*\d){2,}).{6,}$/;

export const ADMIN_USERNAME = "erenceyhan";

export function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function isValidUsername(username: string) {
  return USERNAME_PATTERN.test(normalizeUsername(username));
}

export function getVirtualEmailForUsername(username: string) {
  return `${normalizeUsername(username)}@erenceyhan.github.io`;
}

export function isValidPassword(password: string) {
  return PASSWORD_PATTERN.test(password.trim());
}

export function getAuthErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    const lowered = error.message.toLowerCase();

    if (lowered.includes("email rate limit exceeded")) {
      return "Supabase kayit sirasinda dogrulama maili gondermeye calisiyor ve email limiti dolmus. Supabase panelinde Confirm email ayarini kapat, sonra tekrar dene.";
    }

    if (lowered.includes("email address") && lowered.includes("invalid")) {
      return "Supabase teknik auth email formatini kabul etmedi. Sayfayi yenileyip tekrar dene; sorun devam ederse birlikte duzeltelim.";
    }

    return error.message;
  }

  return "Beklenmeyen bir hata olustu.";
}
export function getPasswordRuleText() {
  return "Sifre en az 6 karakter olmali ve en az 2 rakam icermeli.";
}
