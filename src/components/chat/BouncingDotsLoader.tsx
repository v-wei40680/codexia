const BouncingDotsLoader = () => {
  return (
    <div>
      <div className="w-full min-w-0">
        <div className="rounded-lg border px-3 py-2 bg-white border-gray-200 dark:bg-slate-900 dark:border-slate-800">
          <div className="flex space-x-1">
            <div className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500" />
            <div
              className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
              style={{ animationDelay: '0.1s' }}
            />
            <div
              className="w-2 h-2 rounded-full bg-gray-400 animate-bounce dark:bg-slate-500"
              style={{ animationDelay: '0.2s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BouncingDotsLoader;
