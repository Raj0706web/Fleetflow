import { useEffect, useState } from "react";
import { getProfileAvatar } from "./profileAvatars";

export default function ProfileAvatar({ user, size = "h-14 w-14", className = "" }) {
  const [avatar, setAvatar] = useState(() => getProfileAvatar(user));

  useEffect(() => {
    const refreshAvatar = () => setAvatar(getProfileAvatar(user));
    refreshAvatar();
    window.addEventListener("fleetflow-profile-avatar-change", refreshAvatar);
    window.addEventListener("storage", refreshAvatar);
    return () => {
      window.removeEventListener("fleetflow-profile-avatar-change", refreshAvatar);
      window.removeEventListener("storage", refreshAvatar);
    };
  }, [user?.id, user?._id, user?.role]);

  return (
    <img
      src={avatar.src}
      alt={`${avatar.label} profile avatar`}
      className={`${size} shrink-0 rounded-full border border-slate-200 bg-slate-100 object-cover shadow-sm ${className}`}
    />
  );
}
