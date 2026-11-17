import { fireEvent, render, screen, waitFor, within } from '@/test-utils';

import { FolderDetails } from '@/types/Folder';
import FolderTree from '../FolderTree';

const folder = (folder_id: string, folder_path: string): FolderDetails => ({
  folder_id,
  folder_path,
  last_modified_time: 0,
  AI_Tagging: false,
});

const folders = [
  folder('photos', 'C:\\Photos'),
  folder('2024', 'C:\\Photos\\2024'),
  folder('archive', 'C:\\Photos\\Archive'),
];

const renderTree = (
  props: Partial<React.ComponentProps<typeof FolderTree>> = {},
) => {
  const onDelete = jest.fn();
  const onSetAITagging = jest.fn();
  render(
    <FolderTree
      folders={folders}
      onDelete={onDelete}
      onSetAITagging={onSetAITagging}
      actionsPending={false}
      {...props}
    />,
  );
  return { onDelete, onSetAITagging };
};

const rowFor = (name: string) =>
  screen.getByText(name).closest('[role="treeitem"]') as HTMLElement;

describe('FolderTree', () => {
  it('shows folder names with the full path as the hover title', () => {
    renderTree();

    expect(rowFor('Photos')).toHaveAttribute('title', 'C:\\Photos');
    expect(rowFor('2024')).toHaveAttribute('title', 'C:\\Photos\\2024');
    expect(rowFor('Archive')).toHaveAttribute('title', 'C:\\Photos\\Archive');
    expect(rowFor('Photos')).toHaveAttribute('aria-level', '1');
    expect(rowFor('2024')).toHaveAttribute('aria-level', '2');
  });

  it('indents folders nested more than one level deep', () => {
    renderTree({
      folders: [
        folder('photos', 'C:\\Photos'),
        folder('2024', 'C:\\Photos\\2024'),
        folder('trip', 'C:\\Photos\\2024\\Trip'),
      ],
    });

    expect(rowFor('Trip')).toHaveAttribute('aria-level', '3');
    expect(rowFor('Trip')).toHaveStyle({ paddingLeft: '32px' });
  });

  it('collapses and expands a folder without changing the selection', () => {
    renderTree();
    const parentRow = rowFor('Photos');

    fireEvent.click(
      within(parentRow).getByRole('button', { name: 'Collapse' }),
    );

    expect(screen.queryByText('2024')).not.toBeInTheDocument();
    expect(parentRow).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(within(parentRow).getByRole('button', { name: 'Expand' }));

    expect(screen.getByText('2024')).toBeInTheDocument();
  });

  it('replaces, extends, and toggles the selection', () => {
    renderTree();

    fireEvent.click(rowFor('2024'));
    expect(rowFor('2024')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(rowFor('Archive'), { ctrlKey: true });
    expect(rowFor('2024')).toHaveAttribute('aria-selected', 'true');
    expect(rowFor('Archive')).toHaveAttribute('aria-selected', 'true');

    fireEvent.click(rowFor('Archive'), { ctrlKey: true });
    expect(rowFor('Archive')).toHaveAttribute('aria-selected', 'false');
  });

  it('selects a range with shift click', () => {
    renderTree();

    fireEvent.click(rowFor('2024'));
    fireEvent.click(rowFor('Archive'), { shiftKey: true });

    expect(rowFor('2024')).toHaveAttribute('aria-selected', 'true');
    expect(rowFor('Archive')).toHaveAttribute('aria-selected', 'true');
  });

  it('deletes a single folder from the context menu without a dialog', () => {
    const { onDelete } = renderTree();

    fireEvent.contextMenu(rowFor('2024'), {
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(onDelete).toHaveBeenCalledWith(['2024']);
    expect(screen.queryByText('Delete folders?')).not.toBeInTheDocument();
  });

  it('confirms before deleting a multi-folder selection', async () => {
    const { onDelete } = renderTree();

    fireEvent.click(rowFor('2024'));
    fireEvent.click(rowFor('Archive'), { shiftKey: true });
    fireEvent.contextMenu(rowFor('Archive'), {
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));

    expect(screen.getByText('Delete folders?')).toBeInTheDocument();
    expect(onDelete).not.toHaveBeenCalled();

    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Delete' }));

    await waitFor(() =>
      expect(onDelete).toHaveBeenCalledWith(
        expect.arrayContaining(['2024', 'archive']),
      ),
    );
    expect(onDelete.mock.calls[0][0]).toHaveLength(2);
  });

  it('applies AI tagging to the selected folders', () => {
    const { onSetAITagging } = renderTree();

    fireEvent.click(rowFor('2024'));
    fireEvent.contextMenu(rowFor('2024'), {
      clientX: 10,
      clientY: 10,
    });
    fireEvent.click(
      screen.getByRole('menuitem', { name: 'Enable AI tagging' }),
    );

    expect(onSetAITagging).toHaveBeenCalledWith(['2024'], true);
  });
});
