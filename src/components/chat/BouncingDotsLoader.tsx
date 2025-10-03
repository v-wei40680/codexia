const BouncingDotsLoader = () => {
  return (
    <div>
      <div className="w-full min-w-0">
        <div className="rounded-lg border px-3 py-2 bg-white border-gray-200">
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default BouncingDotsLoader;