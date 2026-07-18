import {createFileRoute, useNavigate} from "@tanstack/react-router";
import {useEffect} from "react";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Enter") {
        navigate({to: "/redis"});
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-black p-4 font-mono text-sm text-green-300">
      <div className="mb-3 text-green-500">$ ls</div>
      <button
        type="button"
        className="block w-full max-w-xl text-left text-green-300 outline-none"
        onClick={() => navigate({to: "/redis"})}
        autoFocus
      >
        &gt; redis
      </button>
      <button
        type="button"
        className="block w-full max-w-xl text-left text-green-300 outline-none"
        onClick={() => navigate({to: "/plc"})}
      >
        &nbsp;&nbsp;plc
      </button>
      <button
        type="button"
        className="block w-full max-w-xl text-left text-green-300 outline-none"
        onClick={() => navigate({to: "/minesweeper"})}
      >
        &nbsp;&nbsp;minesweeper
      </button>
    </div>
  );
}
