import Image from "next/image";

type ProductIllustrationProps = {
  src: string;
  alt: string;
  caption: string;
  priority?: boolean;
  sizes?: string;
  className?: string;
};

export function ProductIllustration({
  src,
  alt,
  caption,
  priority,
  sizes,
  className,
}: ProductIllustrationProps) {
  return (
    <figure className={className ?? "w-full min-w-0"}>
      <Image
        src={src}
        alt={alt}
        width={1600}
        height={1000}
        sizes={sizes ?? "(min-width: 1024px) min(52vw, 680px), 100vw"}
        className="h-auto w-full"
        priority={priority}
        unoptimized
      />
      <figcaption className="mt-5 text-center text-sm font-medium tracking-wide text-[oklch(0.48_0.02_260)]">
        {caption}
      </figcaption>
    </figure>
  );
}
