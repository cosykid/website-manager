/** Next.js calls this once, when a server starts. */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { prerenderAllPages } = await import("@/cache/prerender");

  // Not awaited: the server answers nothing until this function has returned,
  // and pre-rendering needs its answers.
  prerenderAllPages().catch((error: unknown) => {
    console.warn("Could not pre-render the public pages:", error);
  });
}
