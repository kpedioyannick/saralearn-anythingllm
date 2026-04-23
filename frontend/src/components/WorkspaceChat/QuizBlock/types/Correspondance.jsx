// Correspondance : même logique qu'Association mais avec un titre
import React from "react";
import Association from "./Association";

export default function Correspondance({ title, pairs, onAnswer, answered }) {
  return (
    <div className="mb-5">
      {title && <p className="font-semibold mb-2 text-gray-800 dark:text-gray-100">{title}</p>}
      <Association pairs={pairs} onAnswer={onAnswer} answered={answered} />
    </div>
  );
}
