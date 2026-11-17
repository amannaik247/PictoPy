import React, { useEffect, useMemo, useState } from 'react';
import { ChevronRight, Folder as FolderIcon } from 'lucide-react';

import { ConfirmDialog } from '@/components/Dialog/ConfirmDialog';
import { cn } from '@/lib/utils';
import { FolderDetails } from '@/types/Folder';
import { buildFolderTree, flattenFolderTree } from '@/utils/folderTree';

interface FolderTreeProps {
  folders: FolderDetails[];
  onDelete: (folderIds: string[]) => void;
  onSetAITagging: (folderIds: string[], enabled: boolean) => void;
  actionsPending: boolean;
}

interface RowClickEvent {
  shiftKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  folderIds: string[];
}

const folderName = (path: string) => {
  const segments = path.split(/[\\/]/).filter(Boolean);
  return segments[segments.length - 1] ?? path;
};

const FolderTree: React.FC<FolderTreeProps> = ({
  folders,
  onDelete,
  onSetAITagging,
  actionsPending,
}) => {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [anchor, setAnchor] = useState<string | null>(null);
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);

  const tree = useMemo(() => buildFolderTree(folders), [folders]);
  const rows = useMemo(
    () => flattenFolderTree(tree, collapsed),
    [tree, collapsed],
  );

  useEffect(() => {
    const knownIds = new Set(folders.map((folder) => folder.folder_id));
    setSelected((previous) => {
      if ([...previous].every((id) => knownIds.has(id))) {
        return previous;
      }
      return new Set([...previous].filter((id) => knownIds.has(id)));
    });
  }, [folders]);

  useEffect(() => {
    if (!menu) {
      return;
    }
    const close = () => setMenu(null);
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('scroll', close, true);
    };
  }, [menu]);

  const toggleCollapsed = (folderId: string) => {
    setCollapsed((previous) => {
      const next = new Set(previous);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const rangeSelection = (fromId: string, toId: string) => {
    const from = rows.findIndex((row) => row.node.folder.folder_id === fromId);
    const to = rows.findIndex((row) => row.node.folder.folder_id === toId);
    if (from === -1 || to === -1) {
      return null;
    }
    const [start, end] = from < to ? [from, to] : [to, from];
    return new Set(
      rows.slice(start, end + 1).map((row) => row.node.folder.folder_id),
    );
  };

  const handleRowClick = (
    event: RowClickEvent,
    folder: FolderDetails,
  ): void => {
    if (event.shiftKey && anchor) {
      const range = rangeSelection(anchor, folder.folder_id);
      if (range) {
        setSelected(range);
        return;
      }
    }

    if (event.ctrlKey || event.metaKey) {
      setSelected((previous) => {
        const next = new Set(previous);
        if (next.has(folder.folder_id)) {
          next.delete(folder.folder_id);
        } else {
          next.add(folder.folder_id);
        }
        return next;
      });
      setAnchor(folder.folder_id);
      return;
    }

    setSelected(new Set([folder.folder_id]));
    setAnchor(folder.folder_id);
  };

  const handleContextMenu = (
    event: React.MouseEvent,
    folder: FolderDetails,
  ) => {
    event.preventDefault();
    const folderIds = selected.has(folder.folder_id)
      ? [...selected]
      : [folder.folder_id];
    if (!selected.has(folder.folder_id)) {
      setSelected(new Set(folderIds));
      setAnchor(folder.folder_id);
    }
    setMenu({ x: event.clientX, y: event.clientY, folderIds });
  };

  const requestDelete = (folderIds: string[]) => {
    setMenu(null);
    if (folderIds.length > 1) {
      setPendingDelete(folderIds);
      return;
    }
    setSelected(new Set());
    onDelete(folderIds);
  };

  const applyTagging = (enabled: boolean) => {
    if (!menu) {
      return;
    }
    onSetAITagging(menu.folderIds, enabled);
    setMenu(null);
  };

  const menuItemClass =
    'flex h-8 w-full items-center rounded-sm px-2 text-left text-sm hover:bg-accent hover:text-accent-foreground disabled:pointer-events-none disabled:opacity-50';

  return (
    <>
      <div
        role="tree"
        aria-label="Folders"
        className="max-h-80 overflow-y-auto rounded-lg border p-1"
        onClick={() => setSelected(new Set())}
      >
        {rows.map(({ node, depth }) => {
          const { folder } = node;
          const isSelected = selected.has(folder.folder_id);
          const isCollapsed = collapsed.has(folder.folder_id);
          const hasChildren = node.children.length > 0;

          return (
            <div
              key={folder.folder_id}
              role="treeitem"
              aria-level={depth + 1}
              aria-selected={isSelected}
              tabIndex={0}
              title={folder.folder_path}
              style={{ paddingLeft: 4 + depth * 14 }}
              onClick={(event) => {
                event.stopPropagation();
                handleRowClick(event, folder);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  handleRowClick(event, folder);
                }
              }}
              onContextMenu={(event) => handleContextMenu(event, folder)}
              className={cn(
                'focus-visible:ring-ring flex h-7 cursor-pointer items-center gap-1 rounded-sm border border-transparent pr-2 text-sm select-none focus-visible:ring-2 focus-visible:outline-none',
                !isSelected && 'hover:bg-muted',
                isSelected && 'border-ring',
              )}
            >
              {hasChildren ? (
                <button
                  type="button"
                  aria-expanded={!isCollapsed}
                  aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                  onClick={(event) => {
                    event.stopPropagation();
                    toggleCollapsed(folder.folder_id);
                  }}
                  className="hover:bg-accent flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-sm"
                >
                  <ChevronRight
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      !isCollapsed && 'rotate-90',
                    )}
                  />
                </button>
              ) : (
                <span className="h-4 w-4 shrink-0" />
              )}
              <FolderIcon className="h-4 w-4 shrink-0" />
              <span className="truncate">{folderName(folder.folder_path)}</span>
            </div>
          );
        })}
      </div>

      {menu && (
        <div
          role="menu"
          style={{ top: menu.y, left: menu.x }}
          onPointerDown={(event) => event.stopPropagation()}
          className="bg-popover text-popover-foreground fixed z-50 min-w-44 rounded-md border p-1 shadow-md"
        >
          <button
            type="button"
            role="menuitem"
            disabled={actionsPending}
            onClick={() => applyTagging(true)}
            className={menuItemClass}
          >
            Enable AI tagging
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={actionsPending}
            onClick={() => applyTagging(false)}
            className={menuItemClass}
          >
            Disable AI tagging
          </button>
          <div className="bg-border -mx-1 my-1 h-px" />
          <button
            type="button"
            role="menuitem"
            disabled={actionsPending}
            onClick={() => requestDelete(menu.folderIds)}
            className={cn(menuItemClass, 'text-destructive')}
          >
            Delete
          </button>
        </div>
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
        title="Delete folders?"
        description={`${pendingDelete?.length ?? 0} folders will be removed from your library, along with their registered subfolders.`}
        confirmLabel="Delete"
        onConfirm={() => {
          if (pendingDelete) {
            setSelected(new Set());
            onDelete(pendingDelete);
          }
        }}
      />
    </>
  );
};

export default FolderTree;
