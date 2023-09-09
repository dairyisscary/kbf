export default function clx(...args: (string | undefined | null | false)[]): string | undefined {
  return args.filter(Boolean).join(" ") || undefined;
}
