import { createHmac } from "node:crypto";

export type AuditEvent = {
  eventId: string;
  occurredAt: string;
  actorId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  metadata: Record<string, unknown>;
  previousHash: string | null;
  eventHash: string;
};

export function hashAuditEvent(
  input: Omit<AuditEvent, "eventHash">,
  hmacKey: string
): string {
  const canonical = JSON.stringify({
    eventId: input.eventId,
    occurredAt: input.occurredAt,
    actorId: input.actorId,
    action: input.action,
    resourceType: input.resourceType,
    resourceId: input.resourceId,
    metadata: input.metadata,
    previousHash: input.previousHash
  });

  return createHmac("sha256", hmacKey).update(canonical).digest("hex");
}

export function verifyAuditChain(events: AuditEvent[], hmacKey: string): boolean {
  let previous: string | null = null;

  for (const event of events) {
    if (event.previousHash !== previous) return false;
    const expected = hashAuditEvent(
      {
        eventId: event.eventId,
        occurredAt: event.occurredAt,
        actorId: event.actorId,
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId,
        metadata: event.metadata,
        previousHash: event.previousHash
      },
      hmacKey
    );
    if (event.eventHash !== expected) return false;
    previous = event.eventHash;
  }

  return true;
}
