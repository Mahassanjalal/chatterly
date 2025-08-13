import React from "react";

const emojis = ["😀","😂","😍","😎","😭","😡","👍","🙏","🎉","❤️","🔥","🥳","😅","😇","🤔","😜"];

export default function EmojiPicker({ onSelect }: { onSelect: (emoji: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2 p-2 bg-white/90 rounded-xl shadow-lg border border-purple-200 animate-pop">
      {emojis.map((emoji) => (
        <button
          key={emoji}
          type="button"
          className="text-2xl hover:scale-125 transition-transform duration-150"
          onClick={() => onSelect(emoji)}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
