import { beforeEach, describe, expect, it } from "vitest";
import { NotAuthorizedError, ValidationError, type Clock, type Ruc } from "../shared";
import {
  CreateOrganization,
  EmailAlreadyRegisteredError,
  InviteMember,
  LastOwnerError,
  MemberAlreadyJoinedError,
  RemoveMember,
  RenewInvitationLink,
  RucAlreadyRegisteredError,
  SeatsBelowUsageError,
  UpdateSubscription,
  SeatLimitReachedError,
  subscriptionAccess,
  type Actor,
  type MemberRecord,
  type MembershipRepository,
  type NewOrganization,
  type OrganizationId,
  type OrganizationRepository,
  type SeatUsage,
  type UserDirectory,
  type UserId,
} from "./index";

const NOW = new Date("2026-11-17T12:00:00Z");
const clock: Clock = { now: () => NOW };

const staff: Actor = { userId: "staff-1" as UserId, isPlatformAdmin: true, role: null };
const owner: Actor = { userId: "owner-1" as UserId, isPlatformAdmin: false, role: "owner" };
const member: Actor = { userId: "member-1" as UserId, isPlatformAdmin: false, role: "member" };
const ORG_ID = "org-1" as OrganizationId;

class InMemoryOrganizations implements OrganizationRepository {
  created: NewOrganization[] = [];
  seatUsage: SeatUsage = { maxSeats: 3, used: 1 };

  async existsWithRuc(ruc: Ruc) {
    return this.created.some((org) => org.ruc === ruc);
  }
  async create(org: NewOrganization) {
    this.created.push(org);
    return `org-${this.created.length}` as OrganizationId;
  }
  async getSeatUsage() {
    return this.seatUsage;
  }
  subscriptionUpdates: Parameters<OrganizationRepository["updateSubscription"]>[1][] = [];
  async updateSubscription(
    _id: OrganizationId,
    subscription: Parameters<OrganizationRepository["updateSubscription"]>[1],
  ) {
    this.subscriptionUpdates.push(subscription);
  }
}

class InMemoryMemberships implements MembershipRepository {
  invited: Parameters<MembershipRepository["addInvitedMember"]>[0][] = [];
  failNextInsert = false;
  async addInvitedMember(member: Parameters<MembershipRepository["addInvitedMember"]>[0]) {
    if (this.failNextInsert) throw new Error("insert failed");
    this.invited.push(member);
  }
  async markJoined() {}
  members: MemberRecord[] = [];
  async find(_organizationId: OrganizationId, userId: UserId) {
    return this.members.find((m) => m.userId === userId) ?? null;
  }
  async countActiveOwners() {
    return this.members.filter((m) => m.role === "owner" && m.joinedAt).length;
  }
  async remove(_organizationId: OrganizationId, userId: UserId) {
    this.members = this.members.filter((m) => m.userId !== userId);
  }
}

class FakeUserDirectory implements UserDirectory {
  registered = new Set<string>();
  async invite(email: string) {
    if (this.registered.has(email)) throw new EmailAlreadyRegisteredError();
    this.registered.add(email);
    return {
      userId: `user-${email}` as UserId,
      invitationLink: `https://app.test/invite/${email}`,
    };
  }
  async createAccessLink(email: string) {
    return `https://app.test/access/${email}`;
  }
  removed: UserId[] = [];
  async remove(userId: UserId) {
    this.removed.push(userId);
    this.registered.delete(userId.replace(/^user-/, ""));
  }
}

async function validationErrorOf(promise: Promise<unknown>): Promise<ValidationError> {
  const error = await promise.then(
    () => null,
    (rejection: unknown) => rejection,
  );
  expect(error).toBeInstanceOf(ValidationError);
  return error as ValidationError;
}

const validOrganization = {
  name: "Ferretería El Clavo SAC",
  ruc: "20131312955",
  planCode: "professional",
  status: "active",
  endsAt: "2027-11-17",
  maxSeats: 3,
} as const;

