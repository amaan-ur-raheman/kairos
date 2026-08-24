import { Avatar, AvatarBadge, AvatarFallback } from "@kairos/ui/components/avatar";
import { cn } from "@kairos/ui/lib/utils";

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

type ProfileIdentityProps = {
  name: string;
  secondary: string;
  tertiary?: string | null;
  statusColor?: string;
  size?: "sm" | "lg";
  avatarClassName?: string;
  fallbackClassName?: string;
  className?: string;
};

export function ProfileIdentity({
  name,
  secondary,
  tertiary,
  statusColor,
  size = "lg",
  avatarClassName,
  fallbackClassName,
  className,
}: ProfileIdentityProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <Avatar size={size} className={cn("relative shrink-0 bg-[var(--ember)]", avatarClassName)}>
        <AvatarFallback
          className={cn("font-serif-display font-semibold text-white", fallbackClassName)}
        >
          {initials(name)}
        </AvatarFallback>
        {statusColor && (
          <AvatarBadge
            className="size-3 bg-[var(--card)] ring-2 ring-[var(--card)]"
            style={{ background: statusColor }}
          />
        )}
      </Avatar>
      <div className="min-w-0">
        <b className="block truncate text-[14.5px] font-semibold">{name}</b>
        <span className="block truncate text-xs text-[var(--ink-muted)]" title={secondary}>
          {secondary}
        </span>
        {tertiary && (
          <span
            className="block truncate font-serif-display text-xs italic text-[var(--ink-muted)]"
            title={tertiary}
          >
            {tertiary}
          </span>
        )}
      </div>
    </div>
  );
}
