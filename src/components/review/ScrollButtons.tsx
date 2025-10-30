import { ArrowDown, ArrowUp } from "lucide-react";

interface ScrollButtonsProps {
  onScrollToTop: () => void;
  onScrollToBottom: () => void;
  hasMessages: boolean;
}

const ScrollButtons = (props: ScrollButtonsProps) => {
  return (
    props.hasMessages && (
      <div className="fixed right-3 bottom-3 flex flex-col gap-2 z-50">
        <button
          type="button"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/40 bg-slate-900/60 text-slate-200 transition ${
            {
              true: "hover:bg-slate-900/80",
            }[String(props.hasMessages)]
          }`}
          title="Scroll to top"
          onClick={props.onScrollToTop}
          disabled={!props.hasMessages}
          aria-hidden={!props.hasMessages}
        >
          <ArrowUp />
        </button>
        <button
          type="button"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700/40 bg-slate-900/60 text-slate-200 transition ${
            {
              true: "hover:bg-slate-900/80",
            }[String(props.hasMessages)]
          }`}
          title="Scroll to bottom"
          onClick={props.onScrollToBottom}
          disabled={!props.hasMessages}
          aria-hidden={!props.hasMessages}
        >
          <ArrowDown />
        </button>
      </div>
    )
  );
};

export default ScrollButtons;