describe("CreateOrganization", () => {
  let organizations: InMemoryOrganizations;
  let useCase: CreateOrganization;

  beforeEach(() => {
    organizations = new InMemoryOrganizations();
    useCase = new CreateOrganization(organizations, clock);
  });

  it("creates the organization with a subscription starting now", async () => {
    await useCase.execute(staff, validOrganization);

    expect(organizations.created).toHaveLength(1);
    expect(organizations.created[0]).toMatchObject({
      name: "Ferretería El Clavo SAC",
      ruc: "20131312955",
      createdBy: "staff-1",
      subscription: { planCode: "professional", status: "active", startsAt: NOW, maxSeats: 3 },
    });
  });

  it("only lets our staff create organizations", async () => {
    await expect(useCase.execute(owner, validOrganization)).rejects.toBeInstanceOf(
      NotAuthorizedError,
    );
  });

  it("rejects a RUC that is already registered", async () => {
    await useCase.execute(staff, validOrganization);
    await expect(useCase.execute(staff, validOrganization)).rejects.toBeInstanceOf(
      RucAlreadyRegisteredError,
    );
  });

  it("rejects an invalid RUC and a past end date with field errors", async () => {
    const invalidRuc = await validationErrorOf(
      useCase.execute(staff, { ...validOrganization, ruc: "20131312954" }),
    );
    expect(invalidRuc.fieldErrors).toHaveProperty("ruc");

    const pastDate = await validationErrorOf(
      useCase.execute(staff, { ...validOrganization, endsAt: "2026-01-01" }),
    );
    expect(pastDate.fieldErrors).toHaveProperty("endsAt");
  });
});

