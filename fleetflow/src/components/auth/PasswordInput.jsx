import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function PasswordInput({ className = "", ...inputProps }) {
  const [visible, setVisible] = useState(false);

  return (
    <span className="relative block">
      <input
        {...inputProps}
        type={visible ? "text" : "password"}
        className={`${className} pr-11`}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-lg text-slate-400 transition hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
      >
        {visible ? <EyeOff size={17} /> : <Eye size={17} />}
      </button>
    </span>
  );
}
