"use client";

import { useState } from "react";
import Chat from "@/components/Chat";
import Results from "@/components/Results";
import { PanelLeftClose, Columns, Maximize2 } from "lucide-react";

type Mode = "collapsed" | "oneThird" | "full";

export default function Shell() {
  const [mode, setMode] = useState<Mode>("oneThird");

  const chatClasses = (() => {
    switch (mode) {
      case "collapsed":
        return "hidden md:hidden";
      case "full":
        return "col-span-12 rounded-md border h-[calc(100vh-200px)] overflow-hidden";
      case "oneThird":
      default:
        return "col-span-12 md:col-span-4 rounded-md border h-[calc(100vh-200px)] overflow-hidden";
    }
  })();

  const resultsClasses = (() => {
    switch (mode) {
      case "collapsed":
        return "col-span-12 rounded-md border p-2 md:p-3 h-[calc(100vh-200px)] overflow-auto";
      case "full":
        return "hidden md:hidden";
      case "oneThird":
      default:
        return "col-span-12 md:col-span-8 rounded-md border p-2 md:p-3 h-[calc(100vh-200px)] overflow-auto";
    }
  })();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-end gap-2 text-xs">
        <button
          onClick={() => setMode("collapsed")}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent ${
            mode === "collapsed" ? "bg-accent" : ""
          }`}
          title="Collapse chat"
        >
          <PanelLeftClose className="h-4 w-4" />
          Collapse
        </button>
        <button
          onClick={() => setMode("oneThird")}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent ${
            mode === "oneThird" ? "bg-accent" : ""
          }`}
          title="Chat 1/3"
        >
          <Columns className="h-4 w-4" />
          1/3
        </button>
        <button
          onClick={() => setMode("full")}
          className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-accent ${
            mode === "full" ? "bg-accent" : ""
          }`}
          title="Chat full"
        >
          <Maximize2 className="h-4 w-4" />
          Full
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 md:gap-3">
        <div className={chatClasses}>
          <Chat />
        </div>
        <div className={resultsClasses}>
          <Results />
        </div>
      </div>
    </div>
  );
}
