import React from 'react';
import { FileExplorer, LocalFileItem, FileExplorerProps } from './FileExplorer';

export type LocalPhpFileItem = LocalFileItem;

export const AdminLocalPhpFilesViewer: React.FC<FileExplorerProps> = (props) => {
  return <FileExplorer {...props} />;
};

export default AdminLocalPhpFilesViewer;
