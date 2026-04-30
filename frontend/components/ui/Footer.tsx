import Image from "next/image";

export function PoweredByFooter() {
  return (
    <a
      href="https://www.happyrobot.ai"
      target="_blank"
      rel="noreferrer"
      className="fixed bottom-5 right-6 inline-flex items-center gap-2 px-3 py-2 rounded-full bg-white border border-border shadow-card hover:shadow-cardHover transition-shadow text-xs text-ink-muted"
    >
      <span>Powered by</span>
      <Image
        src="/happyrobot-wordmark.svg"
        alt="HappyRobot"
        width={96}
        height={22}
        priority
      />
    </a>
  );
}
