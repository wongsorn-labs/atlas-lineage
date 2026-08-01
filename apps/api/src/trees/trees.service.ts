import { Injectable, NotFoundException } from '@nestjs/common';
import {
  findTreesByUser, findTreeById, createTree, updateTree, addTreeMember, findMemberRole,
} from '@wongsorn-labs/atlas-lineage-db';
import type { CreateTreeInput, UpdateTreeInput, AddTreeMemberInput } from '@wongsorn-labs/atlas-lineage-shared';

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
}
