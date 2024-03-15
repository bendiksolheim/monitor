export function Header(props: {
  title: string;
  operational: boolean;
}): JSX.Element {
  const operationalClass = [
    "header__status",
    props.operational ? "header__status--ok" : "header__status--error",
  ].join(" ");
  return (
    <div className="header">
      <div className="header__title">{props.title}</div>
      <div className={operationalClass}></div>
    </div>
  );
}
