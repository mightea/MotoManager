export function isRegistrationEnabled(): boolean {
  const flag = process.env.ENABLE_REGISTRATION;

  if (flag === undefined) {
    return true;
  }

  const normalized = flag.trim().toLowerCase();

  if (normalized === "0" || normalized === "false" || normalized === "no") {
    return false;
  }

  return true;
}
