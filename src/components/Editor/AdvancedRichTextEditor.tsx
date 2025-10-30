import React, { useCallback, useState } from 'react';
import { useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import TextAlign from '@tiptap/extension-text-align';
import FontFamily from '@tiptap/extension-font-family';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import History from '@tiptap/extension-history';
import EditorToolbar from './EditorToolbar';
import LinkModal from './LinkModal';
import ImageUploader from './ImageUploader';

interface AdvancedRichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
  minHeight?: string;
}

const AdvancedRichTextEditor: React.FC<AdvancedRichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
  minHeight = '200px',
}) => {
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '' });

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        history: false,
      }),
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      Underline,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
      History.configure({
        depth: 100,
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: `prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert focus:outline-none p-4`,
        style: `min-height: ${minHeight}`,
      },
      handleKeyDown: (view, event) => {
        // Handle keyboard shortcuts
        if (event.ctrlKey || event.metaKey) {
          switch (event.key) {
            case 'k':
              event.preventDefault();
              handleAddLink();
              return true;
            case 'b':
              event.preventDefault();
              editor?.chain().focus().toggleBold().run();
              return true;
            case 'i':
              event.preventDefault();
              editor?.chain().focus().toggleItalic().run();
              return true;
            case 'u':
              event.preventDefault();
              editor?.chain().focus().toggleUnderline().run();
              return true;
          }
        }
        return false;
      },
      handlePaste: (view, event, slice) => {
        // Handle paste events for better content integration
        const items = Array.from(event.clipboardData?.items || []);
        
        for (const item of items) {
          if (item.type.indexOf('image') === 0) {
            event.preventDefault();
            const file = item.getAsFile();
            if (file) {
              handleImagePaste(file);
            }
            return true;
          }
        }
        
        return false;
      },
    },
  });

  const handleAddLink = useCallback(() => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to);
    const currentLink = editor.getAttributes('link');

    setLinkData({
      url: currentLink.href || '',
      text: selectedText || '',
    });
    setShowLinkModal(true);
  }, [editor]);

  const handleSaveLink = useCallback((url: string, text?: string) => {
    if (!editor) return;

    if (!url) {
      // Remove link
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    if (text && !editor.state.selection.empty) {
      // Replace selected text and add link
      editor.chain().focus().insertContent(text).setLink({ href: url }).run();
    } else {
      // Just add link to selection
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const handleAddImage = useCallback(() => {
    setShowImageUploader(true);
  }, []);

  const handleImageSelect = useCallback((url: string) => {
    if (!editor || !url) return;
    
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const handleImagePaste = useCallback(async (file: File) => {
    if (!editor) return;

    try {
      // Convert to base64 for demo purposes
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          editor.chain().focus().setImage({ src: result }).run();
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Error handling pasted image:', error);
    }
  }, [editor]);

  if (!editor) {
    return (
      <div className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
        <div className="p-4 text-center text-gray-500 dark:text-gray-400">
          Loading editor...
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
        <EditorToolbar
          editor={editor}
          onAddImage={handleAddImage}
          onAddLink={handleAddLink}
        />
        
        <div className="relative">
          <EditorContent
            editor={editor}
            className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert"
          />
          
          {/* Character count */}
          <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded shadow">
            {editor.storage.characterCount?.characters() || 0} characters
          </div>
        </div>
      </div>

      {/* Link Modal */}
      <LinkModal
        isOpen={showLinkModal}
        onClose={() => setShowLinkModal(false)}
        onSave={handleSaveLink}
        initialUrl={linkData.url}
        initialText={linkData.text}
      />

      {/* Image Uploader */}
      {showImageUploader && (
        <ImageUploader
          onImageSelect={(url) => {
            handleImageSelect(url);
            setShowImageUploader(false);
          }}
          onClose={() => setShowImageUploader(false)}
        />
      )}
    </>
  );
};

export default AdvancedRichTextEditor;