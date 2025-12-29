import { NoteEditor, NoteList } from "@/components/notes";

export function NoteView() {
  return (
    <div className="flex h-full">
      <NoteList />
      <span className="w-full">
        <NoteEditor />
      </span>
    </div>
  );
}
