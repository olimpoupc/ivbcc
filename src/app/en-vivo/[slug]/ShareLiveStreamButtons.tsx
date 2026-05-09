"use client";

import ShareButtonGroup from "@/components/ui/ShareButtonGroup";

type Props = {
  title: string;
};

export default function ShareLiveStreamButtons({ title }: Props) {
  return (
    <ShareButtonGroup
      title={title}
      location="share_live_stream"
    />
  );
}