describe("InviteMember", () => {
  let organizations: InMemoryOrganizations;
  let memberships: InMemoryMemberships;
  let users: FakeUserDirectory;
  let useCase: InviteMember;

  beforeEach(() => {
    organizations = new InMemoryOrganizations();
    memberships = new InMemoryMemberships();
    users = new FakeUserDirectory();
    useCase = new InviteMember(organizations, memberships, users);
  });

  it("invites the user, records a pending membership and returns the link", async () => {
    const result = await useCase.execute(owner, ORG_ID, {
      email: " Ana@Empresa.pe ",
      role: "member",
    });

    expect(result).toEqual({
      email: "ana@empresa.pe",
      invitationLink: "https://app.test/invite/ana@empresa.pe",
    });

    expect(memberships.invited).toEqual([
      {
        organizationId: ORG_ID,
        userId: "user-ana@empresa.pe",
        email: "ana@empresa.pe",
        role: "member",
        invitedBy: "owner-1",
      },
    ]);
  });

  it("blocks the invitation when every seat is taken", async () => {
    organizations.seatUsage = { maxSeats: 1, used: 1 };
    await expect(
      useCase.execute(owner, ORG_ID, { email: "ana@empresa.pe", role: "member" }),
    ).rejects.toBeInstanceOf(SeatLimitReachedError);
    expect(memberships.invited).toHaveLength(0);
  });

  it("does not let members invite, nor admins hand out ownership", async () => {
    await expect(
      useCase.execute(member, ORG_ID, { email: "ana@empresa.pe", role: "member" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);

    const admin: Actor = { ...member, role: "admin" };
    await expect(
      useCase.execute(admin, ORG_ID, { email: "ana@empresa.pe", role: "owner" }),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it("removes the new account when the membership can't be saved", async () => {
    memberships.failNextInsert = true;
    await expect(
      useCase.execute(owner, ORG_ID, { email: "ana@empresa.pe", role: "member" }),
    ).rejects.toThrow("insert failed");
    expect(users.registered.has("ana@empresa.pe")).toBe(false);
  });

  it("surfaces an email that already has an account", async () => {
    users.registered.add("ana@empresa.pe");
    await expect(
      useCase.execute(staff, ORG_ID, { email: "ana@empresa.pe", role: "owner" }),
    ).rejects.toBeInstanceOf(EmailAlreadyRegisteredError);
  });
});

describe("subscriptionAccess", () => {
  const base = {
    planCode: "essential",
    status: "active",
    startsAt: new Date("2026-11-01T00:00:00Z"),
    endsAt: new Date("2026-11-20T12:00:00Z"),
    maxSeats: 1,
  } as const;

  it("reports days left while active", () => {
    expect(subscriptionAccess(base, NOW)).toEqual({ kind: "active", daysLeft: 3 });
  });

  it("expires at the end date", () => {
    expect(subscriptionAccess(base, new Date("2026-11-20T12:00:00Z"))).toEqual({
      kind: "expired",
    });
  });

  it("paused wins over dates", () => {
    expect(subscriptionAccess({ ...base, status: "paused" }, NOW)).toEqual({ kind: "paused" });
  });
});

describe("RenewInvitationLink and RemoveMember", () => {
  let memberships: InMemoryMemberships;
  let users: FakeUserDirectory;
  const pending: MemberRecord = {
    userId: "u-pending" as UserId,
    email: "nuevo@a.pe",
    role: "member",
    joinedAt: null,
  };
  const joinedAdmin: MemberRecord = {
    userId: "u-admin" as UserId,
    email: "admin@a.pe",
    role: "admin",
    joinedAt: NOW,
  };
  const soleOwner: MemberRecord = {
    userId: "owner-1" as UserId,
    email: "owner@a.pe",
    role: "owner",
    joinedAt: NOW,
  };

  beforeEach(() => {
    memberships = new InMemoryMemberships();
    memberships.members = [pending, joinedAdmin, soleOwner];
    users = new FakeUserDirectory();
    users.registered.add("nuevo@a.pe");
  });

  it("issues a fresh link for a pending invitation", async () => {
    const result = await new RenewInvitationLink(memberships, users).execute(
      owner,
      ORG_ID,
      pending.userId,
    );
    expect(result).toEqual({
      email: "nuevo@a.pe",
      invitationLink: "https://app.test/access/nuevo@a.pe",
    });
  });

  it("refuses a new link for someone who already joined", async () => {
    await expect(
      new RenewInvitationLink(memberships, users).execute(owner, ORG_ID, joinedAdmin.userId),
    ).rejects.toBeInstanceOf(MemberAlreadyJoinedError);
  });

  it("removes a pending invitee and frees their email", async () => {
    await new RemoveMember(memberships, users).execute(owner, ORG_ID, pending.userId);
    expect(memberships.members.map((m) => m.userId)).not.toContain("u-pending");
    expect(users.removed).toEqual(["u-pending"]);
  });

  it("lets staff cancel a pending owner invitation even when it is the only owner", async () => {
    const pendingOwner: MemberRecord = {
      userId: "u-po" as UserId,
      email: "dueno@a.pe",
      role: "owner",
      joinedAt: null,
    };
    memberships.members = [pendingOwner];
    await new RemoveMember(memberships, users).execute(staff, ORG_ID, pendingOwner.userId);
    expect(memberships.members).toEqual([]);
  });

  it("does not let an admin remove another admin, nor anyone remove the last owner", async () => {
    const admin: Actor = { ...member, role: "admin" };
    await expect(
      new RemoveMember(memberships, users).execute(admin, ORG_ID, joinedAdmin.userId),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    await expect(
      new RemoveMember(memberships, users).execute(staff, ORG_ID, soleOwner.userId),
    ).rejects.toBeInstanceOf(LastOwnerError);
  });
});

describe("UpdateSubscription", () => {
  const input = {
    planCode: "enterprise",
    status: "paused",
    endsAt: "2027-12-31",
    maxSeats: 5,
  } as const;

  it("lets staff change plan, status, validity and seats", async () => {
    const organizations = new InMemoryOrganizations();
    await new UpdateSubscription(organizations).execute(staff, ORG_ID, input);
    expect(organizations.subscriptionUpdates).toEqual([
      { planCode: "enterprise", status: "paused", endsAt: new Date("2027-12-31"), maxSeats: 5 },
    ]);
  });

  it("is staff-only and never drops seats below what is in use", async () => {
    const organizations = new InMemoryOrganizations();
    await expect(
      new UpdateSubscription(organizations).execute(owner, ORG_ID, input),
    ).rejects.toBeInstanceOf(NotAuthorizedError);
    organizations.seatUsage = { maxSeats: 10, used: 6 };
    await expect(
      new UpdateSubscription(organizations).execute(staff, ORG_ID, input),
    ).rejects.toBeInstanceOf(SeatsBelowUsageError);
  });
});
