export const profileAvatars = [
  { id: "operations-manager", label: "Headset", src: "/avatars/operations-manager.webp" },
  { id: "operations-coordinator", label: "ID badge", src: "/avatars/operations-coordinator.webp" },
  { id: "driver-vest", label: "Hi-vis", src: "/avatars/driver-vest.webp" },
  { id: "driver-cap", label: "Cap", src: "/avatars/driver-cap.webp" },
  { id: "client-phone", label: "Phone", src: "/avatars/client-phone.webp" },
  { id: "client-glasses", label: "Glasses", src: "/avatars/client-glasses.webp" },
  { id: "administrator", label: "Tablet", src: "/avatars/administrator.webp" },
];

const defaultAvatarByRole = {
  Administrator: "administrator",
  "Fleet / Operations Manager": "operations-manager",
  Driver: "driver-vest",
  "Viewer / Client": "client-phone",
};

const avatarIdsByRole = {
  Administrator: ["administrator", "operations-coordinator"],
  "Fleet / Operations Manager": ["operations-manager", "operations-coordinator"],
  Driver: ["driver-vest", "driver-cap"],
  "Viewer / Client": ["client-phone", "client-glasses"],
};

export function profileAvatarsForRole(role) {
  const allowedIds = avatarIdsByRole[role] || avatarIdsByRole["Viewer / Client"];
  return allowedIds
    .map((id) => profileAvatars.find((avatar) => avatar.id === id))
    .filter(Boolean);
}

function getAvatarStorageKey(user) {
  const userId = user?.id || user?._id;
  return userId ? `fleetflow-profile-avatar:${userId}` : null;
}

export function getProfileAvatar(user) {
  const storageKey = getAvatarStorageKey(user);
  try {
    const savedId = storageKey && window.localStorage.getItem(storageKey);
    const savedAvatar = profileAvatarsForRole(user?.role).find((avatar) => avatar.id === savedId);
    if (savedAvatar) return savedAvatar;
  } catch {
    // Use the role default when browser storage is unavailable.
  }

  const defaultId = defaultAvatarByRole[user?.role] || "operations-manager";
  return profileAvatarsForRole(user?.role).find((avatar) => avatar.id === defaultId)
    || profileAvatarsForRole(user?.role)[0]
    || profileAvatars[0];
}

export function saveProfileAvatar(user, avatarId) {
  const storageKey = getAvatarStorageKey(user);
  const avatar = profileAvatarsForRole(user?.role).find((item) => item.id === avatarId);
  if (!storageKey || !avatar) return false;

  try {
    window.localStorage.setItem(storageKey, avatar.id);
    window.dispatchEvent(new Event("fleetflow-profile-avatar-change"));
    return true;
  } catch {
    return false;
  }
}
