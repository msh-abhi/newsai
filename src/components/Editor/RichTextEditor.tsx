import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { TextAlign } from '@tiptap/extension-text-align';
import { FontFamily } from '@tiptap/extension-font-family';
import { Underline } from '@tiptap/extension-underline';
import { Link } from '@tiptap/extension-link';
import { Image } from '@tiptap/extension-image';
import { History } from '@tiptap/extension-history';
import LinkModal from './LinkModal';
import ImageUploader from './ImageUploader';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Link as LinkIcon,
  Image as ImageIcon,
  Undo,
  Redo,
  Type,
  Palette,
} from 'lucide-react';

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  className?: string;
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  content,
  onChange,
  placeholder = 'Start writing...',
  className = '',
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [showImageUploader, setShowImageUploader] = useState(false);
  const [linkData, setLinkData] = useState({ url: '', text: '' });
  const colorPickerRef = useRef<HTMLDivElement>(null);

  // Close color picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };

    if (showColorPicker) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showColorPicker]);

  const editor = useEditor({
    extensions: [
      // Consolidate extensions within StarterKit
      StarterKit.configure({
        extensions: [
          History.configure({ depth: 100 }),
          Link.configure({
            openOnClick: false,
            HTMLAttributes: {
              class: 'text-blue-600 hover:text-blue-800 underline cursor-pointer',
              target: '_blank',
              rel: 'noopener noreferrer',
            },
          }),
          Underline,
        ],
      }),
      // Other extensions that are not part of StarterKit
      TextStyle,
      Color,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      FontFamily,
      Image.configure({
        HTMLAttributes: {
          class: 'max-w-full h-auto rounded-lg shadow-sm',
        },
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert focus:outline-none p-4',
      },
    },
  });

  const addImage = useCallback(() => {
    setShowImageUploader(true);
  }, []);

  const setLink = useCallback(() => {
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

  const handleImageSelect = useCallback((url: string) => {
    if (!editor || !url) return;
    
    editor.chain().focus().setImage({ src: url }).run();
  }, [editor]);

  const fontFamilies = [
    { label: 'Default', value: '' },
    { label: 'Inter', value: 'Inter' },
    { label: 'Arial', value: 'Arial' },
    { label: 'Helvetica', value: 'Helvetica' },
    { label: 'Times New Roman', value: 'Times New Roman' },
    { label: 'Georgia', value: 'Georgia' },
    { label: 'Verdana', value: 'Verdana' },
  ];

  const textColors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  ];

  if (!editor) {
    return null;
  }

  return (
    <>
      <div className={`border border-gray-300 dark:border-gray-600 rounded-lg ${className}`}>
      {/* Toolbar */}
      <div className="border-b border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
        <div className="flex flex-wrap items-center gap-2">
          {/* Text Formatting */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('bold') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Bold"
            >
              <Bold size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('italic') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Italic"
            >
              <Italic size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('underline') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Underline"
            >
              <UnderlineIcon size={16} />
            </button>
          </div>

          {/* Font Family */}
          <div className="border-r border-gray-300 dark:border-gray-600 pr-2">
            <select
              value={editor.getAttributes('textStyle').fontFamily || ''}
              onChange={(e) => {
                if (e.target.value) {
                  editor.chain().focus().setFontFamily(e.target.value).run();
                } else {
                  editor.chain().focus().unsetFontFamily().run();
                }
              }}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-white"
            >
              {fontFamilies.map((font) => (
                <option key={font.value} value={font.value}>
                  {font.label}
                </option>
              ))}
            </select>
          </div>

          {/* Text Color */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2" ref={colorPickerRef}>
            <div className="relative">
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center"
                title="Text Color"
              >
                <Palette size={16} />
              </button>
              <div className={`absolute top-full left-0 mt-1 p-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transition-all z-10 ${
                showColorPicker ? 'opacity-100 visible' : 'opacity-0 invisible'
              }`}>
                <div className="grid grid-cols-5 gap-1">
                  {textColors.map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        editor.chain().focus().setColor(color).run();
                        setShowColorPicker(false);
                      }}
                      className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Lists */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Bullet List"
            >
              <List size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered size={16} />
            </button>
          </div>

          {/* Text Alignment */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Align Left"
            >
              <AlignLeft size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Align Center"
            >
              <AlignCenter size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Align Right"
            >
              <AlignRight size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Justify"
            >
              <AlignJustify size={16} />
            </button>
          </div>

          {/* Insert Options */}
          <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-2">
            <button
              onClick={() => setLink()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                editor.isActive('link') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : ''
              }`}
              title="Insert Link"
            >
              <LinkIcon size={16} />
            </button>
            <button
              onClick={addImage}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Insert Image"
            >
              <ImageIcon size={16} />
            </button>
          </div>

          {/* History */}
          <div className="flex items-center space-x-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().undo()}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo size={16} />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().redo()}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Editor Content */}
      <div className="min-h-[200px] max-h-[600px] overflow-y-auto">
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none dark:prose-invert p-4 focus-within:outline-none"
        />
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

export default RichTextEditor;