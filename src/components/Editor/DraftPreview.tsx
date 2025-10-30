import React from 'react';
import NewsletterEditor from './NewsletterEditor';

interface DraftContent {
  header: {
    title: string;
    subtitle: string;
    date: string;
  };
  sections: Array<{
    id: string;
    type: 'hero' | 'article' | 'events';
    title: string;
    content: string;
    imageUrl?: string;
  }>;
}

interface Draft {
  id: string;
  title: string;
  content: DraftContent;
  status: string;
  created_at: string;
  updated_at: string;
}

interface DraftPreviewProps {
  draft: Draft;
  previewMode: 'desktop' | 'mobile';
  brandConfig?: any;
  onUpdate: (draft: Draft) => void;
  onSave: () => void;
  saving?: boolean;
  hasUnsavedChanges?: boolean;
}

export const DraftPreview: React.FC<DraftPreviewProps> = ({ 
  draft, 
  previewMode, 
  brandConfig, 
  onUpdate, 
  onSave, 
  saving = false,
  hasUnsavedChanges = false 
}) => {
  // Ensure content has proper structure
  const newsletterContent = {
    header: {
      title: draft.content?.header?.title || draft.title || 'Untitled Newsletter',
      subtitle: draft.content?.header?.subtitle || 'Newsletter content',
      date: draft.content?.header?.date || new Date().toISOString().split('T')[0],
      logoUrl: draft.content?.header?.logoUrl || brandConfig?.logo_url || '',
    },
    sections: draft.content?.sections || [],
    footer: {
      text: brandConfig?.footer_text || 'Thank you for reading!',
      links: [
        { text: 'Unsubscribe', url: '#' },
        { text: 'Privacy Policy', url: '#' },
        { text: 'Contact Us', url: '#' },
      ],
    },
  };

  const handleContentChange = (newContent: any) => {
    onUpdate({
      ...draft,
      title: newContent.header.title,
      content: newContent,
    });
  };

  return (
    <NewsletterEditor
      content={newsletterContent}
      onChange={handleContentChange}
      onSave={onSave}
      brandConfig={brandConfig}
      saving={saving}
      previewMode={previewMode}
      hasUnsavedChanges={hasUnsavedChanges}
    />
  );
};