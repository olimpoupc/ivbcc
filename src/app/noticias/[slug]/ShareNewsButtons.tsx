"use client";

import ShareButtonGroup from "@/components/ui/ShareButtonGroup";

type Props = {
  title: string;
};

export default function ShareNewsButtons({ title }: Props) {
  return (
    <ShareButtonGroup
      title={title}
      location="share_news"
      whatsappLabel="WhatsApp"
      facebookLabel="Facebook"
    />
  );
}
