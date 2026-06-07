import { Injectable } from '@nestjs/common';
import {
  findTreesByUser, findTreeById, createTree, addTreeMember, findMemberRole,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

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

  addMember(treeId: number, input: AddTreeMemberInput) {
    return addTreeMember(treeId, input);
  }

  getMemberRole(treeId: number, userId: string) {
    return findMemberRole(treeId, userId);
  }
}
