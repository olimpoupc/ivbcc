type YouTubeEmbedProps = {
  src: string;
  title: string;
  className?: string;
  allowPictureInPicture?: boolean;
};

export default function YouTubeEmbed({
  src,
  title,
  className = "",
  allowPictureInPicture = true,
}: YouTubeEmbedProps) {
  const allowFeatures = [
    "accelerometer",
    "autoplay",
    "clipboard-write",
    "encrypted-media",
    "gyroscope",
    allowPictureInPicture ? "picture-in-picture" : null,
    "web-share",
  ]
    .filter(Boolean)
    .join("; ");

  return (
    <div className={`youtube-embed-shell relative aspect-video w-full ${className}`}>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        allow={allowFeatures}
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
        className="youtube-embed-frame absolute inset-0 h-full w-full"
      />
    </div>
  );
}
