"use client";

import ShareButtonGroup from "@/components/ui/ShareButtonGroup";

type Props = {
  title: string;
};

export default function ShareEventButtons({ title }: Props) {
  return (
    <ShareButtonGroup
      title={title}
      location="share_event"
    />
  );
}
