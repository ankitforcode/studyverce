export type NavbarProfilePatch = {
  username?: string;
  displayName?: string;
  avatarUrl?: string | null;
};

export const NAVBAR_PROFILE_UPDATED_EVENT = "studyverce:navbar-profile-updated";

/** Tell the navbar to refresh (and optionally apply) profile fields after onboarding or settings saves. */
export function notifyNavbarProfileUpdated(patch?: NavbarProfilePatch) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<NavbarProfilePatch | undefined>(NAVBAR_PROFILE_UPDATED_EVENT, {
      detail: patch,
    })
  );
}

export function onNavbarProfileUpdated(
  listener: (patch?: NavbarProfilePatch) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  function handleEvent(event: Event) {
    const patch = (event as CustomEvent<NavbarProfilePatch | undefined>).detail;
    listener(patch);
  }

  window.addEventListener(NAVBAR_PROFILE_UPDATED_EVENT, handleEvent);
  return () => window.removeEventListener(NAVBAR_PROFILE_UPDATED_EVENT, handleEvent);
}
