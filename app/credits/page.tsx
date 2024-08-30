"use client";

import { MouseEvent } from "react";
import config from "../config";

export default function Credits() {
  const backHandler = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.history.back();
  };

  return (
    <main className="my-8 mx-4 prose">
      <h1>About</h1>
      <p><a href="/" onClick={backHandler}>Back to the map</a></p>
      <p>An interactive map for {config.eventName}</p>
      <p>Based on the <a href="https://github.com/aJanuary/concarte/">ConCarte</a> project.</p>

    </main>
  );
}