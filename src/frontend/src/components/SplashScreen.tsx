import { useEffect, useState } from "react";

const DSK_LOGO = "/assets/uploads/dsk-logo-new.png";

export function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2000);
    const done = setTimeout(() => onDone(), 2700);
    return () => {
      clearTimeout(timer);
      clearTimeout(done);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900 transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {!logoError ? (
        <img
          src={DSK_LOGO}
          alt="DSK Logo"
          className="w-40 h-40 object-contain rounded-2xl shadow-2xl"
          onError={() => setLogoError(true)}
        />
      ) : (
        <div className="w-40 h-40 rounded-2xl shadow-2xl bg-amber-500 flex items-center justify-center">
          <span className="text-slate-900 font-bold text-4xl">DSK</span>
        </div>
      )}
      <p className="mt-4 text-amber-400 text-lg font-semibold tracking-widest">
        DSK
      </p>
      <p className="text-slate-400 text-sm">Document Seva Kendra</p>
    </div>
  );
}
