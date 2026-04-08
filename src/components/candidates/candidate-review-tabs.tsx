"use client";

import type { ReactNode } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function CandidateReviewTabs({
  summary,
  transcript,
  video,
}: {
  summary: ReactNode;
  transcript: ReactNode;
  video: ReactNode;
}) {
  return (
    <Tabs
      defaultValue="summary"
      className="flex flex-col gap-0"
    >
      {/* Root must be flex-col — default Tabs is flex-row and places the tab list beside panels */}
      <div className="-mx-5 flex justify-center border-b border-border/45 px-5 pb-5 sm:-mx-8 sm:px-8">
        <TabsList
          variant="default"
          className="grid h-auto w-full max-w-md grid-cols-3 gap-1 rounded-xl border-0 bg-muted/45 p-1 shadow-none sm:max-w-lg"
        >
          <TabsTrigger
            value="summary"
            className="rounded-lg py-2.5 text-sm font-medium data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger
            value="transcript"
            className="rounded-lg py-2.5 text-sm font-medium data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            Transcript
          </TabsTrigger>
          <TabsTrigger
            value="video"
            className="rounded-lg py-2.5 text-sm font-medium data-active:bg-background data-active:text-foreground data-active:shadow-sm"
          >
            Video
          </TabsTrigger>
        </TabsList>
      </div>
      <TabsContent
        value="summary"
        className="mt-0 w-full px-0 py-0 focus-visible:outline-none"
      >
        {summary}
      </TabsContent>
      <TabsContent
        value="transcript"
        className="mt-0 w-full px-0 py-0 focus-visible:outline-none"
      >
        {transcript}
      </TabsContent>
      <TabsContent
        value="video"
        className="mt-0 w-full px-0 py-0 focus-visible:outline-none"
      >
        {video}
      </TabsContent>
    </Tabs>
  );
}
