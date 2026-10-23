import React from 'react';
import { QuillWordEditor } from './QuillWordEditor';

export interface RichTextWordEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  maxLength?: number;
  minHeight?: string;
  title?: string;
}

export const RichTextWordEditor: React.FC<RichTextWordEditorProps> = ({
  value,
  onChange,
  placeholder = 'Type your message here...',
  minHeight = '180px',
  title = 'Word Document Editor'
}) => {
  return (
    <QuillWordEditor
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      minHeight={minHeight}
      title={title}
    />
  );
};
