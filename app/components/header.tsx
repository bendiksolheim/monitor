export function Header(props: {
  title: string;
  operational: boolean;
}): JSX.Element {
  return (
    <div className="header">
      <div className="header__title">{props.title}</div>
      <div className="header__stautus">{props.operational}</div>
    </div>
  );
}
