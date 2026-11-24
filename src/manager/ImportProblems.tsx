import { Icon } from "./Icon";

/** A file that was not imported, and why. */
export type RefusedFile = { fileName: string; problems: string[] };

/** Says that a file was refused, then gives each reason on a line of its own. */
export function ImportProblems({ refused }: { refused: RefusedFile }) {
  return (
    <div className="import-problems" role="alert">
      <p className="error">
        <Icon name="problem" />
        {refused.fileName} was not imported.
      </p>
      <ul>
        {refused.problems.map((problem, index) => (
          <li key={index}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}
