import React, { useEffect } from 'react';
import { Folder } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

import FolderPicker from '@/components/FolderPicker/FolderPicker';
import { useFolderOperations } from '@/hooks/useFolderOperations';

import FolderTree from './FolderTree';
import SettingsCard from './SettingsCard';

// Component for managing folder operations in settings
const FolderManagementCard: React.FC = () => {
  const queryClient = useQueryClient();
  const { folders, setAITagging, deleteFolders, actionsPending } =
    useFolderOperations();

  // Force data refresh when window regains focus or visibility
  useEffect(() => {
    const handleFocus = () => {
      // Invalidating targeted queries forces the folder hooks to fetch fresh
      // data instantly without invalidating the entire app cache
      queryClient.invalidateQueries({ queryKey: ['models', 'status'] });
      queryClient.invalidateQueries({ queryKey: ['folders'] });
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        handleFocus();
      }
    };
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [queryClient]);

  return (
    <SettingsCard
      icon={Folder}
      title="Folder Management"
      description="Configure your photo library folders and AI settings"
    >
      {folders.length > 0 ? (
        <FolderTree
          folders={folders}
          onDelete={deleteFolders}
          onSetAITagging={setAITagging}
          actionsPending={actionsPending}
        />
      ) : (
        <div className="py-8 text-center">
          <Folder className="mx-auto mb-3 h-12 w-12 text-gray-400" />
          <h3 className="text-foreground mb-1 text-lg font-medium">
            No folders configured
          </h3>
          <p className="text-muted-foreground text-sm">
            Add your first photo library folder to get started
          </p>
        </div>
      )}

      <div className="border-border mt-6 border-t pt-6">
        <FolderPicker />
      </div>
    </SettingsCard>
  );
};

export default FolderManagementCard;
