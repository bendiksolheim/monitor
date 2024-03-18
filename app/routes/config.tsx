import { json, useLoaderData } from "@remix-run/react";
import { getConfig } from "config";

export const loader = async () => {
  const config = getConfig();
  return json({ config });
};

export default function Config(): JSX.Element {
  const { config } = useLoaderData<typeof loader>();

  return <div></div>;
}
