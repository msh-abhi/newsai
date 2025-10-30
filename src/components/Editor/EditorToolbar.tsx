import React, { useState, useRef, useEffect } from 'react';
import {
  Bold,
  Italic,
  Underline,
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
  Quote,
  Code,
} from 'lucide-react';

interface EditorToolbarProps {
  editor: any;
  onAddImage: () => void;
  onAddLink: () => void;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({
  editor,
  onAddImage,
  onAddLink,
}) => {
  const [showColorPicker, setShowColorPicker] = useState(false);
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

  if (!editor) {
    return null;
  }

  const fontSizes = [
    { label: 'Small', value: '14px' },
    { label: 'Normal', value: '16px' },
    { label: 'Large', value: '18px' },
    { label: 'Extra Large', value: '24px' },
  ];

  const headingLevels = [
    { label: 'Paragraph', value: 0 },
    { label: 'Heading 1', value: 1 },
    { label: 'Heading 2', value: 2 },
    { label: 'Heading 3', value: 3 },
  ];

  const textColors = [
    '#000000', '#374151', '#6B7280', '#9CA3AF',
    '#EF4444', '#F97316', '#F59E0B', '#EAB308',
    '#84CC16', '#22C55E', '#10B981', '#14B8A6',
    '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899',
  ];

  const backgroundColors = [
    'transparent', '#F3F4F6', '#FEF3C7', '#DBEAFE',
    '#DCFCE7', '#FEE2E2', '#F3E8FF', '#FCE7F3',
  ];

  return (
    <div className="border-b border-gray-300 dark:border-gray-600 p-3 bg-gray-50 dark:bg-gray-700 rounded-t-lg">
      <div className="flex flex-wrap items-center gap-2">
        {/* Text Formatting */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
          <button
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('bold') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('italic') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('underline') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Underline (Ctrl+U)"
          >
            <Underline size={16} />
          </button>
        </div>

        {/* Heading Levels */}
        <div className="border-r border-gray-300 dark:border-gray-600 pr-3">
          <select
            value={
              editor.isActive('heading', { level: 1 }) ? 1 :
              editor.isActive('heading', { level: 2 }) ? 2 :
              editor.isActive('heading', { level: 3 }) ? 3 : 0
            }
            onChange={(e) => {
              const level = parseInt(e.target.value);
              if (level === 0) {
                editor.chain().focus().setParagraph().run();
              } else {
                editor.chain().focus().toggleHeading({ level }).run();
              }
            }}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 dark:text-white"
          >
            {headingLevels.map((heading) => (
              <option key={heading.value} value={heading.value}>
                {heading.label}
              </option>
            ))}
          </select>
        </div>

        {/* Text Color */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3" ref={colorPickerRef}>
          <div className="relative">
            <button
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center text-gray-700 dark:text-gray-300"
              title="Text Color"
            >
              <Palette size={16} />
            </button>
            <div className={`absolute top-full left-0 mt-1 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg transition-all z-20 ${
              showColorPicker ? 'opacity-100 visible' : 'opacity-0 invisible'
            }`}>
              <div className="grid grid-cols-5 gap-1 mb-2">
                <span className="col-span-5 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Text Color</span>
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
              <div className="grid grid-cols-4 gap-1">
                <span className="col-span-4 text-xs font-medium text-gray-600 dark:text-gray-300 mb-1">Background</span>
                {backgroundColors.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      if (color === 'transparent') {
                        editor.chain().focus().unsetHighlight().run();
                      } else {
                        editor.chain().focus().setHighlight({ color }).run();
                      }
                      setShowColorPicker(false);
                    }}
                    className="w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform"
                    style={{ backgroundColor: color === 'transparent' ? '#ffffff' : color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Lists */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
          <button
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('bulletList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Bullet List"
          >
            <List size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('orderedList') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Numbered List"
          >
            <ListOrdered size={16} />
          </button>
        </div>

        {/* Text Alignment */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
          <button
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive({ textAlign: 'left' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Align Left"
          >
            <AlignLeft size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive({ textAlign: 'center' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Align Center"
          >
            <AlignCenter size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive({ textAlign: 'right' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Align Right"
          >
            <AlignRight size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive({ textAlign: 'justify' }) ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Justify"
          >
            <AlignJustify size={16} />
          </button>
        </div>

        {/* Insert Options */}
        <div className="flex items-center space-x-1 border-r border-gray-300 dark:border-gray-600 pr-3">
          <button
            onClick={onAddLink}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('link') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Insert Link (Ctrl+K)"
          >
            <LinkIcon size={16} />
          </button>
          <button
            onClick={onAddImage}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 transition-colors"
            title="Insert Image"
          >
            <ImageIcon size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleBlockquote().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('blockquote') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Quote"
          >
            <Quote size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().toggleCode().run()}
            className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ${
              editor.isActive('code') ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'
            }`}
            title="Inline Code"
          >
            <Code size={16} />
          </button>
        </div>

        {/* History */}
        <div className="flex items-center space-x-1">
          <button
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo size={16} />
          </button>
          <button
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 dark:text-gray-300 transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditorToolbar;