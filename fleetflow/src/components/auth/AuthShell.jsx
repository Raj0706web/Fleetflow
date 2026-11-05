import FleetFlowWordmark from "../brand/FleetFlowWordmark";

export default function AuthShell({
  mode = "login",
  title,
  subtitle,
  children,
  onModeChange,
  canRegister = true,
}) {
  const isSetup = mode === "setup";
  const isRegister = mode === "register";
  const panelFlipped = isSetup || isRegister;

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="relative grid h-[620px] min-h-[620px] w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-300/40 md:grid-cols-2">
        <div
          className={`relative z-10 flex items-center justify-center bg-white p-7 transition-all duration-700 ease-in-out sm:p-10 ${
            panelFlipped ? "md:col-start-1" : "md:col-start-2"
          }`}
        >
          <div className="w-full max-w-sm">
            <div className="mb-7 flex min-h-16 items-center gap-3">
              <img
                src="/brand/fleetflow-symbol.png"
                alt="FleetFlow truck"
                className="h-14 w-24 shrink-0 object-contain"
                draggable="false"
              />
              <div>
                <FleetFlowWordmark className="text-xl" />
                <p className="text-xs text-slate-500">Fleet operations</p>
              </div>
            </div>

            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {title}
            </h1>
            <p className="mt-2 text-sm text-slate-500">{subtitle}</p>

            <div className="mt-5">{children}</div>
            {!isSetup && onModeChange && (isRegister || canRegister) && (
              <p className="mt-5 text-center text-sm text-slate-600 md:hidden">
                {isRegister ? "Already have an account?" : "New to FleetFlow?"}{" "}
                <button
                  type="button"
                  onClick={() => onModeChange(isRegister ? "login" : "register")}
                  className="font-semibold text-blue-700 hover:text-blue-800"
                >
                  {isRegister ? "Sign in" : "Create account"}
                </button>
              </p>
            )}
          </div>
        </div>

        <aside
          className={`absolute inset-y-0 z-20 hidden w-1/2 overflow-hidden bg-gradient-to-br from-blue-600 to-blue-800 text-white transition-transform duration-700 ease-in-out md:flex ${
            panelFlipped
              ? "rounded-l-[45%] rounded-r-3xl"
              : "rounded-l-3xl rounded-r-[45%]"
          } ${
            panelFlipped ? "translate-x-full" : "translate-x-0"
          }`}
        >
          <div className="relative z-10 m-auto max-w-sm px-10 text-center">
            <img
              src="/brand/fleetflow-symbol-white.png"
              alt="FleetFlow truck"
              className="mx-auto mb-4 h-16 w-28 object-contain"
              draggable="false"
            />
            <FleetFlowWordmark inverse className="text-base" />
            <h2 className="mt-3 text-3xl font-semibold">
              {isSetup
                ? "Welcome aboard"
                : isRegister
                  ? "Join FleetFlow"
                  : "Welcome back"}
            </h2>
            <p className="mt-3 text-sm leading-6 text-blue-100">
              {isSetup
                ? "Set up your secure Administrator account to get your fleet workspace ready."
                : isRegister
                  ? "Create a client account to follow your FleetFlow activity."
                  : "Sign in to manage your FleetFlow workspace."}
            </p>
            {!isSetup && onModeChange && (isRegister || canRegister) ? (
              <div className="mt-7 text-sm text-blue-100">
                <p>{isRegister ? "Already have an account?" : "New to FleetFlow?"}</p>
                <button
                  type="button"
                  onClick={() => onModeChange(isRegister ? "login" : "register")}
                  className="mt-3 rounded-lg border border-white/80 px-5 py-2 font-semibold text-white transition hover:bg-white hover:text-blue-700"
                >
                  {isRegister ? "Sign in" : "Create account"}
                </button>
              </div>
            ) : (
              <div className="mx-auto mt-8 h-1 w-16 rounded-full bg-white/70" />
            )}
          </div>
          <div aria-hidden="true" className="auth-orbit auth-orbit-ring-top pointer-events-none absolute -left-24 -top-28 h-72 w-72 rounded-full border border-blue-300/15" />
          <div aria-hidden="true" className="auth-orbit auth-orbit-glow-top pointer-events-none absolute -left-8 -top-12 h-40 w-40 rounded-full bg-blue-400/10" />
          <div aria-hidden="true" className="auth-orbit auth-orbit-ring-bottom pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full border border-blue-300/15" />
          <div aria-hidden="true" className="auth-orbit auth-orbit-glow-bottom pointer-events-none absolute bottom-5 right-8 h-36 w-36 rounded-full bg-blue-950/10" />
        </aside>
      </section>
    </main>
  );
}
