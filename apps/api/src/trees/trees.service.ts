import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import {
  findTreesByUser, findTreeById, createTree, updateTree, addTreeMember, findMemberRole,
  softDeleteTree, restoreTree, purgeTree, findTrashedTreesByOwner,
  requestPersonLink, findPersonTreeLinkById, getPersonOriginTreeId, findLinkByPersonAndTree,
  approvePersonLink, rejectPersonLink, unlinkPersonTree, findPendingLinkRequestsForOriginOwner,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateTreeInput, UpdateTreeInput, AddTreeMemberInput, RequestPersonLinkInput } from '@wongsorn-labs/atlas-lineage-shared';

@Injectable()
export class TreesService {
  getTreesForUser(userId: string) {
    return findTreesByUser(userId);
  }

  createTree(input: CreateTreeInput, ownerId: string) {
    return createTree(input, ownerId);
  }

  getTree(treeId: number) {
    return findTreeById(treeId);
  }

  async updateTree(treeId: number, input: UpdateTreeInput) {
    const tree = await updateTree(treeId, input);
    if (!tree) throw new NotFoundException(`Tree #${treeId} not found`);
    return tree;
  }

  addMember(treeId: number, input: AddTreeMemberInput) {
    return addTreeMember(treeId, input);
  }

  getMemberRole(treeId: number, userId: string) {
    return findMemberRole(treeId, userId);
  }

  async deleteTree(treeId: number, callerId: string) {
    const tree = await softDeleteTree(treeId, callerId);
    if (!tree) throw new NotFoundException(`Tree #${treeId} not found`);
    return tree;
  }

  async restoreTree(treeId: number, callerId: string) {
    const tree = await restoreTree(treeId, callerId);
    if (!tree) throw new NotFoundException(`Tree #${treeId} not found`);
    return tree;
  }

  async purgeTree(treeId: number, callerId: string) {
    const purged = await purgeTree(treeId, callerId);
    if (!purged) throw new NotFoundException(`Tree #${treeId} not found`);
    return { deleted: true };
  }

  getTrash(ownerId: string) {
    return findTrashedTreesByOwner(ownerId);
  }

  async requestPersonLink(destinationTreeId: number, input: RequestPersonLinkInput, requestedBy: string) {
    const result = await requestPersonLink(input.personId, destinationTreeId, requestedBy);
    if (!result.ok) {
      if (result.reason === 'person_not_found') throw new NotFoundException(`Person #${input.personId} not found`);
      throw new ForbiddenException('This person cannot be linked to this tree');
    }
    return result.link;
  }

  getPendingLinkRequests(ownerId: string) {
    return findPendingLinkRequestsForOriginOwner(ownerId);
  }

  getLinkForPerson(treeId: number, personId: number) {
    return findLinkByPersonAndTree(personId, treeId);
  }

  async decidePersonLink(linkId: number, decision: 'approve' | 'reject', callerId: string) {
    const link = await findPersonTreeLinkById(linkId);
    if (!link || link.status !== 'pending') throw new NotFoundException(`Link request #${linkId} not found`);

    const originTreeId = await getPersonOriginTreeId(link.personId);
    const role = originTreeId ? await findMemberRole(originTreeId, callerId) : null;
    if (role !== 'owner') throw new ForbiddenException('Only the origin tree owner can decide this request');

    if (decision === 'reject') {
      await rejectPersonLink(linkId);
      return { deleted: true };
    }
    const approved = await approvePersonLink(linkId);
    if (!approved) throw new NotFoundException(`Link request #${linkId} not found`);
    return approved;
  }

  async unlinkPersonTree(linkId: number, callerId: string) {
    const link = await findPersonTreeLinkById(linkId);
    if (!link) throw new NotFoundException(`Link #${linkId} not found`);

    const originTreeId = await getPersonOriginTreeId(link.personId);
    const [originRole, destinationRole] = await Promise.all([
      originTreeId ? findMemberRole(originTreeId, callerId) : Promise.resolve(null),
      findMemberRole(link.treeId, callerId),
    ]);
    if (originRole !== 'owner' && destinationRole !== 'owner') {
      throw new ForbiddenException('Only the origin or destination tree owner can unlink this person');
    }

    const removed = await unlinkPersonTree(linkId);
    if (!removed) throw new NotFoundException(`Link #${linkId} not found`);
    return { deleted: true };
  }
}
