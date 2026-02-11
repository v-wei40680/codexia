import type { UserInput } from '@/bindings/v2';
import { convertFileSrc } from '@tauri-apps/api/core';
import { Markdown } from '@/components/Markdown';

type UserMessageItemProps = {
  content: Array<UserInput>;
};

export const UserMessageItem = ({ content }: UserMessageItemProps) => {
  const images = content.filter((m) => m.type === 'image').map((m) => m.url);
  const localImages = content
    .filter((m) => m.type === 'localImage')
    .map((m) => convertFileSrc(m.path));
  const text = content
    .filter((m) => m.type === 'text')
    .map((m) => m.text)
    .join('');

  return (
    <div className="flex gap-2 justify-end">
      <div className="flex flex-col gap-2 border rounded-md p-2 bg-gray-100 dark:bg-gray-700">
        {(images.length > 0 || localImages.length > 0) && (
          <div className="flex flex-wrap gap-2">
            {images.map((src, index) => (
              <img
                key={`remote-${index}`}
                src={src}
                alt={`Uploaded ${index + 1}`}
                className="max-w-full max-h-48 rounded object-contain"
              />
            ))}
            {localImages.map((src, index) => (
              <img
                key={`local-${index}`}
                src={src}
                alt={`Uploaded ${index + 1}`}
                className="max-w-full max-h-48 rounded object-contain"
              />
            ))}
          </div>
        )}
        {text.length > 0 && <Markdown value={text} />}
      </div>
    </div>
  );
};
