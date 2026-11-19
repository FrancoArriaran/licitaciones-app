import { formatDateLima } from "@licitaciones/core/shared";
import { Badge } from "@licitaciones/ui";
import type { FormState } from "@/lib/form-state";
import type { TeamMember } from "../data";
import { ROLE_LABELS } from "../labels";
import { MemberActions } from "./member-actions";

type MemberAction = (previous: FormState, formData: FormData) => Promise<FormState>;

export function TeamList({
  members,
  canManage,
  renewAction,
  removeAction,
}: {
  members: TeamMember[];
  /** Whether the viewer may renew or remove this member (checked again on the server). */
  canManage: (member: TeamMember) => boolean;
  renewAction: MemberAction;
  removeAction: MemberAction;
}) {
  return (
    <ul className="border-border bg-surface divide-border divide-y rounded-xl border">
      {members.map((member) => (
        <li
          key={member.userId}
          className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
        >
          <div className="min-w-0">
            <p className="font-medium break-all">{member.email}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">{ROLE_LABELS[member.role]}</span>
              {member.joinedAt ? (
                <Badge tone="success">Activo</Badge>
              ) : (
                <Badge tone="warning">Invitado el {formatDateLima(member.invitedAt)}</Badge>
              )}
            </div>
          </div>
          {canManage(member) && (
            <MemberActions
              userId={member.userId}
              email={member.email}
              pending={member.joinedAt === null}
              renewAction={renewAction}
              removeAction={removeAction}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
