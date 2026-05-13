
"use client";
import * as React from "react";

type Task = {
  text: string;
  done: boolean;
};

export default function LazyNote() {
  const [transcript, setTranscript] = React.useState("");
  const [listening, setListening] = React.useState(false);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const recognitionRef = React.useRef<any>(null);

  // Setup Web Speech API
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = "en-US";
    recognitionRef.current.onresult = (event: any) => {
      let fullTranscript = "";
      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
      }
      setTranscript(fullTranscript);
    };
    recognitionRef.current.onerror = (event: any) => {
      setError("Microphone error: " + event.error);
      setListening(false);
    };
    recognitionRef.current.onend = () => {
      setListening(false);
    };
  }, []);

  const handleMic = () => {
    setError(null);
    if (!recognitionRef.current) {
      setError("Speech Recognition not supported in this browser.");
      return;
    }
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      recognitionRef.current.start();
      setListening(true);
    }
  };


  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unknown error");
      // Handle code block output
      let newTasks: string[] = [];
      if (typeof data.tasks === "string") {
        // Remove code block markers if present
        let txt = data.tasks.trim();
        if (txt.startsWith("```json")) txt = txt.replace(/^```json/, "").replace(/```$/, "").trim();
        try {
          newTasks = JSON.parse(txt);
        } catch {
          newTasks = txt.split("\n").map((t) => t.trim()).filter(Boolean);
        }
      } else {
        newTasks = data.tasks || [];
      }
      // Filter out code block markers, brackets, and empty lines
      const filteredTasks = newTasks.filter((t) => {
        if (typeof t !== "string") return false;
        const trimmed = t.trim();
        if (!trimmed) return false;
        if (["[", "]", "```", "```json", "json", "\"\"\""].includes(trimmed)) return false;
        if (/^\[.*\]$/.test(trimmed)) return false; // lines that are just brackets
        return true;
      });
      // Append new tasks, avoid duplicates
      setTasks((prev) => {
        const prevTexts = new Set(prev.map((t) => t.text));
        const merged = [...prev];
        for (const t of filteredTasks) {
          if (typeof t === "string" && !prevTexts.has(t)) {
            // Remove leading/trailing quotes and trailing commas
            let clean = t.trim().replace(/^"/, "").replace(/",?$/, "").replace(/,$/, "");
            merged.push({ text: clean, done: false });
          }
        }
        return merged;
      });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Save tasks to backend
  const handleSaveTasks = async () => {
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save tasks");
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Load tasks from backend
  const handleLoadTasks = async () => {
    setError(null);
    try {
      const res = await fetch("/api/tasks");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load tasks");
      // If loaded tasks are string[] (old format), convert
      if (Array.isArray(data.tasks) && typeof data.tasks[0] === "string") {
        setTasks(data.tasks.map((t: string) => ({ text: t, done: false })));
      } else {
        setTasks(data.tasks || []);
      }
    } catch (e: any) {
      setError(e.message);
    }
  };

  // Toggle done/undone
  const handleToggleDone = (idx: number) => {
    setTasks((prev) => prev.map((t, i) => i === idx ? { ...t, done: !t.done } : t));
  };

  // Remove a task
  const handleRemoveTask = (idx: number) => {
    setTasks((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl bg-zinc-900 rounded-2xl shadow-lg p-8 flex flex-col gap-6 border border-zinc-800">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">LazyNote</h1>
        <p className="text-zinc-400 mb-4">Speak, transcribe, and extract actionable tasks with AI.</p>

        {/* Microphone Button */}
        <button
          onClick={handleMic}
          className={`flex items-center justify-center w-14 h-14 rounded-full border-2 transition-colors ${listening ? "bg-red-600 border-red-400 animate-pulse" : "bg-zinc-800 border-zinc-700 hover:bg-zinc-700"}`}
          aria-label={listening ? "Stop recording" : "Start recording"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-7 h-7"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 18.25v2.25m0 0h3m-3 0H9m6-6.75a3 3 0 11-6 0v-4.5a3 3 0 116 0v4.5z"
            />
          </svg>
        </button>
        <textarea
          className="w-full min-h-[100px] max-h-48 rounded-lg bg-zinc-800 border border-zinc-700 p-3 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
          placeholder="Transcript will appear here..."
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        <button
          onClick={handleGenerate}
          disabled={loading || !transcript.trim()}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 transition-colors font-semibold text-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Tasks"}
        </button>
        <div className="flex gap-2 mt-2">
          <button
            onClick={handleSaveTasks}
            disabled={tasks.length === 0}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors font-semibold text-sm disabled:opacity-50"
          >
            Save Tasks
          </button>
          <button
            onClick={handleLoadTasks}
            className="px-4 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-700 transition-colors font-semibold text-sm"
          >
            Load Tasks
          </button>
        </div>
        {error && <div className="text-red-400 text-sm mt-2">{error}</div>}
        {tasks.length > 0 && (
          <div className="flex flex-col gap-3 mt-4">
            <h2 className="text-xl font-semibold mb-2">Tasks</h2>
            <div className="grid gap-3">
              {tasks.map((task, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 rounded-lg bg-zinc-800 border border-zinc-700 px-4 py-3 text-zinc-100 shadow-sm ${task.done ? "opacity-50 line-through" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => handleToggleDone(i)}
                    className="accent-blue-500 w-5 h-5"
                  />
                  <span className="flex-1">{task.text}</span>
                  <button
                    onClick={() => handleRemoveTask(i)}
                    className="ml-2 px-2 py-1 rounded bg-red-700 hover:bg-red-800 text-xs"
                    aria-label="Remove task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <footer className="mt-8 text-xs text-zinc-600 dark:text-zinc-400 opacity-70">No data stored. Powered by OpenAI.</footer>
    </div>
  );
}
