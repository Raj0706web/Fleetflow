import { useCallback, useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, getSetupStatus, logout } from "../../api/auth";
import { getPublicRegistrationStatus } from "../../api/systemSettings";
import AuthShell from "./AuthShell";
import { AuthContext, getLandingPath } from "./AuthContext";
import InitialSetup from "../../pages/InitialSetup";
import Login from "../../pages/Login";
import Register from "../../pages/Register";
import BrandReveal from "./BrandReveal";

const INTRO_SEEN_KEY = "fleetflow-brand-reveal-seen-v8";

function isLoaderPreview() {
  return new URLSearchParams(window.location.search).get("loader") === "1";
}

function shouldShowIntro() {
  if (isLoaderPreview()) return true;
  try {
    return window.localStorage.getItem(INTRO_SEEN_KEY) !== "true";
  } catch {
    return true;
  }
}

export default function StartupGate({ children }) {
  const [showIntro] = useState(shouldShowIntro);
  const [introFinished, setIntroFinished] = useState(false);
  const [status, setStatus] = useState("loading");
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clientRegistrationEnabled, setClientRegistrationEnabled] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const checkStartup = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const setup = await getSetupStatus();
      if (setup.needsSetup) {
        setUser(null);
        setStatus("setup");
        return;
      }

      try {
        setClientRegistrationEnabled(await getPublicRegistrationStatus());
      } catch {
        // Keep the authentication shell usable if the public settings request fails.
      }

      const currentUser = await getCurrentUser();
      setUser(currentUser);
      setStatus(currentUser ? "authenticated" : "login");
    } catch (requestError) {
      setError(requestError.message);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(checkStartup);
  }, [checkStartup]);

  const completeIntro = useCallback(() => {
    try {
      window.localStorage.setItem(INTRO_SEEN_KEY, "true");
    } catch {
      // Continue even when browser storage is unavailable.
    }
    setIntroFinished(true);
  }, []);

  const loaderShouldBeVisible = showIntro && (!introFinished || status === "loading");

  async function handleLogout() {
    await logout();
    setUser(null);
    setNotice("");
    setStatus("login");
    navigate("/login", { replace: true });
  }

  function handleLogin(authenticatedUser) {
    setUser(authenticatedUser);
    setStatus("authenticated");
    setNotice("");
    navigate(getLandingPath(authenticatedUser.role), { replace: true });
  }

  function handleModeChange(nextMode) {
    setNotice("");
    navigate(nextMode === "register" ? "/register" : "/login");
  }

  function handleRegistrationComplete(message) {
    setStatus("login");
    setNotice(message);
    navigate("/login", { replace: true });
  }

  if (loaderShouldBeVisible) {
    return <BrandReveal onComplete={completeIntro} />;
  }

  if (status === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-9 w-9 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <p className="mt-3 text-sm text-slate-600">Preparing FleetFlow…</p>
        </div>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <section className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 text-center">
          <h1 className="font-semibold text-slate-900">FleetFlow couldn’t start</h1>
          <p role="alert" className="mt-2 text-sm text-rose-600">{error}</p>
          <button
            type="button"
            onClick={checkStartup}
            className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white"
          >
            Try again
          </button>
        </section>
      </main>
    );
  }

  if (status === "authenticated") {
    if (["/", "/login", "/register"].includes(location.pathname)) {
      return <Navigate to={getLandingPath(user?.role)} replace />;
    }

    return (
      <AuthContext.Provider value={{ user, logout: handleLogout, updateUser: setUser }}>
        {children}
      </AuthContext.Provider>
    );
  }

  if (!clientRegistrationEnabled && location.pathname === "/register") {
    return <Navigate to="/login" replace />;
  }

  const mode = status === "setup"
    ? "setup"
      : location.pathname === "/register" && clientRegistrationEnabled
      ? "register"
      : "login";
  const isSetup = mode === "setup";
  const title = isSetup
    ? "Create your Administrator account"
    : mode === "register"
      ? "Create your client account"
      : "Sign in";
  const subtitle = isSetup
    ? "Set up the first administrator for your FleetFlow workspace."
    : mode === "register"
      ? "Register for a client account to access FleetFlow."
      : "Use your FleetFlow account to continue.";

  return (
    <AuthShell
      mode={mode}
      title={title}
      subtitle={subtitle}
      onModeChange={isSetup ? undefined : handleModeChange}
      canRegister={clientRegistrationEnabled}
    >
      {isSetup ? (
        <InitialSetup
          onComplete={() => {
            setStatus("login");
            navigate("/login", { replace: true });
          }}
        />
      ) : mode === "register" ? (
        <Register onRegistered={handleRegistrationComplete} />
      ) : (
        <Login onLogin={handleLogin} notice={notice} />
      )}
    </AuthShell>
  );
}
