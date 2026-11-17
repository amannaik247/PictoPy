import { FolderDetails } from '@/types/Folder';
import {
  buildFolderTree,
  flattenFolderTree,
  FolderTreeNode,
} from '@/utils/folderTree';

const folder = (folder_id: string, folder_path: string): FolderDetails => ({
  folder_id,
  folder_path,
  last_modified_time: 0,
  AI_Tagging: false,
});

const pathsInTree = (nodes: FolderTreeNode[]): string[] =>
  nodes.flatMap((node) => [
    node.folder.folder_path,
    ...pathsInTree(node.children),
  ]);

describe('buildFolderTree', () => {
  it('nests folders under their registered parent and sorts siblings', () => {
    const tree = buildFolderTree([
      folder('photos', 'C:\\Photos'),
      folder('2024', 'C:\\Photos\\2024'),
      folder('archive', 'C:\\Photos\\Archive'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].folder.folder_id).toBe('photos');
    expect(pathsInTree(tree)).toEqual([
      'C:\\Photos',
      'C:\\Photos\\2024',
      'C:\\Photos\\Archive',
    ]);
  });

  it('skips unregistered levels between two registered folders', () => {
    const tree = buildFolderTree([
      folder('photos', 'C:\\Photos'),
      folder('trip', 'C:\\Photos\\2024\\Trip'),
    ]);

    expect(tree).toHaveLength(1);
    expect(tree[0].children).toHaveLength(1);
    expect(tree[0].children[0].folder.folder_id).toBe('trip');
  });

  it('keeps folders from unrelated locations as separate roots', () => {
    const tree = buildFolderTree([
      folder('photos', 'C:\\Photos'),
      folder('media', 'D:\\Media'),
    ]);

    expect(pathsInTree(tree)).toEqual(['C:\\Photos', 'D:\\Media']);
  });

  it('treats folders that differ only by separator or case as one node', () => {
    const tree = buildFolderTree([
      folder('first', 'C:\\Photos'),
      folder('second', 'c:/photos'),
      folder('child', 'C:\\Photos\\2024'),
    ]);

    expect(pathsInTree(tree)).toEqual(['c:/photos', 'C:\\Photos\\2024']);
  });
});

describe('flattenFolderTree', () => {
  const tree = buildFolderTree([
    folder('photos', 'C:\\Photos'),
    folder('2024', 'C:\\Photos\\2024'),
    folder('trip', 'C:\\Photos\\2024\\Trip'),
  ]);

  it('emits every row with its depth when nothing is collapsed', () => {
    const rows = flattenFolderTree(tree, new Set());

    expect(rows.map((row) => [row.node.folder.folder_id, row.depth])).toEqual([
      ['photos', 0],
      ['2024', 1],
      ['trip', 2],
    ]);
  });

  it('hides the children of a collapsed folder', () => {
    const rows = flattenFolderTree(tree, new Set(['2024']));

    expect(rows.map((row) => row.node.folder.folder_id)).toEqual([
      'photos',
      '2024',
    ]);
  });
});
