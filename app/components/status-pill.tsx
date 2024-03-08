export function StatusPill(props: {
  title: string;
  operational: boolean;
}): JSX.Element {
  return (
    <div className="pill">
      <div
        className={`pill__status pill__status--${
          props.operational ? "ok" : "error"
        }`}
      ></div>
      <div>{props.title}</div>
    </div>
  );
}
