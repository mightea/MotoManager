import type { PreviousOwner } from "~/types/db";

/** Return a reordered copy with the selected owner moved to a bounded index. */
export function movePreviousOwner(
  owners: PreviousOwner[],
  ownerId: number,
  targetIndex: number,
): PreviousOwner[] {
  const sourceIndex = owners.findIndex((owner) => owner.id === ownerId);
  if (sourceIndex < 0 || targetIndex < 0 || targetIndex >= owners.length) {
    return owners;
  }

  const nextOwners = [...owners];
  const [owner] = nextOwners.splice(sourceIndex, 1);
  nextOwners.splice(targetIndex, 0, owner);
  return nextOwners;
}
