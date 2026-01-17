'use client';

export default function OpenLudoKingButton() {
  const openLudoKing = () => {
    // Android intent to open Ludo King app
    window.location.href =
      'intent://#Intent;package=com.ludo.king;end';
  };

  return (
    <button
      onClick={openLudoKing}
      className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-teal-400 to-blue-600"
    >
      Open Ludo King App
    </button>
  );
}
