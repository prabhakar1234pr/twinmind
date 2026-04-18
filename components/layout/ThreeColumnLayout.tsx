"use client";

import { ReactNode } from "react";

interface Props {
  left: ReactNode;
  middle: ReactNode;
  right: ReactNode;
}

export function ThreeColumnLayout({ left, middle, right }: Props) {
  return (
    <div className="flex min-h-0 flex-1 divide-x divide-border overflow-hidden">
      <section className="flex min-w-0 basis-[30%] flex-col bg-background">
        {left}
      </section>
      <section className="flex min-w-0 basis-[40%] flex-col bg-muted/30">
        {middle}
      </section>
      <section className="flex min-w-0 basis-[30%] flex-col bg-background">
        {right}
      </section>
    </div>
  );
}
