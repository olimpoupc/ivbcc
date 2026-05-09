"use client";

import ShareButtonGroup from "@/components/ui/ShareButtonGroup";

type Props = {
  title: string;
};

export default function SharePublicationButtons({ title }: Props) {
  return (
    <ShareButtonGroup
      title={title}
      location="share_publication"
    />
  );
}
